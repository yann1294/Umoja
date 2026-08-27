import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off" });
test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

type Role = "admin" | "cms-editor" | "reviewer" | "extended";
type SyntheticUser = Readonly<{ id: string; email: string; headers: HeadersInit }>;

const environment = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const delimiter = line.indexOf("=");
      return [
        line.slice(0, delimiter).trim(),
        line
          .slice(delimiter + 1)
          .trim()
          .replace(/^(\"|')|(\"|')$/g, ""),
      ];
    }),
);
const url = environment.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = environment.SUPABASE_SECRET_KEY!;
const service = {
  apikey: secretKey,
  authorization: `Bearer ${secretKey}`,
  "content-type": "application/json",
};
const run = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const users: SyntheticUser[] = [];
const pageIds: string[] = [];
const storagePaths: string[] = [];
const request = (path: string, options: RequestInit = {}) => fetch(`${url}${path}`, options);

async function expectOk(response: Response, operation: string) {
  if (!response.ok) throw new Error(`${operation}:${response.status}`);
  return response;
}

async function expectDeniedOrEmpty(response: Response) {
  if (!response.ok) return;
  expect(await response.json()).toEqual([]);
}

async function createUser(role: Role): Promise<SyntheticUser> {
  const email = `cms-parity-${role}-${run}-${users.length}@example.test`;
  const created = await expectOk(
    await request("/auth/v1/admin/users", {
      method: "POST",
      headers: service,
      body: JSON.stringify({ email, password, email_confirm: true }),
    }),
    `create-${role}`,
  );
  const id = (await created.json()).id as string;
  await expectOk(
    await request("/rest/v1/user_roles", {
      method: "POST",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify({ user_id: id, role }),
    }),
    `role-${role}`,
  );
  await expectOk(
    await request("/rest/v1/membership_history", {
      method: "POST",
      headers: { ...service, prefer: "return=minimal" },
      body: JSON.stringify({ user_id: id, tier: "core", effective_from: new Date().toISOString() }),
    }),
    `membership-${role}`,
  );
  const signedIn = await expectOk(
    await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: publishableKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
    `token-${role}`,
  );
  const headers = {
    apikey: publishableKey,
    authorization: `Bearer ${(await signedIn.json()).access_token as string}`,
    "content-type": "application/json",
  };
  const user = { id, email, headers };
  users.push(user);
  return user;
}

async function signInCms(
  page: import("@playwright/test").Page,
  user: SyntheticUser,
  next = "/en/admin/content",
) {
  await page.context().clearCookies();
  await page.goto(`/en/admin/content/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function cleanupPage(id: string) {
  await expectOk(
    await request(`/rest/v1/cms_pages?id=eq.${id}`, {
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
  await expectOk(
    await request(`/rest/v1/audit_logs?target_type=eq.cms_page&target_id=eq.${id}`, {
      method: "DELETE",
      headers: service,
    }),
    "delete-audits",
  );
  await expectOk(
    await request(`/rest/v1/cms_revisions?page_id=eq.${id}`, {
      method: "DELETE",
      headers: service,
    }),
    "delete-revisions",
  );
  await expectOk(
    await request(`/rest/v1/cms_pages?id=eq.${id}`, { method: "DELETE", headers: service }),
    "delete-page",
  );
}

test.afterAll(async () => {
  for (const path of storagePaths) {
    await expectOk(
      await request("/storage/v1/object/cms-private", {
        method: "DELETE",
        headers: service,
        body: JSON.stringify({ prefixes: [path] }),
      }),
      "delete-private-object",
    );
    await expectOk(
      await request("/storage/v1/object/cms-public", {
        method: "DELETE",
        headers: service,
        body: JSON.stringify({ prefixes: [path] }),
      }),
      "delete-public-object",
    );
  }
  for (const id of pageIds) await cleanupPage(id);
  for (const user of users) {
    await expectOk(
      await request(`/rest/v1/user_roles?user_id=eq.${user.id}`, {
        method: "DELETE",
        headers: service,
      }),
      "delete-roles",
    );
    await expectOk(
      await request(`/rest/v1/membership_history?user_id=eq.${user.id}`, {
        method: "DELETE",
        headers: service,
      }),
      "delete-memberships",
    );
    await expectOk(
      await request(`/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: service }),
      "delete-auth-user",
    );
  }
});

test("enforces the CMS and media RLS lifecycle with disposable roles", async ({ page }) => {
  const [admin, editor, reviewer, unrelated] = await Promise.all([
    createUser("admin"),
    createUser("cms-editor"),
    createUser("reviewer"),
    createUser("extended"),
  ]);
  const disabled = await createUser("cms-editor");
  const slug = `synthetic-${run}`;
  const draft = await expectOk(
    await request("/rest/v1/cms_pages", {
      method: "POST",
      headers: { ...editor.headers, prefer: "return=representation" },
      body: JSON.stringify({
        stable_key: `parity:${run}`,
        translation_group_id: randomUUID(),
        locale: "en",
        slug,
        author_id: editor.id,
        updated_by_id: editor.id,
      }),
    }),
    "create-draft",
  );
  const contentPage = (await draft.json())[0] as { id: string };
  pageIds.push(contentPage.id);
  const anonymousRevisionless = await expectOk(
    await request(`/rest/v1/cms_pages?select=id&id=eq.${contentPage.id}`, {
      headers: { apikey: publishableKey },
    }),
    "anonymous-revisionless",
  );
  expect(await anonymousRevisionless.json()).toHaveLength(0);
  await signInCms(page, editor);
  await expect(page).toHaveURL(/\/en\/admin\/content$/);
  await expect(page.getByRole("heading", { name: "Public content" })).toBeVisible();
  const revision = await expectOk(
    await request("/rest/v1/cms_revisions", {
      method: "POST",
      headers: { ...editor.headers, prefer: "return=representation" },
      body: JSON.stringify({
        page_id: contentPage.id,
        revision_number: 1,
        state: "draft",
        title: "Synthetic parity content",
        blocks: [{ type: "paragraph", text: "Synthetic parity body." }],
        author_id: editor.id,
        change_summary: "synthetic draft",
      }),
    }),
    "create-revision",
  );
  const originalRevision = (await revision.json())[0] as { id: string };

  const previewRequest = (browserPage: import("@playwright/test").Page) =>
    browserPage.evaluate(
      async ({ pageId, revisionId }) =>
        (
          await fetch("/api/cms/preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pageId, revisionId, locale: "en", expiresInMinutes: 5 }),
          })
        ).status,
      { pageId: contentPage.id, revisionId: originalRevision.id },
    );
  await page.context().clearCookies();
  expect(await previewRequest(page)).toBe(403);
  for (const deniedUser of [reviewer, unrelated]) {
    await signInCms(page, deniedUser);
    expect(await previewRequest(page)).toBe(403);
  }
  await signInCms(page, disabled);
  await expectOk(
    await request(`/auth/v1/admin/users/${disabled.id}`, {
      method: "PUT",
      headers: service,
      body: JSON.stringify({ ban_duration: "876000h" }),
    }),
    "disable-user",
  );
  expect(await previewRequest(page)).toBe(403);

  const draftQuery = `/rest/v1/cms_pages?select=id&slug=eq.${slug}`;
  const [anonymousDraft, reviewerDraft, unrelatedDraft, editorDraft] = await Promise.all([
    request(draftQuery, { headers: { apikey: publishableKey } }),
    request(draftQuery, { headers: reviewer.headers }),
    request(draftQuery, { headers: unrelated.headers }),
    request(draftQuery, { headers: editor.headers }),
  ]);
  expect(await anonymousDraft.json()).toHaveLength(0);
  expect(await reviewerDraft.json()).toHaveLength(0);
  expect(await unrelatedDraft.json()).toHaveLength(0);
  expect(await editorDraft.json()).toHaveLength(1);

  const reviewerWrite = await request(`/rest/v1/cms_pages?id=eq.${contentPage.id}`, {
    method: "PATCH",
    headers: reviewer.headers,
    body: JSON.stringify({ state: "review", updated_by_id: reviewer.id }),
  });
  expect([204, 401, 403]).toContain(reviewerWrite.status);
  const stillDraft = await expectOk(
    await request(`/rest/v1/cms_pages?select=state&id=eq.${contentPage.id}`, {
      headers: editor.headers,
    }),
    "editor-after-reviewer-write",
  );
  expect(await stillDraft.json()).toEqual([{ state: "draft" }]);

  await expectOk(
    await request(`/rest/v1/cms_pages?id=eq.${contentPage.id}`, {
      method: "PATCH",
      headers: editor.headers,
      body: JSON.stringify({ state: "review", updated_by_id: editor.id }),
    }),
    "submit-review",
  );
  const reviewerPublish = await request("/rest/v1/rpc/publish_cms_page", {
    method: "POST",
    headers: reviewer.headers,
    body: JSON.stringify({ p_page_id: contentPage.id, p_change_summary: "not allowed" }),
  });
  expect(reviewerPublish.status).toBeGreaterThanOrEqual(400);

  const published = await expectOk(
    await request("/rest/v1/rpc/publish_cms_page", {
      method: "POST",
      headers: admin.headers,
      body: JSON.stringify({ p_page_id: contentPage.id, p_change_summary: "synthetic publish" }),
    }),
    "publish",
  );
  const publishedPage = (await published.json()) as { current_revision_id: string };
  expect(publishedPage.current_revision_id).toBeTruthy();

  const publicPublished = await expectOk(
    await request(`${draftQuery}&state=eq.published`, { headers: { apikey: publishableKey } }),
    "anonymous-published-page",
  );
  expect(await publicPublished.json()).toHaveLength(1);
  const publicRevision = await expectOk(
    await request(
      `/rest/v1/cms_revisions?select=id,state&id=eq.${publishedPage.current_revision_id}&state=eq.published`,
      { headers: { apikey: publishableKey } },
    ),
    "anonymous-published-revision",
  );
  expect(await publicRevision.json()).toHaveLength(1);

  const [anonymousAudit, reviewerAudit, adminAudit] = await Promise.all([
    request(`/rest/v1/audit_logs?select=*&target_id=eq.${contentPage.id}`, {
      headers: { apikey: publishableKey },
    }),
    request(`/rest/v1/audit_logs?select=*&target_id=eq.${contentPage.id}`, {
      headers: reviewer.headers,
    }),
    request(
      `/rest/v1/audit_logs?select=action,before_digest,after_digest&target_id=eq.${contentPage.id}`,
      {
        headers: admin.headers,
      },
    ),
  ]);
  await expectDeniedOrEmpty(anonymousAudit);
  await expectDeniedOrEmpty(reviewerAudit);
  const auditRows = await adminAudit.json();
  expect(auditRows).toHaveLength(1);
  expect(auditRows[0]).toMatchObject({ action: "cms.publish" });
  expect(auditRows[0]).not.toHaveProperty("payload");

  const objectPath = randomUUID();
  storagePaths.push(objectPath);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await expectOk(
    await request(`/storage/v1/object/cms-private/${objectPath}`, {
      method: "POST",
      headers: { ...editor.headers, "content-type": "image/png", "x-upsert": "false" },
      body: png,
    }),
    "editor-private-upload",
  );
  const [anonymousPrivateList, unrelatedPrivateList, anonymousPrivateDownload, anonymousSignedUrl] =
    await Promise.all([
      request("/storage/v1/object/list/cms-private", {
        method: "POST",
        headers: { apikey: publishableKey, "content-type": "application/json" },
        body: JSON.stringify({ prefix: objectPath, limit: 1 }),
      }),
      request("/storage/v1/object/list/cms-private", {
        method: "POST",
        headers: unrelated.headers,
        body: JSON.stringify({ prefix: objectPath, limit: 1 }),
      }),
      request(`/storage/v1/object/authenticated/cms-private/${objectPath}`, {
        headers: { apikey: publishableKey },
      }),
      request(`/storage/v1/object/sign/cms-private/${objectPath}`, {
        method: "POST",
        headers: { apikey: publishableKey, "content-type": "application/json" },
        body: JSON.stringify({ expiresIn: 60 }),
      }),
    ]);
  const anonymousPrivateRows = anonymousPrivateList.ok ? await anonymousPrivateList.json() : [];
  const unrelatedPrivateRows = unrelatedPrivateList.ok ? await unrelatedPrivateList.json() : [];
  expect(anonymousPrivateRows).toHaveLength(0);
  expect(unrelatedPrivateRows).toHaveLength(0);
  expect(anonymousPrivateDownload.status).toBeGreaterThanOrEqual(400);
  expect(anonymousSignedUrl.status).toBeGreaterThanOrEqual(400);

  await expectOk(
    await request(`/storage/v1/object/cms-public/${objectPath}`, {
      method: "POST",
      headers: { ...admin.headers, "content-type": "image/png", "x-upsert": "false" },
      body: png,
    }),
    "authorized-public-derivative",
  );
  const publicObject = await request(`/storage/v1/object/authenticated/cms-public/${objectPath}`, {
    headers: { apikey: publishableKey },
  });
  expect(publicObject.status).toBeGreaterThanOrEqual(400);

  const assetKey = randomUUID();
  const mediaPage = await expectOk(
    await request("/rest/v1/cms_pages", {
      method: "POST",
      headers: { ...editor.headers, prefer: "return=representation" },
      body: JSON.stringify({
        stable_key: `media:${assetKey}`,
        translation_group_id: assetKey,
        locale: "en",
        slug: `media/${assetKey}`,
        author_id: editor.id,
        updated_by_id: editor.id,
      }),
    }),
    "create-media-page",
  );
  const mediaPageId = ((await mediaPage.json())[0] as { id: string }).id;
  pageIds.push(mediaPageId);
  const mediaMetadata = (fileId: string) => [
    {
      type: "media-metadata",
      assetKey,
      fileId,
      fileName: "synthetic.png",
      mimeType: "image/png",
      size: png.byteLength,
      altEn: "Synthetic media",
      altFr: "Média synthétique",
      ownerId: editor.id,
      usageReferences: [],
      consentState: "recorded",
      visibility: "published",
    },
  ];
  await expectOk(
    await request("/rest/v1/cms_revisions", {
      method: "POST",
      headers: { ...editor.headers, prefer: "return=minimal" },
      body: JSON.stringify({
        page_id: mediaPageId,
        revision_number: 1,
        state: "draft",
        title: "Synthetic media",
        blocks: mediaMetadata(objectPath),
        author_id: editor.id,
        change_summary: "synthetic media draft",
      }),
    }),
    "create-media-revision",
  );
  await signInCms(page, editor, "/en/admin/content/media");
  await expect(page).toHaveURL(/\/en\/admin\/content\/media$/);
  await expect(page.getByRole("heading", { name: "Media library" })).toBeVisible();
  expect((await page.context().cookies()).some(({ name }) => name.startsWith("sb-"))).toBe(true);
  const privateSource = await page.evaluate(async (key) => {
    const response = await fetch(`/api/cms/media/private/${key}`);
    return {
      status: response.status,
      cacheControl: response.headers.get("cache-control"),
      disposition: response.headers.get("content-disposition"),
      body: [...new Uint8Array(await response.arrayBuffer())],
    };
  }, assetKey);
  expect(privateSource.status).toBe(200);
  expect(privateSource.cacheControl).toContain("no-store");
  expect(privateSource.disposition).toContain("attachment");
  expect(privateSource.body).toEqual([...png]);
  for (const deniedUser of [reviewer, unrelated, disabled]) {
    await signInCms(page, deniedUser, "/en/admin/content/media");
    expect(
      await page.evaluate(
        async (key) => (await fetch(`/api/cms/media/private/${key}`)).status,
        assetKey,
      ),
    ).toBe(404);
  }
  await page.context().clearCookies();
  expect(
    await page.evaluate(
      async (key) => (await fetch(`/api/cms/media/private/${key}`)).status,
      assetKey,
    ),
  ).toBe(404);
  await signInCms(page, admin, "/en/admin/content/media");
  await expect(page).toHaveURL(/\/en\/admin\/content\/media$/);
  expect(
    await page.evaluate(
      async (key) => (await fetch(`/api/cms/media/private/${key}`)).status,
      assetKey,
    ),
  ).toBe(200);
  await expectOk(
    await request(`/rest/v1/cms_pages?id=eq.${mediaPageId}`, {
      method: "PATCH",
      headers: editor.headers,
      body: JSON.stringify({ state: "review", updated_by_id: editor.id }),
    }),
    "review-media",
  );
  await expectOk(
    await request("/rest/v1/rpc/publish_cms_page", {
      method: "POST",
      headers: admin.headers,
      body: JSON.stringify({ p_page_id: mediaPageId, p_change_summary: "publish media" }),
    }),
    "publish-media",
  );
  const delivered = await page.request.get(`/api/cms/media/${assetKey}`);
  expect(delivered.status()).toBe(200);
  expect(new Uint8Array(await delivered.body())).toEqual(png);

  const replacementPath = randomUUID();
  storagePaths.push(replacementPath);
  const replacement = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]);
  await expectOk(
    await request(`/storage/v1/object/cms-private/${replacementPath}`, {
      method: "POST",
      headers: { ...editor.headers, "content-type": "image/png", "x-upsert": "false" },
      body: replacement,
    }),
    "editor-replacement-upload",
  );
  await expectOk(
    await request(`/storage/v1/object/cms-public/${replacementPath}`, {
      method: "POST",
      headers: { ...admin.headers, "content-type": "image/png", "x-upsert": "false" },
      body: replacement,
    }),
    "authorized-replacement-derivative",
  );
  await expectOk(
    await request(`/rest/v1/cms_pages?id=eq.${mediaPageId}`, {
      method: "PATCH",
      headers: editor.headers,
      body: JSON.stringify({ state: "draft", current_revision_id: null, updated_by_id: editor.id }),
    }),
    "draft-media-replacement",
  );
  await expectOk(
    await request("/rest/v1/cms_revisions", {
      method: "POST",
      headers: { ...editor.headers, prefer: "return=minimal" },
      body: JSON.stringify({
        page_id: mediaPageId,
        revision_number: 3,
        state: "draft",
        title: "Synthetic media replacement",
        blocks: mediaMetadata(replacementPath),
        author_id: editor.id,
        change_summary: "synthetic media replacement",
      }),
    }),
    "create-replacement-revision",
  );
  await expectOk(
    await request(`/rest/v1/cms_pages?id=eq.${mediaPageId}`, {
      method: "PATCH",
      headers: editor.headers,
      body: JSON.stringify({ state: "review", updated_by_id: editor.id }),
    }),
    "review-media-replacement",
  );
  await expectOk(
    await request("/rest/v1/rpc/publish_cms_page", {
      method: "POST",
      headers: admin.headers,
      body: JSON.stringify({ p_page_id: mediaPageId, p_change_summary: "publish replacement" }),
    }),
    "publish-media-replacement",
  );
  const deliveredReplacement = await page.request.get(`/api/cms/media/${assetKey}`);
  expect(deliveredReplacement.status()).toBe(200);
  expect(new Uint8Array(await deliveredReplacement.body())).toEqual(replacement);
  await expectOk(
    await request("/storage/v1/object/cms-public", {
      method: "DELETE",
      headers: service,
      body: JSON.stringify({ prefixes: [objectPath] }),
    }),
    "remove-original-derivative",
  );
  await expectOk(
    await request(`/rest/v1/cms_pages?id=eq.${mediaPageId}`, {
      method: "PATCH",
      headers: admin.headers,
      body: JSON.stringify({ state: "draft", current_revision_id: null, updated_by_id: admin.id }),
    }),
    "unpublish-media",
  );
  await expectOk(
    await request("/storage/v1/object/cms-public", {
      method: "DELETE",
      headers: service,
      body: JSON.stringify({ prefixes: [replacementPath] }),
    }),
    "remove-replacement-derivative",
  );
  expect((await page.request.get(`/api/cms/media/${assetKey}`)).status()).toBe(404);

  const rollback = await expectOk(
    await request("/rest/v1/rpc/rollback_cms_page", {
      method: "POST",
      headers: admin.headers,
      body: JSON.stringify({ p_page_id: contentPage.id, p_revision_id: originalRevision.id }),
    }),
    "rollback",
  );
  expect((await rollback.json()) as { state: string }).toMatchObject({ state: "draft" });
  const afterRollback = await expectOk(
    await request(`${draftQuery}&state=eq.published`, { headers: { apikey: publishableKey } }),
    "anonymous-after-rollback",
  );
  expect(await afterRollback.json()).toHaveLength(0);

  await signInCms(page, editor);
  await expectOk(
    await request(`/rest/v1/user_roles?user_id=eq.${editor.id}&role=eq.cms-editor`, {
      method: "PATCH",
      headers: service,
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    }),
    "revoke-editor-role",
  );
  await page.goto("/en/admin/content");
  await expect(page).toHaveURL(/\/en\/admin\/content\/sign-in|\/en\/account-state/);
  await expectOk(
    await request(`/rest/v1/user_roles?user_id=eq.${editor.id}&role=eq.cms-editor`, {
      method: "PATCH",
      headers: service,
      body: JSON.stringify({ revoked_at: null }),
    }),
    "restore-editor-role",
  );
  await expectOk(
    await request(`/rest/v1/membership_history?user_id=eq.${editor.id}&effective_to=is.null`, {
      method: "PATCH",
      headers: service,
      body: JSON.stringify({ effective_to: new Date().toISOString() }),
    }),
    "expire-editor-membership",
  );
  await signInCms(page, editor);
  await page.goto("/en/admin/content");
  await expect(page).toHaveURL(/\/en\/admin\/content\/sign-in|\/en\/account-state/);
  await expectOk(
    await request(`/rest/v1/membership_history?user_id=eq.${editor.id}`, {
      method: "PATCH",
      headers: service,
      body: JSON.stringify({ effective_to: null }),
    }),
    "restore-editor-membership",
  );

  const mediaResponse = await page.request.get(`/api/cms/media/${randomUUID()}`);
  expect(mediaResponse.status()).toBe(404);
});
