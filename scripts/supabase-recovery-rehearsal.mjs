import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^("|')|("|')$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Supabase recovery credentials are unavailable.");
const headers = { apikey: secret, authorization: `Bearer ${secret}` };
const tables = [
  "user_roles",
  "cms_pages",
  "cms_revisions",
  "project_intakes",
  "talent_intakes",
  "intake_files",
  "intake_claim_capabilities",
  "audit_logs",
  "profiles",
  "private_profile_details",
  "skills",
  "profile_skills",
  "portfolio_items",
  "availability_snapshots",
  "membership_history",
];
const buckets = ["cms-public", "cms-private", "applicant-private"];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "umoja-supabase-recovery-"));

async function request(resource, options = {}) {
  const response = await fetch(`${url}${resource}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Recovery read failed (${response.status}).`);
  return response;
}

async function rows(table) {
  return (await request(`/rest/v1/${table}?select=*`)).json();
}

async function objects(bucket) {
  return (
    await request(`/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
    })
  ).json();
}

try {
  const application = Object.fromEntries(
    await Promise.all(tables.map(async (table) => [table, await rows(table)])),
  );
  const storage = Object.fromEntries(
    await Promise.all(
      buckets.map(async (bucket) => [
        bucket,
        (await objects(bucket)).map((object) => ({
          name: object.name,
          created_at: object.created_at,
          updated_at: object.updated_at,
          metadata: object.metadata,
        })),
      ]),
    ),
  );
  const auth = await (await request("/auth/v1/admin/users?per_page=1000&page=1")).json();
  const exportValue = {
    format: "umoja-supabase-logical-v1",
    exportedAt: new Date().toISOString(),
    application,
    storage,
    authInventory: {
      count: Array.isArray(auth.users) ? auth.users.length : 0,
      limitation: "passwords, sessions, MFA secrets, and provider credentials are not exportable",
    },
  };
  const body = JSON.stringify(exportValue);
  const checksum = createHash("sha256").update(body).digest("hex");
  const artifact = path.join(temporary, "synthetic-logical-export.json");
  fs.writeFileSync(artifact, body, { encoding: "utf8", mode: 0o600 });
  const readback = fs.readFileSync(artifact, "utf8");
  if (createHash("sha256").update(readback).digest("hex") !== checksum) {
    throw new Error("Recovery export checksum verification failed.");
  }
  const parsed = JSON.parse(readback);
  const tableCounts = Object.fromEntries(
    tables.map((table) => [table, parsed.application[table].length]),
  );
  const storageCounts = Object.fromEntries(
    buckets.map((bucket) => [bucket, parsed.storage[bucket].length]),
  );
  console.log(
    JSON.stringify({
      exportReadback: true,
      checksumVerified: true,
      tableCounts,
      storageCounts,
      authCount: parsed.authInventory.count,
      restore: "manual-empty-target-gate",
      temporaryArtifactRemoved: true,
    }),
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
