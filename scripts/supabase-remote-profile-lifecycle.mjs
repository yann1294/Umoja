import { randomUUID } from "node:crypto";
import fs from "node:fs";
const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL,
  key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  secret = env.SUPABASE_SECRET_KEY;
if (!url || !key || !secret) throw new Error("Supabase development credentials are unavailable");
const run = randomUUID(),
  password = `Umoja-${randomUUID()}-A9!`,
  users = [];
const req = (path, options = {}) => fetch(`${url}${path}`, options);
const service = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};
async function create(label, role, membership = false) {
  const email = `profile-${label}-${run}@example.test`;
  const response = await req("/auth/v1/admin/users", {
    method: "POST",
    headers: service,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`create:${label}:${response.status}`);
  const user = await response.json();
  users.push(user.id);
  if (role) {
    const r = await req("/rest/v1/user_roles", {
      method: "POST",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify({ user_id: user.id, role }),
    });
    if (!r.ok) throw new Error(`role:${r.status}`);
  }
  if (membership) {
    const m = await req("/rest/v1/membership_history", {
      method: "POST",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: user.id,
        tier: "core",
        effective_from: new Date().toISOString(),
      }),
    });
    if (!m.ok) throw new Error(`membership:${m.status}`);
  }
  const token = await req("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!token.ok) throw new Error(`token:${token.status}`);
  const access = (await token.json()).access_token;
  return {
    id: user.id,
    headers: { apikey: key, authorization: `Bearer ${access}`, "content-type": "application/json" },
  };
}
const out = { run, checks: {} };
try {
  const owner = await create("owner", null),
    other = await create("other", null),
    admin = await create("admin", "admin", true),
    editor = await create("editor", "cms-editor", true),
    reviewer = await create("reviewer", "reviewer", true),
    revokedAdmin = await create("revoked-admin", "admin", true),
    disabled = await create("disabled", null);
  const revoked = await req(
    `/rest/v1/membership_history?user_id=eq.${revokedAdmin.id}&effective_to=is.null`,
    {
      method: "PATCH",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify({ effective_to: new Date().toISOString() }),
    },
  );
  if (!revoked.ok) throw new Error(`revoke-membership:${revoked.status}`);
  const disabledUpdate = await req(`/auth/v1/admin/users/${disabled.id}`, {
    method: "PUT",
    headers: service,
    body: JSON.stringify({ ban_duration: "1h" }),
  });
  if (!disabledUpdate.ok) throw new Error(`disable:${disabledUpdate.status}`);
  const unverifiedEmail = `profile-unverified-${run}@example.test`;
  const unverifiedCreate = await req("/auth/v1/admin/users", {
    method: "POST",
    headers: service,
    body: JSON.stringify({ email: unverifiedEmail, password, email_confirm: false }),
  });
  if (!unverifiedCreate.ok) throw new Error(`create:unverified:${unverifiedCreate.status}`);
  const unverified = await unverifiedCreate.json();
  users.push(unverified.id);
  const unverifiedToken = await req("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email: unverifiedEmail, password }),
  });
  out.checks = {
    ...out.checks,
    unverifiedSignInDenied: !unverifiedToken.ok,
  };
  const slug = `profile-${run}`;
  const rpc = (name, body, h) =>
    req(`/rest/v1/rpc/${name}`, { method: "POST", headers: h, body: JSON.stringify(body) });
  let saved = await rpc(
    "save_profile_with_audit",
    {
      profile_user_id: owner.id,
      professional_name: "Synthetic Applicant",
      profile_locale: "en",
      profile_country: "KE",
      profile_bio: "Synthetic profile",
      profile_slug: slug,
      profile_visibility: "public",
      requested_state: "submitted",
      consent_given: true,
    },
    owner.headers,
  );
  out.checks.ownerCreate = saved.ok;
  if (!saved.ok) throw new Error(`owner-create:${saved.status}`);
  await saved.arrayBuffer();
  const cross = await rpc(
    "save_profile_with_audit",
    {
      profile_user_id: owner.id,
      professional_name: "Tamper",
      profile_locale: "en",
      profile_country: "KE",
      profile_bio: "x",
      profile_slug: slug,
      profile_visibility: "private",
      requested_state: "private",
      consent_given: false,
    },
    other.headers,
  );
  out.checks.crossOwnerDenied = !cross.ok;
  const skillRows = await (
    await req("/rest/v1/skills?select=id&limit=1", { headers: owner.headers })
  ).json();
  const skillId = skillRows[0]?.id;
  const skillWrite = await req("/rest/v1/profile_skills", {
    method: "POST",
    headers: { ...owner.headers, prefer: "return=representation" },
    body: JSON.stringify({
      profile_id: owner.id,
      skill_id: skillId,
      level: 4,
      verification: "self_reported",
    }),
  });
  out.checks.skillWrite = skillWrite.ok;
  out.statuses = { skill: skillWrite.status, skillIdPresent: Boolean(skillId) };
  const langWrite = await req("/rest/v1/profile_languages", {
    method: "POST",
    headers: { ...owner.headers, prefer: "return=representation" },
    body: JSON.stringify({
      profile_id: owner.id,
      language_code: "sw",
      proficiency: "professional",
      verification: "self_reported",
    }),
  });
  out.checks.languageWrite = langWrite.ok;
  out.statuses.language = langWrite.status;
  const portfolio = await req("/rest/v1/portfolio_items", {
    method: "POST",
    headers: { ...owner.headers, prefer: "return=representation" },
    body: JSON.stringify({
      profile_id: owner.id,
      title: "Synthetic project",
      role_summary: "Synthetic role",
      publication_state: "private",
    }),
  });
  out.checks.portfolioWrite = portfolio.ok;
  const availability = await req("/rest/v1/availability_snapshots", {
    method: "POST",
    headers: { ...owner.headers, prefer: "return=representation" },
    body: JSON.stringify({
      profile_id: owner.id,
      weekly_hours: 20,
      work_mode: "remote",
      confirmed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  out.checks.availabilityWrite = availability.ok;
  const approve = await rpc(
    "moderate_profile",
    {
      profile_user_id: owner.id,
      decision: "approved",
      expected_state: "submitted",
      feedback: "Synthetic approval",
    },
    admin.headers,
  );
  out.checks.adminApprove = approve.ok;
  const selfApprove = await rpc(
    "moderate_profile",
    { profile_user_id: owner.id, decision: "approved", expected_state: "approved", feedback: "x" },
    owner.headers,
  );
  out.checks.selfApprovalDenied = !selfApprove.ok;
  const otherModerate = await rpc(
    "moderate_profile",
    { profile_user_id: owner.id, decision: "revoked", expected_state: "approved", feedback: "x" },
    other.headers,
  );
  out.checks.unauthorizedModerationDenied = !otherModerate.ok;
  const crossChild = await req("/rest/v1/portfolio_items", {
    method: "POST",
    headers: { ...other.headers, prefer: "return=representation" },
    body: JSON.stringify({
      profile_id: owner.id,
      title: "Tamper",
      role_summary: "x",
      publication_state: "private",
    }),
  });
  out.checks.crossOwnerChildDenied = !crossChild.ok;
  const ownerAudit = await req(`/rest/v1/audit_logs?select=id&target_id=eq.${owner.id}`, {
    headers: owner.headers,
  });
  out.checks.ownerAuditHidden = ownerAudit.ok && (await ownerAudit.json()).length === 0;
  const anonPrivate = await req(
    `/rest/v1/profiles?select=public_slug,public_consent_at&user_id=eq.${owner.id}`,
    { headers: { apikey: key } },
  );
  out.checks.anonymousPrivateHidden = anonPrivate.ok && (await anonPrivate.json()).length === 0;
  const availabilityId = (
    await (
      await req(`/rest/v1/availability_snapshots?select=id&profile_id=eq.${owner.id}`, {
        headers: owner.headers,
      })
    ).json()
  )[0]?.id;
  const availabilityTamper = availabilityId
    ? await req(`/rest/v1/availability_snapshots?id=eq.${availabilityId}`, {
        method: "PATCH",
        headers: owner.headers,
        body: JSON.stringify({ weekly_hours: 80 }),
      })
    : new Response(null, { status: 404 });
  out.checks.availabilityImmutable = !availabilityTamper.ok;
  const editorMutation = await rpc(
    "save_profile_with_audit",
    {
      profile_user_id: owner.id,
      professional_name: "Editor tamper",
      profile_locale: "en",
      profile_country: "KE",
      profile_bio: "x",
      profile_slug: slug,
      profile_visibility: "private",
      requested_state: "private",
      consent_given: false,
    },
    editor.headers,
  );
  out.checks.editorOwnerMutationDenied = !editorMutation.ok;
  const reviewerModeration = await rpc(
    "moderate_profile",
    {
      profile_user_id: owner.id,
      decision: "revoked",
      expected_state: "approved",
      feedback: "x",
    },
    reviewer.headers,
  );
  out.checks.reviewerModerationDenied = !reviewerModeration.ok;
  const revokedModeration = await rpc(
    "moderate_profile",
    {
      profile_user_id: owner.id,
      decision: "revoked",
      expected_state: "approved",
      feedback: "x",
    },
    revokedAdmin.headers,
  );
  out.checks.revokedAdminDenied = !revokedModeration.ok;
  const disabledMutation = await rpc(
    "save_profile_with_audit",
    {
      profile_user_id: disabled.id,
      professional_name: "Disabled",
      profile_locale: "en",
      profile_country: "KE",
      profile_bio: "x",
      profile_slug: `disabled-${run}`,
      profile_visibility: "private",
      requested_state: "private",
      consent_given: false,
    },
    disabled.headers,
  );
  out.checks.disabledMutationDenied = !disabledMutation.ok;
  const pub = await (
    await req(
      `/rest/v1/public_profiles?select=public_slug,professional_name&public_slug=eq.${slug}`,
      { headers: { apikey: key } },
    )
  ).json();
  out.checks.anonymousApproved = pub.length === 1;
  const baseResponse = await req(
    `/rest/v1/profiles?select=timezone,public_consent_at&user_id=eq.${owner.id}`,
    { headers: { apikey: key } },
  );
  const base = await baseResponse.json();
  out.checks.anonymousBasePrivateHidden = baseResponse.status === 200 && base.length === 0;
  out.statuses.base = baseResponse.status;
  const withdraw = await rpc(
    "save_profile_with_audit",
    {
      profile_user_id: owner.id,
      professional_name: "Synthetic Applicant",
      profile_locale: "en",
      profile_country: "KE",
      profile_bio: "Synthetic profile",
      profile_slug: slug,
      profile_visibility: "private",
      requested_state: "private",
      consent_given: false,
    },
    owner.headers,
  );
  out.checks.withdraw = withdraw.ok;
  const after = await (
    await req(`/rest/v1/public_profiles?select=public_slug&public_slug=eq.${slug}`, {
      headers: { apikey: key },
    })
  ).json();
  out.checks.anonymousWithdrawn = after.length === 0;
  out.success = Object.values(out.checks).every(Boolean);
  console.log(JSON.stringify(out));
  if (!out.success) process.exitCode = 1;
} finally {
  for (const id of users) {
    const removed = await req(`/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: service,
      body: JSON.stringify({ should_soft_delete: false }),
    });
    if (!removed.ok) {
      console.error(JSON.stringify({ cleanupFailed: id, status: removed.status }));
      process.exitCode = 1;
    }
  }
}
