#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey) {
  throw new Error("Supabase development configuration is unavailable");
}

const serviceHeaders = {
  apikey: secretKey,
  authorization: `Bearer ${secretKey}`,
  "content-type": "application/json",
};
const request = (requestPath, options = {}) => fetch(`${url}${requestPath}`, options);

async function removeUser(id) {
  const response = await request(`/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: serviceHeaders,
    body: JSON.stringify({ should_soft_delete: false }),
  });
  if (!response.ok && response.status !== 404) throw new Error(`zoom_cleanup_${response.status}`);
}

async function findRunUsers(runId) {
  const emails = new Set([
    `profile-zoom-owner-${runId}@example.test`,
    `profile-zoom-admin-${runId}@example.test`,
  ]);
  const ids = [];
  for (let page = 1; ; page += 1) {
    const response = await request(`/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: serviceHeaders,
    });
    if (!response.ok) throw new Error(`zoom_inventory_${response.status}`);
    const payload = await response.json();
    const users = Array.isArray(payload.users) ? payload.users : [];
    for (const user of users) if (emails.has(user.email)) ids.push(user.id);
    if (users.length < 1000) break;
  }
  return ids;
}

function validateRunId(runId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(runId)) {
    throw new Error("zoom_run_id_invalid");
  }
}

if (process.argv[2] === "--cleanup") {
  const cleanupRunId = process.argv[3] ?? "";
  validateRunId(cleanupRunId);
  const ids = await findRunUsers(cleanupRunId);
  for (const id of ids) await removeUser(id);
  console.log(JSON.stringify({ runId: cleanupRunId, exactSyntheticUsersRemoved: ids.length }));
  process.exit(0);
}

const runId = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const createdIds = [];

async function createUser(kind) {
  const email = `profile-zoom-${kind}-${runId}@example.test`;
  const response = await request("/auth/v1/admin/users", {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`zoom_create_${kind}_${response.status}`);
  const user = await response.json();
  createdIds.push(user.id);
  return { id: user.id, email };
}

try {
  const owner = await createUser("owner");
  const admin = await createUser("admin");
  for (const [resourcePath, body] of [
    ["/rest/v1/user_roles", { user_id: admin.id, role: "admin" }],
    [
      "/rest/v1/membership_history",
      { user_id: admin.id, tier: "core", effective_from: new Date().toISOString() },
    ],
  ]) {
    const response = await request(resourcePath, {
      method: "POST",
      headers: { ...serviceHeaders, prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`zoom_admin_seed_${response.status}`);
  }

  const tokenResponse = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email: owner.email, password }),
  });
  if (!tokenResponse.ok) throw new Error(`zoom_auth_${tokenResponse.status}`);
  const tokenPayload = await tokenResponse.json();
  const ownerHeaders = {
    apikey: publishableKey,
    authorization: `Bearer ${tokenPayload.access_token}`,
    "content-type": "application/json",
  };
  const slug = `profile-zoom-${runId}`;
  const profileResponse = await request("/rest/v1/rpc/save_profile_with_audit", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({
      profile_user_id: owner.id,
      professional_name: "A very long synthetic contributor name for genuine browser zoom review",
      profile_locale: "en",
      profile_country: "KE",
      profile_bio:
        "A bilingual synthetic biography with deliberately long content for checking reflow, readable line length, essential actions and page-level overflow at genuine 200% browser zoom.",
      profile_slug: slug,
      profile_visibility: "public",
      requested_state: "submitted",
      consent_given: true,
    }),
  });
  if (!profileResponse.ok) throw new Error(`zoom_profile_${profileResponse.status}`);

  const skillResponse = await request("/rest/v1/skills?select=id&archived_at=is.null&limit=2", {
    headers: ownerHeaders,
  });
  if (!skillResponse.ok) throw new Error(`zoom_skills_${skillResponse.status}`);
  const skills = await skillResponse.json();
  for (const [index, skill] of skills.entries()) {
    const response = await request("/rest/v1/profile_skills", {
      method: "POST",
      headers: { ...ownerHeaders, prefer: "return=minimal" },
      body: JSON.stringify({
        profile_id: owner.id,
        skill_id: skill.id,
        level: 5 - index,
        years_experience: 12 - index * 3,
        verification: "self_reported",
      }),
    });
    if (!response.ok) throw new Error(`zoom_skill_seed_${response.status}`);
  }
  for (const [code, proficiency] of [
    ["en", "fluent"],
    ["fr", "professional"],
  ]) {
    const response = await request("/rest/v1/profile_languages", {
      method: "POST",
      headers: { ...ownerHeaders, prefer: "return=minimal" },
      body: JSON.stringify({
        profile_id: owner.id,
        language_code: code,
        proficiency,
        verification: "self_reported",
      }),
    });
    if (!response.ok) throw new Error(`zoom_language_seed_${response.status}`);
  }
  const portfolioResponse = await request("/rest/v1/portfolio_items", {
    method: "POST",
    headers: { ...ownerHeaders, prefer: "return=minimal" },
    body: JSON.stringify({
      profile_id: owner.id,
      title: "A long synthetic delivery case study title for genuine zoom inspection",
      role_summary:
        "Synthetic evidence describing delivery coordination, accessible implementation and bilingual review without containing private client or contributor information.",
      external_url: "https://example.test/synthetic-zoom-evidence",
      publication_state: "private",
    }),
  });
  if (!portfolioResponse.ok) throw new Error(`zoom_portfolio_seed_${portfolioResponse.status}`);
  const now = new Date();
  const availabilityResponse = await request("/rest/v1/availability_snapshots", {
    method: "POST",
    headers: { ...ownerHeaders, prefer: "return=minimal" },
    body: JSON.stringify({
      profile_id: owner.id,
      weekly_hours: 32,
      work_mode: "remote",
      confirmed_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
    }),
  });
  if (!availabilityResponse.ok) {
    throw new Error(`zoom_availability_seed_${availabilityResponse.status}`);
  }

  const credentialPath = path.join("/private/tmp", `umoja-profile-zoom-${runId}.json`);
  fs.writeFileSync(
    credentialPath,
    `${JSON.stringify(
      {
        runId,
        owner: { email: owner.email, password },
        admin: { email: admin.email, password },
        routes: {
          profile: "http://127.0.0.1:4173/en/workspace/profile",
          moderation: "http://127.0.0.1:4173/en/admin/profiles",
        },
        cleanupCommand: `node scripts/supabase-profile-zoom-fixture.mjs --cleanup ${runId}`,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  fs.chmodSync(credentialPath, 0o600);
  console.log(
    JSON.stringify({
      runId,
      credentialPath,
      credentialFileMode: "0600",
      profileRoute: "http://127.0.0.1:4173/en/workspace/profile",
      moderationRoute: "http://127.0.0.1:4173/en/admin/profiles",
      cleanupCommand: `node scripts/supabase-profile-zoom-fixture.mjs --cleanup ${runId}`,
    }),
  );
} catch (error) {
  for (const id of createdIds) await removeUser(id).catch(() => {});
  throw error;
}
