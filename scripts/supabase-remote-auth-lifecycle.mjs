import { randomUUID } from "node:crypto";
import fs from "node:fs";
const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^("|')|("|')$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL,
  key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  secret = env.SUPABASE_SECRET_KEY;
if (!url || !key || !secret)
  throw new Error("Supabase development credentials are not configured.");
const email = `lifecycle-${randomUUID()}@example.test`,
  password = `Umoja-${randomUUID()}-A9!`;
const adminHeaders = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};
let id;
try {
  const create = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!create.ok) throw new Error(`create:${create.status}`);
  id = (await create.json()).id;
  const rejected = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password: "wrong-password" }),
  });
  const accepted = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!accepted.ok) throw new Error(`sign-in:${accepted.status}`);
  const session = await accepted.json();
  const assignment = await fetch(`${url}/rest/v1/user_roles`, {
    method: "POST",
    headers: { ...adminHeaders, prefer: "return=minimal" },
    body: JSON.stringify({ user_id: id, role: "cms-editor" }),
  });
  const activeMembership = await fetch(`${url}/rest/v1/membership_history`, {
    method: "POST",
    headers: { ...adminHeaders, prefer: "return=minimal" },
    body: JSON.stringify({ user_id: id, tier: "core", effective_from: new Date().toISOString() }),
  });
  const userHeaders = { apikey: key, authorization: `Bearer ${session.access_token}` };
  const refreshedRoles = await fetch(
    `${url}/rest/v1/user_roles?select=role,revoked_at&user_id=eq.${id}&revoked_at=is.null`,
    { headers: userHeaders },
  );
  const refreshedMemberships = await fetch(
    `${url}/rest/v1/membership_history?select=effective_from,effective_to&user_id=eq.${id}&effective_to=is.null`,
    { headers: userHeaders },
  );
  const revoked = await fetch(
    `${url}/rest/v1/user_roles?user_id=eq.${id}&role=eq.cms-editor&revoked_at=is.null`,
    {
      method: "PATCH",
      headers: { ...adminHeaders, prefer: "return=minimal" },
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    },
  );
  const rolesAfterRevocation = await fetch(
    `${url}/rest/v1/user_roles?select=role&user_id=eq.${id}&revoked_at=is.null`,
    { headers: userHeaders },
  );
  const banned = await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ ban_duration: "8760h" }),
  });
  const deniedAfterBan = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const roleRows = refreshedRoles.ok ? await refreshedRoles.json() : [];
  const membershipRows = refreshedMemberships.ok ? await refreshedMemberships.json() : [];
  const revokedRoleRows = rolesAfterRevocation.ok ? await rolesAfterRevocation.json() : [];
  const passed =
    rejected.status >= 400 &&
    assignment.ok &&
    activeMembership.ok &&
    roleRows.length === 1 &&
    membershipRows.length === 1 &&
    revoked.ok &&
    revokedRoleRows.length === 0 &&
    banned.ok &&
    deniedAfterBan.status >= 400;
  console.log(
    JSON.stringify({
      signInRejected: rejected.status >= 400,
      signInAccepted: accepted.ok,
      roleRefresh: roleRows.length === 1 && revokedRoleRows.length === 0,
      membershipRefresh: membershipRows.length === 1,
      disabledDenied: deniedAfterBan.status >= 400,
      emailDelivery: "manual-gate",
      passed,
    }),
  );
  if (!passed) process.exitCode = 1;
} finally {
  if (id)
    await fetch(`${url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: adminHeaders });
}
