import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off" });
test.describe.configure({ mode: "serial" });

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
const url = env.NEXT_PUBLIC_SUPABASE_URL!,
  key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  secret = env.SUPABASE_SECRET_KEY!;
const service = {
  apikey: secret,
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};
const probe = randomUUID(),
  email = `cms-browser-${probe}@example.test`,
  password = `Umoja-${randomUUID()}-A9!`;
let userId = "",
  pageId = "",
  revisionId = "",
  userHeaders: HeadersInit;
const api = (path: string, options: RequestInit = {}) => fetch(`${url}${path}`, options);

async function cleanupResponse(response: Response, operation: string) {
  if (!response.ok) throw new Error(`cleanup:${operation}:${response.status}`);
}

async function revalidateModel() {
  const response = await fetch("http://127.0.0.1:4173/api/cms/revalidate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidation-secret": env.NEXT_REVALIDATION_SECRET!,
    },
    body: JSON.stringify({ locale: "en", slug: "about/model" }),
  });
  if (!response.ok) throw new Error(`revalidate:${response.status}`);
}
async function cleanupPage(id: string) {
  await cleanupResponse(
    await api(`/rest/v1/cms_pages?id=eq.${id}`, {
      method: "PATCH",
      headers: service,
      body: JSON.stringify({
        current_revision_id: null,
        preview_revision_id: null,
        preview_token_hash: null,
        preview_expires_at: null,
        state: "draft",
      }),
    }),
    "clear-page-pointer",
  );
  await cleanupResponse(
    await api(`/rest/v1/audit_logs?target_type=eq.cms_page&target_id=eq.${id}`, {
      method: "DELETE",
      headers: service,
    }),
    "delete-audits",
  );
  await cleanupResponse(
    await api(`/rest/v1/cms_revisions?page_id=eq.${id}`, { method: "DELETE", headers: service }),
    "delete-revisions",
  );
  await cleanupResponse(
    await api(`/rest/v1/cms_pages?id=eq.${id}`, { method: "DELETE", headers: service }),
    "delete-page",
  );
}

test.beforeAll(async () => {
  const stale = await api("/rest/v1/cms_pages?select=id&stable_key=like.browser:*", {
    headers: service,
  });
  for (const row of stale.ok ? await stale.json() : []) await cleanupPage(row.id);
  const created = await api("/auth/v1/admin/users", {
    method: "POST",
    headers: service,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) throw new Error(`admin-create:${created.status}`);
  userId = (await created.json()).id;
  for (const [path, body] of [
    ["/rest/v1/user_roles", { user_id: userId, role: "admin" }],
    [
      "/rest/v1/membership_history",
      { user_id: userId, tier: "core", effective_from: new Date().toISOString() },
    ],
  ] as const) {
    const response = await api(path, {
      method: "POST",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`setup:${response.status}`);
  }
  const signed = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!signed.ok) throw new Error(`token:${signed.status}`);
  userHeaders = {
    apikey: key,
    authorization: `Bearer ${(await signed.json()).access_token}`,
    "content-type": "application/json",
  };
  const page = await api("/rest/v1/cms_pages", {
    method: "POST",
    headers: { ...userHeaders, prefer: "return=representation" },
    body: JSON.stringify({
      stable_key: `browser:${probe}`,
      translation_group_id: randomUUID(),
      locale: "en",
      slug: "about/model",
      author_id: userId,
      updated_by_id: userId,
    }),
  });
  if (!page.ok) throw new Error(`page:${page.status}`);
  pageId = (await page.json())[0].id;
  const revision = await api("/rest/v1/cms_revisions", {
    method: "POST",
    headers: { ...userHeaders, prefer: "return=representation" },
    body: JSON.stringify({
      page_id: pageId,
      revision_number: 1,
      state: "draft",
      title: "Synthetic browser CMS",
      blocks: [{ type: "paragraph", text: "Synthetic browser fixture." }],
      author_id: userId,
      change_summary: "fixture",
    }),
  });
  if (!revision.ok) throw new Error(`revision:${revision.status}`);
  revisionId = (await revision.json())[0].id;
  await api(`/rest/v1/cms_pages?id=eq.${pageId}`, {
    method: "PATCH",
    headers: userHeaders,
    body: JSON.stringify({ state: "review", updated_by_id: userId }),
  });
  const publish = await api("/rest/v1/rpc/publish_cms_page", {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({ p_page_id: pageId, p_change_summary: "fixture publish" }),
  });
  if (!publish.ok) throw new Error(`publish:${publish.status}`);
  revisionId = (await publish.json()).current_revision_id;
  if (!revisionId) throw new Error("published-revision-pointer");
  const anonymousPublished = await api(
    `/rest/v1/cms_pages?select=id,current_revision_id,state&locale=eq.en&slug=eq.about%2Fmodel&state=eq.published`,
    { headers: { apikey: key } },
  );
  if (!anonymousPublished.ok || (await anonymousPublished.json()).length !== 1)
    throw new Error("anonymous-published-query");
  const anonymousRevision = await api(
    `/rest/v1/cms_revisions?select=id,title,state&id=eq.${revisionId}&state=eq.published`,
    { headers: { apikey: key } },
  );
  const revisions = anonymousRevision.ok ? await anonymousRevision.json() : [];
  if (revisions.length !== 1 || revisions[0]?.title !== "Synthetic browser CMS")
    throw new Error("anonymous-published-revision-query");
  await revalidateModel();
});
test.afterAll(async () => {
  if (pageId) await cleanupPage(pageId);
  if (userId) {
    await cleanupResponse(
      await api(`/rest/v1/user_roles?user_id=eq.${userId}`, { method: "DELETE", headers: service }),
      "delete-roles",
    );
    await cleanupResponse(
      await api(`/rest/v1/membership_history?user_id=eq.${userId}`, {
        method: "DELETE",
        headers: service,
      }),
      "delete-memberships",
    );
    await cleanupResponse(
      await api(`/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: service }),
      "delete-auth-user",
    );
  }
});

test("anonymous reads the published synthetic CMS route", async ({ page }) => {
  await page.goto("/en/about/model");
  await expect(page.getByRole("heading", { name: "Synthetic browser CMS" })).toBeVisible();
});
test("admin signs in through scoped Supabase CMS route", async ({ page }) => {
  await signInCmsAdmin(page);
  await expect(page.getByRole("heading", { name: "Public content" })).toBeVisible();
});
async function signInCmsAdmin(page: import("@playwright/test").Page) {
  await page.goto(`/en/admin/content/sign-in?next=/en/admin/content`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/content$/);
}
test("exchanges a revision-bound preview capability for a clean, no-store preview", async ({ page }) => {
  await signInCmsAdmin(page);
  const issued = await page.request.post("/api/cms/preview", {
    data: { pageId, revisionId, locale: "en", expiresInMinutes: 5 },
  });
  expect(issued.status()).toBe(200);
  expect(issued.headers()["cache-control"]).toContain("no-store");
  const body = (await issued.json()) as { previewExchangePath: string };
  expect(body.previewExchangePath).toMatch(/^\/api\/cms\/preview\/exchange\?/);
  await page.goto(body.previewExchangePath);
  await expect(page).toHaveURL(new RegExp(`/en/preview/${pageId}$`));
  await expect(page.getByRole("heading", { name: "Synthetic browser CMS" })).toBeVisible();
  expect(page.url()).not.toContain("token=");
  const preview = await page.request.get(`/en/preview/${pageId}`);
  expect(preview.headers()["cache-control"]).toContain("no-store");
  expect(preview.headers()["referrer-policy"]).toBe("no-referrer");

  const revoked = await page.request.delete("/api/cms/preview", { data: { pageId, locale: "en" } });
  expect(revoked.status()).toBe(204);
  await page.goto(`/en/preview/${pageId}`);
  await expect(page.getByRole("heading", { name: "Synthetic browser CMS" })).toHaveCount(0);
});
test("unpublish invalidates the public route back to its editorial fallback", async ({ page }) => {
  const unpublished = await api(`/rest/v1/cms_pages?id=eq.${pageId}`, {
    method: "PATCH",
    headers: userHeaders,
    body: JSON.stringify({ state: "draft", current_revision_id: null, updated_by_id: userId }),
  });
  if (!unpublished.ok) throw new Error(`unpublish:${unpublished.status}`);
  await revalidateModel();
  await page.goto("/en/about/model");
  await expect(page.getByText("Synthetic browser CMS")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "One project, many modules, only the context each role needs.",
    }),
  ).toBeVisible();
});
