import fs from "node:fs";

const legacyIds = [
  "10000000-0000-0000-0000-000000000001",
  "10000000-0000-0000-0000-000000000002",
  "10000000-0000-0000-0000-000000000003",
  "10000000-0000-0000-0000-000000000004",
];
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
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY)
  throw new Error("Supabase development credentials are not configured.");
const headers = {
  apikey: env.SUPABASE_SECRET_KEY,
  authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
};
let removed = 0;
for (const id of legacyIds) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers,
  });
  if (response.ok || response.status === 404) {
    if (response.ok) removed += 1;
    continue;
  }
  throw new Error(`Unable to remove known synthetic Auth fixture: ${response.status}`);
}
console.log(JSON.stringify({ removed }));
