import { randomUUID } from "node:crypto";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const offset = line.indexOf("=");
      return [line.slice(0, offset), line.slice(offset + 1).replace(/^("|')|("|')$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret)
  throw new Error("Supabase development credentials are not configured.");

const identifier = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const email = `spike-${identifier}@example.test`;
const serviceHeaders = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};
const publicHeaders = { apikey: publishable, "content-type": "application/json" };
let userId;
let completed = false;

async function request(path, options = {}) {
  return fetch(`${url}${path}`, options);
}

try {
  const created = await request("/auth/v1/admin/users", {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Synthetic policy probe" },
    }),
  });
  if (!created.ok) throw new Error(`Auth Admin create failed: ${created.status}`);
  userId = (await created.json()).id;
  const role = await request("/rest/v1/user_roles", {
    method: "POST",
    headers: { ...serviceHeaders, prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, role: "extended" }),
  });
  if (!role.ok) throw new Error(`Protected role setup failed: ${role.status}`);
  const signedIn = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: publicHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (!signedIn.ok) throw new Error(`Synthetic sign-in failed: ${signedIn.status}`);
  const token = (await signedIn.json()).access_token;
  const userHeaders = { apikey: publishable, authorization: `Bearer ${token}` };
  const ownRoles = await request(`/rest/v1/user_roles?select=role&user_id=eq.${userId}`, {
    headers: userHeaders,
  });
  const privateRows = await request("/rest/v1/project_intakes?select=id", { headers: userHeaders });
  const privateStorage = await request("/storage/v1/object/list/applicant-private", {
    method: "POST",
    headers: { ...userHeaders, "content-type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 1 }),
  });
  completed = ownRoles.ok && privateRows.ok && privateStorage.ok;
  const roleRows = ownRoles.ok ? await ownRoles.json() : [];
  const intakeRows = privateRows.ok ? await privateRows.json() : [];
  const storageRows = privateStorage.ok ? await privateStorage.json() : [];
  completed =
    completed && roleRows.length === 1 && intakeRows.length === 0 && storageRows.length === 0;
  console.log(
    JSON.stringify({
      authenticatedOwner: completed,
      roleRows: roleRows.length,
      intakeRows: intakeRows.length,
      privateStorageRows: storageRows.length,
    }),
  );
  if (!completed) process.exitCode = 1;
} finally {
  if (userId) {
    const removed = await request(`/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: serviceHeaders,
    });
    if (!removed.ok) {
      console.error(JSON.stringify({ cleanup: "failed", status: removed.status }));
      process.exitCode = 1;
    }
  }
}
