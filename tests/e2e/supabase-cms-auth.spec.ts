import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { expect, test } from "@playwright/test";
import axe from "axe-core";

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
  translationGroup = randomUUID(),
  email = `cms-browser-${probe}@example.test`,
  password = `Umoja-${randomUUID()}-A9!`;
let userId = "",
  pageId = "",
  frenchPageId = "",
  revisionId = "",
  userHeaders: HeadersInit;
const api = (path: string, options: RequestInit = {}) => fetch(`${url}${path}`, options);

async function cleanupResponse(response: Response, operation: string) {
  if (!response.ok) throw new Error(`cleanup:${operation}:${response.status}`);
}

async function revalidateModel(locale: "en" | "fr" = "en") {
  const response = await fetch("http://127.0.0.1:4173/api/cms/revalidate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidation-secret": env.NEXT_REVALIDATION_SECRET!,
    },
    body: JSON.stringify({ locale, slug: "about/model" }),
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
  for (const markerQuery of [
    "stable_key=like.browser:*",
    "stable_key=like.test:*&slug=like.synthetic-*",
  ]) {
    const stale = await api(`/rest/v1/cms_pages?select=id&${markerQuery}`, { headers: service });
    for (const row of stale.ok ? await stale.json() : []) await cleanupPage(row.id);
  }
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
      translation_group_id: translationGroup,
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

  const frenchPage = await api("/rest/v1/cms_pages", {
    method: "POST",
    headers: { ...userHeaders, prefer: "return=representation" },
    body: JSON.stringify({
      stable_key: `browser:${probe}:fr`,
      translation_group_id: translationGroup,
      locale: "fr",
      slug: "about/model",
      author_id: userId,
      updated_by_id: userId,
    }),
  });
  if (!frenchPage.ok) throw new Error(`french-page:${frenchPage.status}`);
  frenchPageId = (await frenchPage.json())[0].id;
  const frenchRevision = await api("/rest/v1/cms_revisions", {
    method: "POST",
    headers: { ...userHeaders, prefer: "return=representation" },
    body: JSON.stringify({
      page_id: frenchPageId,
      revision_number: 1,
      state: "draft",
      title: "Modèle synthétique bilingue pour contenu public",
      blocks: [
        {
          type: "paragraph",
          text: "Contenu synthétique long destiné à vérifier la mise en page française sans données réelles.",
        },
      ],
      author_id: userId,
      change_summary: "fixture française",
    }),
  });
  if (!frenchRevision.ok) throw new Error(`french-revision:${frenchRevision.status}`);
  await cleanupResponse(
    await api(`/rest/v1/cms_pages?id=eq.${frenchPageId}`, {
      method: "PATCH",
      headers: userHeaders,
      body: JSON.stringify({ state: "review", updated_by_id: userId }),
    }),
    "french-review",
  );
  await cleanupResponse(
    await api("/rest/v1/rpc/publish_cms_page", {
      method: "POST",
      headers: userHeaders,
      body: JSON.stringify({ p_page_id: frenchPageId, p_change_summary: "fixture publication" }),
    }),
    "french-publish",
  );
  await revalidateModel();
  await revalidateModel("fr");
});
test.afterAll(async () => {
  if (pageId) await cleanupPage(pageId);
  if (frenchPageId) await cleanupPage(frenchPageId);
  await revalidateModel("en");
  await revalidateModel("fr");
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
test("renders bilingual public and authenticated CMS surfaces accessibly", async ({
  page,
}, testInfo) => {
  for (const [path, heading] of [
    ["/en/about/model", "Synthetic browser CMS"],
    ["/fr/about/model", "Modèle synthétique bilingue pour contenu public"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page).toHaveScreenshot(`cms-public-${path.startsWith("/fr") ? "fr" : "en"}.png`, {
      animations: "disabled",
      fullPage: true,
    });
  }

  await signInCmsAdmin(page);
  await expect(page.getByRole("heading", { name: "Public content" })).toBeVisible();
  const adminOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  expect(adminOverflow).toBeLessThanOrEqual(1);
  const controls = page.locator("button:visible, input:visible, select:visible, textarea:visible");
  for (let index = 0; index < (await controls.count()); index += 1) {
    const box = await controls.nth(index).boundingBox();
    if (box) expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(44);
  }
  await expect(page).toHaveScreenshot("cms-admin-content.png", {
    animations: "disabled",
    fullPage: true,
    mask: [
      page.getByText(email, { exact: true }),
      page.locator(".cms-content-row small"),
      page.locator(".cms-content-row > :last-child"),
    ],
  });

  if (testInfo.project.name === "width-1280") {
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () => {
      const result = await (
        window as typeof window & {
          axe: { run: (root: Document) => Promise<{ violations: { impact: string | null }[] }> };
        }
      ).axe.run(document);
      return result.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      );
    });
    expect(violations).toEqual([]);
  }
});
test("admin signs in through scoped Supabase CMS route", async ({ page }) => {
  await signInCmsAdmin(page);
  await expect(page.getByRole("heading", { name: "Public content" })).toBeVisible();
});
async function signInCmsAdmin(page: import("@playwright/test").Page) {
  await page.goto(`/en/sign-in?next=/en/admin/content`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  const signedIn = page.waitForResponse((response) =>
    response.url().endsWith("/api/supabase-auth/sign-in"),
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const response = await signedIn;
  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(/\/en\/admin\/content$/);
  const sessionCookies = (await page.context().cookies()).filter(({ name }) =>
    name.startsWith("sb-"),
  );
  expect(sessionCookies.length).toBeGreaterThan(0);
  expect(sessionCookies.some(({ httpOnly, path }) => httpOnly && path === "/")).toBe(true);
}
async function issuePreview(
  page: import("@playwright/test").Page,
  selectedRevisionId = revisionId,
) {
  const result = await page.evaluate(
    async ({ pageId, selectedRevisionId }) => {
      const response = await fetch("/api/cms/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pageId,
          revisionId: selectedRevisionId,
          locale: "en",
          expiresInMinutes: 5,
        }),
      });
      return {
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        body: (await response.json()) as { previewExchangePath?: string },
      };
    },
    { pageId, selectedRevisionId },
  );
  expect(result.status).toBe(200);
  expect(result.cacheControl).toContain("no-store");
  expect(result.body.previewExchangePath).toMatch(/^\/api\/cms\/preview\/exchange\?/);
  return result.body.previewExchangePath!;
}
test("exchanges a revision-bound preview capability for a clean, no-store preview", async ({
  page,
}) => {
  await signInCmsAdmin(page);
  const cookieMetadata = (await page.context().cookies()).map(({ name, path }) => ({ name, path }));
  expect(cookieMetadata.some(({ name }) => name.startsWith("sb-"))).toBe(true);
  const previewExchangePath = await issuePreview(page);
  const exchangeResponse = page.waitForResponse((response) =>
    response.url().includes("/api/cms/preview/exchange"),
  );
  await page.goto(previewExchangePath);
  const exchange = await exchangeResponse;
  expect(exchange.status()).toBe(303);
  expect(exchange.headers()["location"]).toBe(`/en/preview/${pageId}`);
  const setCookie = await exchange.headerValues("set-cookie");
  const previewSetCookie = setCookie.find((value) => value.startsWith("umoja_cms_preview="));
  expect(previewSetCookie).toBeDefined();
  const previewAttributes = previewSetCookie!
    .split(";")
    .slice(1)
    .map((attribute) => attribute.trim().toLowerCase());
  expect(previewAttributes).toContain("path=/en/preview");
  expect(previewAttributes).toContain("httponly");
  expect(previewAttributes).toContain("samesite=lax");
  expect(previewAttributes.some((attribute) => attribute.startsWith("max-age="))).toBe(true);
  expect(previewAttributes.some((attribute) => attribute.startsWith("domain="))).toBe(false);
  expect(previewAttributes.includes("secure")).toBe(
    new URL(process.env.APP_URL ?? "http://localhost").protocol === "https:",
  );
  await expect(page).toHaveURL(new RegExp(`/en/preview/${pageId}$`));
  const allCookies = await page.context().cookies();
  expect(allCookies.some(({ name }) => name === "umoja_cms_preview")).toBe(true);
  const previewUrl = page.url();
  const previewCookie = (await page.context().cookies(previewUrl)).find(
    ({ name }) => name === "umoja_cms_preview",
  );
  expect(previewCookie).toBeDefined();
  expect(previewCookie).toMatchObject({
    name: "umoja_cms_preview",
    path: "/en/preview",
    httpOnly: true,
    sameSite: "Lax",
  });
  expect(previewCookie?.expires).toBeGreaterThan(Date.now() / 1000);
  await expect(page.getByRole("heading", { name: "Synthetic browser CMS" })).toBeVisible();
  expect(page.url()).not.toContain("token=");
  const preview = await page.request.get(`/en/preview/${pageId}`);
  expect(preview.headers()["cache-control"]).toContain("no-store");
  expect(preview.headers()["referrer-policy"]).toBe("no-referrer");

  const revoked = await page.evaluate(async (pageId) => {
    const response = await fetch("/api/cms/preview", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId, locale: "en" }),
    });
    return response.status;
  }, pageId);
  expect(revoked).toBe(204);
  await page.goto(`/en/preview/${pageId}`);
  await expect(page.getByRole("heading", { name: "Synthetic browser CMS" })).toHaveCount(0);
});
test("fails closed for absent, malformed, expired, replaced, cross-page, and cross-locale previews", async ({
  page,
}) => {
  const absent = await page.goto(`/en/preview/${pageId}`);
  expect(absent?.status()).toBe(404);

  const directAnon = await api("/rest/v1/rpc/validate_cms_preview_token", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ p_page_id: pageId, p_locale: "en", p_token_hash: "0".repeat(64) }),
  });
  const directAuthenticated = await api("/rest/v1/rpc/validate_cms_preview_token", {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({ p_page_id: pageId, p_locale: "en", p_token_hash: "0".repeat(64) }),
  });
  expect(directAnon.status).toBeGreaterThanOrEqual(400);
  expect(directAuthenticated.status).toBeGreaterThanOrEqual(400);

  await signInCmsAdmin(page);
  await page.context().addCookies([
    {
      name: "umoja_cms_preview",
      value: `${pageId}:malformed`,
      domain: "127.0.0.1",
      path: "/en/preview",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  expect((await page.goto(`/en/preview/${pageId}`))?.status()).toBe(404);

  const firstExchange = await issuePreview(page);
  await page.goto(firstExchange);
  expect((await page.goto(`/en/preview/${randomUUID()}`))?.status()).toBe(404);
  expect((await page.goto(`/fr/preview/${pageId}`))?.status()).toBe(404);

  await cleanupResponse(
    await api(`/rest/v1/cms_pages?id=eq.${pageId}`, {
      method: "PATCH",
      headers: service,
      body: JSON.stringify({ preview_expires_at: new Date(Date.now() - 60_000).toISOString() }),
    }),
    "expire-preview",
  );
  expect((await page.goto(`/en/preview/${pageId}`))?.status()).toBe(404);

  const current = await api(
    `/rest/v1/cms_revisions?select=revision_number&page_id=eq.${pageId}&order=revision_number.desc&limit=1`,
    { headers: service },
  );
  const nextRevisionNumber = ((await current.json())[0]?.revision_number ?? 0) + 1;
  const replacementRevision = await api("/rest/v1/cms_revisions", {
    method: "POST",
    headers: { ...service, prefer: "return=representation" },
    body: JSON.stringify({
      page_id: pageId,
      revision_number: nextRevisionNumber,
      state: "draft",
      title: "Synthetic replacement preview",
      blocks: [{ type: "paragraph", text: "Replacement preview fixture." }],
      author_id: userId,
      change_summary: "replacement preview",
    }),
  });
  await cleanupResponse(replacementRevision, "create-replacement-preview-revision");
  const replacementRevisionId = (await replacementRevision.json())[0].id as string;

  const oldExchange = await issuePreview(page);
  await page.goto(oldExchange);
  await issuePreview(page, replacementRevisionId);
  expect((await page.goto(`/en/preview/${pageId}`))?.status()).toBe(404);

  const replacementExchange = await issuePreview(page, replacementRevisionId);
  await page.goto(replacementExchange);
  await expect(page.getByRole("heading", { name: "Synthetic replacement preview" })).toBeVisible();
  const revoked = await page.evaluate(
    async (boundPageId) =>
      (
        await fetch("/api/cms/preview", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pageId: boundPageId, locale: "en" }),
        })
      ).status,
    pageId,
  );
  expect(revoked).toBe(204);
  expect((await page.goto(`/en/preview/${pageId}`))?.status()).toBe(404);
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
