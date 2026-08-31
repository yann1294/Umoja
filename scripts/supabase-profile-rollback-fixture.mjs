#!/usr/bin/env node

import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";

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
if (!url || !publishableKey || !secretKey)
  throw new Error("Supabase development configuration is unavailable");

const serviceHeaders = {
  apikey: secretKey,
  authorization: `Bearer ${secretKey}`,
  "content-type": "application/json",
};
const request = (path, options = {}) => fetch(`${url}${path}`, options);

function encryptionConfiguration() {
  const version =
    env.UMOJA_ACTIVE_ENCRYPTION_KEY_VERSION ?? env.SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION;
  if (!version || !/^v[1-9][0-9]*$/.test(version))
    throw new Error("profile_encryption_version_unavailable");
  const suffix = version.toUpperCase();
  const encodedKey =
    env[`UMOJA_DATA_ENCRYPTION_KEY_${suffix}`] ?? env[`SUPABASE_DATA_ENCRYPTION_KEY_${suffix}`];
  if (!encodedKey) throw new Error("profile_data_encryption_key_unavailable");
  const key = Buffer.from(
    encodedKey,
    encodedKey.includes("+") || encodedKey.includes("/") ? "base64" : "base64url",
  );
  if (key.byteLength !== 32) throw new Error("profile_data_encryption_key_invalid");
  return { version, key };
}

function encryptPrivateFixture(ownerId) {
  const { version, key } = encryptionConfiguration();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`umoja:data:${version}:profile:${ownerId}:private-details`, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify({ timezone: "Africa/Nairobi" }), "utf8"),
    cipher.final(),
  ]);
  return {
    version,
    envelope: [
      version,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join("."),
  };
}

async function removeUser(id) {
  const response = await request(`/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: serviceHeaders,
    body: JSON.stringify({ should_soft_delete: false }),
  });
  if (!response.ok && response.status !== 404)
    throw new Error(`fixture_cleanup_${response.status}`);
}

async function cleanupRun(runId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(runId)) {
    throw new Error("cleanup_run_id_invalid");
  }
  const emails = new Set([
    `profile-rollback-owner-${runId}@example.test`,
    `profile-rollback-admin-${runId}@example.test`,
  ]);
  const ids = [];
  for (let page = 1; ; page += 1) {
    const response = await request(`/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: serviceHeaders,
    });
    if (!response.ok) throw new Error(`fixture_inventory_${response.status}`);
    const payload = await response.json();
    const users = Array.isArray(payload.users) ? payload.users : [];
    for (const user of users) if (emails.has(user.email)) ids.push(user.id);
    if (users.length < 1000) break;
  }
  for (const id of ids) await removeUser(id);
  console.log(JSON.stringify({ runId, exactSyntheticUsersRemoved: ids.length }));
}

if (process.argv[2] === "--cleanup") {
  await cleanupRun(process.argv[3] ?? "");
  process.exit(0);
}

const runId = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const createdIds = [];
async function createUser(kind) {
  const email = `profile-rollback-${kind}-${runId}@example.test`;
  const response = await request("/auth/v1/admin/users", {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`fixture_create_${kind}_${response.status}`);
  const user = await response.json();
  createdIds.push(user.id);
  return { id: user.id, email };
}

try {
  const owner = await createUser("owner");
  const admin = await createUser("admin");
  for (const [path, body] of [
    ["/rest/v1/user_roles", { user_id: admin.id, role: "admin" }],
    [
      "/rest/v1/membership_history",
      { user_id: admin.id, tier: "core", effective_from: new Date().toISOString() },
    ],
  ]) {
    const response = await request(path, {
      method: "POST",
      headers: { ...serviceHeaders, prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`fixture_admin_seed_${response.status}`);
  }
  const tokenResponse = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email: owner.email, password }),
  });
  if (!tokenResponse.ok) throw new Error(`fixture_auth_${tokenResponse.status}`);
  const tokenPayload = await tokenResponse.json();
  const ownerHeaders = {
    apikey: publishableKey,
    authorization: `Bearer ${tokenPayload.access_token}`,
    "content-type": "application/json",
  };
  const encrypted = encryptPrivateFixture(owner.id);
  const fixtureSlug = `profile-rollback-${runId}`;
  const profileResponse = await request("/rest/v1/rpc/save_profile_with_audit", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({
      profile_user_id: owner.id,
      professional_name: "Synthetic rollback owner",
      profile_locale: "en",
      profile_country: "KE",
      profile_bio: "Synthetic rollback fixture",
      profile_slug: fixtureSlug,
      profile_visibility: "public",
      requested_state: "submitted",
      consent_given: true,
      private_envelope: encrypted.envelope,
      private_key_version: encrypted.version,
    }),
  });
  if (!profileResponse.ok) throw new Error(`fixture_profile_${profileResponse.status}`);
  const skillResponse = await request("/rest/v1/skills?select=id&archived_at=is.null&limit=1", {
    headers: serviceHeaders,
  });
  if (!skillResponse.ok) throw new Error(`fixture_skill_${skillResponse.status}`);
  const skillId = (await skillResponse.json())[0]?.id;
  if (!skillId) throw new Error("fixture_skill_unavailable");
  console.log(
    JSON.stringify({
      runId,
      ownerId: owner.id,
      ownerEmail: owner.email,
      adminId: admin.id,
      adminEmail: admin.email,
      skillId,
      fixtureSlug,
      cleanupCommand: `node scripts/supabase-profile-rollback-fixture.mjs --cleanup ${runId}`,
    }),
  );
} catch (error) {
  for (const id of createdIds) await removeUser(id).catch(() => {});
  throw error;
}
