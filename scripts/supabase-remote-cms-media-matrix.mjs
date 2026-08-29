import { randomUUID } from "node:crypto";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [
        line.slice(0, i).trim(),
        line
          .slice(i + 1)
          .trim()
          .replace(/^("|')|("|')$/g, ""),
      ];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL,
  key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  secret = env.SUPABASE_SECRET_KEY;
if (!url || !key || !secret) throw new Error("Supabase development configuration is unavailable.");
const id = randomUUID(),
  password = `Umoja-${randomUUID()}-A9!`,
  users = [],
  paths = [];
const service = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};
const req = (path, options = {}) => fetch(`${url}${path}`, options);
async function create(role) {
  const email = `cms-${role}-${id}@example.test`;
  const user = await req("/auth/v1/admin/users", {
    method: "POST",
    headers: service,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!user.ok) throw new Error(`create-${role}:${user.status}`);
  const value = await user.json();
  users.push(value.id);
  for (const path of ["/rest/v1/user_roles", "/rest/v1/membership_history"]) {
    const body = path.endsWith("user_roles")
      ? { user_id: value.id, role }
      : { user_id: value.id, tier: "core", effective_from: new Date().toISOString() };
    const setup = await req(path, {
      method: "POST",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (!setup.ok) throw new Error(`setup-${role}:${setup.status}`);
  }
  const token = await req("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!token.ok) throw new Error(`token-${role}:${token.status}`);
  return {
    id: value.id,
    headers: {
      apikey: key,
      authorization: `Bearer ${(await token.json()).access_token}`,
      "content-type": "application/json",
    },
  };
}
try {
  const editor = await create("cms-editor"),
    admin = await create("admin"),
    reviewer = await create("reviewer");
  await create("extended");
  const slug = `synthetic-${id}`,
    group = randomUUID();
  const page = await req("/rest/v1/cms_pages", {
    method: "POST",
    headers: { ...editor.headers, prefer: "return=representation" },
    body: JSON.stringify({
      stable_key: `test:${id}`,
      translation_group_id: group,
      locale: "en",
      slug,
      author_id: editor.id,
      updated_by_id: editor.id,
    }),
  });
  if (!page.ok) throw new Error(`draft:${page.status}`);
  const created = (await page.json())[0];
  const revision = await req("/rest/v1/cms_revisions", {
    method: "POST",
    headers: { ...editor.headers, prefer: "return=representation" },
    body: JSON.stringify({
      page_id: created.id,
      revision_number: 1,
      state: "draft",
      title: "Synthetic CMS",
      blocks: [{ type: "paragraph", text: "Synthetic only" }],
      author_id: editor.id,
      change_summary: "draft",
    }),
  });
  if (!revision.ok) throw new Error(`revision:${revision.status}`);
  const anonDraft = await req(`/rest/v1/cms_pages?select=id&slug=eq.${slug}`, {
    headers: { apikey: key },
  });
  const reviewerDraft = await req(`/rest/v1/cms_pages?select=id&slug=eq.${slug}`, {
    headers: reviewer.headers,
  });
  const review = await req(`/rest/v1/cms_pages?id=eq.${created.id}`, {
    method: "PATCH",
    headers: { ...editor.headers, prefer: "return=minimal" },
    body: JSON.stringify({ state: "review", updated_by_id: editor.id }),
  });
  const published = await req("/rest/v1/rpc/publish_cms_page", {
    method: "POST",
    headers: admin.headers,
    body: JSON.stringify({ p_page_id: created.id, p_change_summary: "synthetic publish" }),
  });
  const anonPublished = await req(
    `/rest/v1/cms_pages?select=id,current_revision_id&slug=eq.${slug}&state=eq.published`,
    { headers: { apikey: key } },
  );
  const sourcePath = `synthetic-test/cms-media-matrix/${id}/${randomUUID()}`;
  paths.push(sourcePath);
  const upload = await req(`/storage/v1/object/cms-private/${sourcePath}`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: editor.headers.authorization,
      "content-type": "image/png",
      "x-upsert": "false",
    },
    body: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  const anonymousPrivate = await req("/storage/v1/object/list/cms-private", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ prefix: sourcePath, limit: 1 }),
  });
  const rollback = await req("/rest/v1/rpc/rollback_cms_page", {
    method: "POST",
    headers: admin.headers,
    body: JSON.stringify({ p_page_id: created.id, p_revision_id: (await revision.json())[0].id }),
  });
  const afterRollback = await req(
    `/rest/v1/cms_pages?select=id&slug=eq.${slug}&state=eq.published`,
    { headers: { apikey: key } },
  );
  const publishFailure = published.ok ? null : await published.json().catch(() => ({}));
  const anonymousPublishedRows = anonPublished.ok ? await anonPublished.json() : [];
  const anonymousPrivateRows = anonymousPrivate.ok ? await anonymousPrivate.json() : [];
  const checks = {
    anonDraft: anonDraft.ok && (await anonDraft.json()).length === 0,
    reviewerDraft: reviewerDraft.ok && (await reviewerDraft.json()).length === 0,
    review: review.ok,
    published: published.ok && anonPublished.ok && anonymousPublishedRows.length === 1,
    privateUpload: upload.ok,
    anonymousPrivateDenied: anonymousPrivate.status >= 400 || anonymousPrivateRows.length === 0,
    rollback: rollback.ok && afterRollback.ok && (await afterRollback.json()).length === 0,
  };
  console.log(
    JSON.stringify({
      ...checks,
      publishStatus: published.status,
      publishErrorCode: typeof publishFailure?.code === "string" ? publishFailure.code : "unknown",
      anonymousPublishedCount: anonymousPublishedRows.length,
      anonymousPrivateStatus: anonymousPrivate.status,
      anonymousPrivateRows: anonymousPrivateRows.length,
      passed: Object.values(checks).every(Boolean),
    }),
  );
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
} finally {
  for (const path of paths)
    await req(`/storage/v1/object/cms-private/${path}`, { method: "DELETE", headers: service });
  for (const user of users)
    await req(`/auth/v1/admin/users/${user}`, { method: "DELETE", headers: service });
}
