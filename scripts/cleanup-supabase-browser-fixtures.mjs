import fs from "node:fs";

const environment = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const delimiter = line.indexOf("=");
      return [line.slice(0, delimiter), line.slice(delimiter + 1).replace(/^("|')|("|')$/g, "")];
    }),
);

const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const secret = environment.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Supabase development credentials are not configured.");

const headers = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};
const syntheticPrefixes = [
  "claim-",
  "cms-",
  "intake-",
  "lifecycle-",
  "project-",
  "spike-",
  "talent-",
];
const request = (path, options = {}) => fetch(`${url}${path}`, options);
const users = [];

for (let page = 1; ; page += 1) {
  const response = await request(`/auth/v1/admin/users?page=${page}&per_page=100`, { headers });
  if (!response.ok) throw new Error(`Synthetic Auth inventory failed: ${response.status}`);
  const payload = await response.json();
  const batch = Array.isArray(payload) ? payload : (payload.users ?? []);
  users.push(...batch);
  if (batch.length < 100) break;
}

const targets = users.filter(({ email }) =>
  syntheticPrefixes.some(
    (prefix) =>
      typeof email === "string" && email.endsWith("@example.test") && email.startsWith(prefix),
  ),
);

const targetIds = new Set(targets.map(({ id }) => id));
const pagesResponse = await request(
  "/rest/v1/cms_pages?select=id,stable_key,author_id,updated_by_id&stable_key=like.test:*",
  { headers },
);
if (!pagesResponse.ok) throw new Error(`Synthetic CMS inventory failed: ${pagesResponse.status}`);
const pages = (await pagesResponse.json()).filter(
  (page) =>
    typeof page.stable_key === "string" &&
    page.stable_key.startsWith("test:") &&
    targetIds.has(page.author_id) &&
    targetIds.has(page.updated_by_id),
);

const storageResponse = await request("/storage/v1/object/list/cms-private", {
  method: "POST",
  headers,
  body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
});
if (!storageResponse.ok)
  throw new Error(`Synthetic CMS Storage inventory failed: ${storageResponse.status}`);
const storageObjects = (await storageResponse.json()).filter(
  (object) => targetIds.has(object.owner_id) || targetIds.has(object.owner),
);
for (const object of storageObjects) {
  const removed = await request(
    `/storage/v1/object/cms-private/${encodeURIComponent(object.name)}`,
    {
      method: "DELETE",
      headers,
    },
  );
  if (!removed.ok && removed.status !== 404)
    throw new Error(`Synthetic CMS Storage cleanup failed: ${removed.status}`);
}

for (const page of pages) {
  const cleared = await request(`/rest/v1/cms_pages?id=eq.${page.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      current_revision_id: null,
      preview_expires_at: null,
      preview_revision_id: null,
      preview_revoked_at: null,
      preview_token_hash: null,
      published_at: null,
      state: "draft",
    }),
  });
  if (!cleared.ok) throw new Error(`Synthetic CMS pointer cleanup failed: ${cleared.status}`);
  for (const [table, column] of [
    ["audit_logs", "target_id"],
    ["cms_revisions", "page_id"],
  ]) {
    const removed = await request(`/rest/v1/${table}?${column}=eq.${page.id}`, {
      method: "DELETE",
      headers,
    });
    if (!removed.ok) throw new Error(`Synthetic ${table} cleanup failed: ${removed.status}`);
  }
  const removed = await request(`/rest/v1/cms_pages?id=eq.${page.id}`, {
    method: "DELETE",
    headers,
  });
  if (!removed.ok) throw new Error(`Synthetic CMS page cleanup failed: ${removed.status}`);
}

for (const { id } of targets) {
  for (const table of ["user_roles", "membership_history"]) {
    const removed = await request(`/rest/v1/${table}?user_id=eq.${id}`, {
      method: "DELETE",
      headers,
    });
    if (!removed.ok) throw new Error(`Synthetic ${table} cleanup failed: ${removed.status}`);
  }
  const removed = await request(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers });
  if (!removed.ok && removed.status !== 404)
    throw new Error(`Synthetic Auth cleanup failed: ${removed.status}`);
}

console.log(
  JSON.stringify({
    matchedSyntheticUsers: targets.length,
    removed: targets.length,
    removedCmsPages: pages.length,
    removedCmsStorageObjects: storageObjects.length,
  }),
);
