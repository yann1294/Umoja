import fs from "node:fs";

const source = Object.fromEntries(
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
const url = source.NEXT_PUBLIC_SUPABASE_URL;
const secret = source.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Supabase development credentials are not configured.");
const headers = { apikey: secret, authorization: `Bearer ${secret}`, prefer: "count=exact" };
const tables = [
  "user_roles",
  "cms_pages",
  "cms_revisions",
  "project_intakes",
  "talent_intakes",
  "audit_logs",
  "profiles",
  "private_profile_details",
  "skills",
  "profile_skills",
  "portfolio_items",
  "availability_snapshots",
  "membership_history",
];
const counts = {};
for (const table of tables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    method: "HEAD",
    headers,
  });
  if (response.status === 404) {
    counts[table] = "absent";
    continue;
  }
  if (!response.ok) throw new Error(`Unable to inspect ${table}: ${response.status}`);
  counts[table] = Number((response.headers.get("content-range") ?? "*/0").split("/").at(-1));
}
const users = await fetch(`${url}/auth/v1/admin/users?per_page=1`, { headers });
if (!users.ok) throw new Error(`Unable to inspect users: ${users.status}`);
const userPage = await users.json();
const buckets = await fetch(`${url}/storage/v1/bucket`, { headers });
if (!buckets.ok) throw new Error(`Unable to inspect buckets: ${buckets.status}`);
const userCount = Number(
  userPage.total ??
    users.headers.get("x-total-count") ??
    (users.headers.get("content-range") ?? "*/0").split("/").at(-1),
);
const bucketRows = await buckets.json();
const bucketObjectCounts = {};
for (const bucket of bucketRows) {
  const objects = await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket.id)}`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
  });
  if (!objects.ok) throw new Error(`Unable to inspect bucket objects: ${objects.status}`);
  bucketObjectCounts[bucket.id] = (await objects.json()).length;
}
console.log(
  JSON.stringify({
    projectHost: new URL(url).host,
    users: userCount,
    tableCounts: counts,
    bucketIds: bucketRows.map((bucket) => bucket.id).sort(),
    bucketObjectCounts,
  }),
);
