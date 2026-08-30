import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

test.describe.configure({ mode: "serial" });
test.use({ trace: "off", screenshot: "only-on-failure" });
const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
const api = (path: string, options: RequestInit = {}) =>
  fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}${path}`, options);
const run = randomUUID(),
  locale = process.env.PROFILE_LOCALE === "fr" ? "fr" : "en",
  password = `Umoja-${randomUUID()}-A9!`,
  applicantEmail = `profile-ui-applicant-${run}@example.test`,
  adminEmail = `profile-ui-admin-${run}@example.test`,
  service = {
    apikey: env.SUPABASE_SECRET_KEY,
    authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    "content-type": "application/json",
  };
let applicantId = "",
  adminId = "",
  adminHeaders: HeadersInit,
  applicantHeaders: HeadersInit,
  slug = `ui-profile-${locale}-${run}`;
async function create(email: string, role?: string) {
  const created = await api("/auth/v1/admin/users", {
    method: "POST",
    headers: service,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) throw new Error(`create:${created.status}`);
  const id = (await created.json()).id;
  if (role) {
    await api("/rest/v1/user_roles", {
      method: "POST",
      headers: service,
      body: JSON.stringify({ user_id: id, role }),
    });
    await api("/rest/v1/membership_history", {
      method: "POST",
      headers: service,
      body: JSON.stringify({ user_id: id, tier: "core", effective_from: new Date().toISOString() }),
    });
  }
  const token = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const access = (await token.json()).access_token;
  return {
    id,
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${access}`,
      "content-type": "application/json",
    },
  };
}
async function readOwnerProfile() {
  const response = await api(
    `/rest/v1/profiles?user_id=eq.${applicantId}&select=visibility,public_consent_at,publication_state`,
    {
      headers: applicantHeaders,
    },
  );
  if (!response.ok) throw new Error(`owner-read:${response.status}`);
  return (await response.json())[0] as
    { visibility: string; public_consent_at: string | null; publication_state: string } | undefined;
}
async function timedPublicFetch(path: string) {
  const controller = new AbortController();
  const started = performance.now();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`http://127.0.0.1:4173${path}`, { signal: controller.signal });
    const headersAt = performance.now();
    const body = await response.text();
    return {
      status: response.status,
      headersMs: headersAt - started,
      totalMs: performance.now() - started,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}
test.beforeAll(async () => {
  const applicant = await create(applicantEmail);
  applicantId = applicant.id;
  applicantHeaders = applicant.headers;
  const admin = await create(adminEmail, "admin");
  adminId = admin.id;
  adminHeaders = admin.headers;
});
test.afterAll(async () => {
  for (const id of [applicantId, adminId])
    await api(`/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: service,
      body: JSON.stringify({ should_soft_delete: false }),
    });
});

test("applicant can create, submit, receive review, and withdraw a public profile", async ({
  page,
  request,
  browser,
}) => {
  const labels =
    locale === "fr"
      ? {
          email: "Adresse courriel",
          password: "Mot de passe",
          name: "Nom professionnel",
          slug: "Slug public",
          country: "Pays ou région",
          bio: "Biographie publique",
          consent: "Je consens à demander une publication",
          submit: "Soumettre pour revue publique",
          save: "Enregistrer le profil",
          draft: "Brouillon privé",
          submitted: "submitted",
        }
      : {
          email: "Email address",
          password: "Password",
          name: "Professional name",
          slug: "Public slug",
          country: "Country or region",
          bio: "Public biography",
          consent: "I consent to request publication",
          submit: "Submit for public review",
          save: "Save profile",
          draft: "Private draft",
          submitted: "submitted",
        };
  await test.step("submission", async () => {
    await page.goto(`/${locale}/sign-in?next=%2F${locale}%2Fworkspace%2Fprofile`);
    await page.getByLabel(labels.email).fill(applicantEmail);
    await page.getByLabel(labels.password).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`**/${locale}/workspace/profile`);
    await page.getByLabel(labels.name).fill("Synthetic UI Applicant");
    await page.getByLabel(labels.slug).fill(slug);
    await page.getByLabel(labels.country).fill("KE");
    await page.getByLabel(labels.bio).fill("Synthetic browser biography");
    await page.getByLabel(labels.consent).check();
    await page.getByLabel(labels.submit).check();
    await page.getByRole("button", { name: labels.save }).click();
    await expect(page.getByRole("button", { name: labels.save })).toBeEnabled({ timeout: 15000 });
    await expect(page.getByText(labels.submitted)).toBeVisible({ timeout: 5000 });
  });
  await test.step("administrator sign-in and request changes", async () => {
    const adminContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`/${locale}/sign-in?next=%2F${locale}%2Fadmin%2Fprofiles`);
    await adminPage.getByLabel(labels.email).fill(adminEmail);
    await adminPage.getByLabel(labels.password).fill(password);
    await adminPage.getByRole("button", { name: "Sign in" }).click();
    await adminPage.waitForURL(`**/${locale}/admin/profiles`);
    const requestChanges = adminPage.locator("li").filter({ hasText: "Synthetic UI Applicant" });
    await requestChanges
      .getByRole("textbox", { name: /Applicant feedback|Retour pour le candidat/ })
      .fill("Please keep your public biography concise.");
    await requestChanges.getByRole("button", { name: "Request changes" }).click();
    await expect(adminPage.getByText("No profile requests are waiting for review.")).toBeVisible();
    await adminContext.close();
  });
  await test.step("applicant feedback and resubmission", async () => {
    await page.goto(`/${locale}/workspace/profile`);
    await expect(page.getByText("Please keep your public biography concise.")).toBeVisible();
    await page.getByLabel(labels.bio).fill("Synthetic browser biography revised");
    await page.getByLabel(labels.consent).check();
    await page.getByLabel(labels.submit).check();
    await page.getByRole("button", { name: labels.save }).click();
    await expect(page.getByRole("button", { name: labels.save })).toBeEnabled({ timeout: 15000 });
    await expect(page.getByText(labels.submitted)).toBeVisible({ timeout: 5000 });
  });
  await test.step("administrator approval and anonymous publication", async () => {
    const approveContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const approvePage = await approveContext.newPage();
    await approvePage.goto(`/${locale}/sign-in?next=%2F${locale}%2Fadmin%2Fprofiles`);
    await approvePage.getByLabel(labels.email).fill(adminEmail);
    await approvePage.getByLabel(labels.password).fill(password);
    await approvePage.getByRole("button", { name: "Sign in" }).click();
    await approvePage.waitForURL(`**/${locale}/admin/profiles`);
    const approveRequest = approvePage.locator("li").filter({ hasText: "Synthetic UI Applicant" });
    await approveRequest.getByRole("button", { name: "Approve" }).click();
    await expect(
      approvePage.getByText("No profile requests are waiting for review."),
    ).toBeVisible();
    await approveContext.close();
    const publicPage = await request.get(`/${locale}/talent/${slug}`);
    expect(publicPage.status()).toBe(200);
    expect(await publicPage.text()).toContain("Synthetic UI Applicant");
  });
  await test.step("withdrawal and anonymous removal", async () => {
    await page.goto(`/${locale}/workspace/profile`);
    await page.getByLabel(labels.draft).check();
    await page.getByRole("button", { name: labels.save }).click();
    await expect(page.getByLabel(labels.draft)).toBeChecked();
    await expect
      .poll(async () => (await readOwnerProfile())?.visibility, { timeout: 5000 })
      .toBe("private");
    const ownerState = await readOwnerProfile();
    expect(ownerState?.public_consent_at).toBeNull();
    const projection = await api(
      `/rest/v1/public_profiles?public_slug=eq.${slug}&select=public_slug`,
      {
        headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      },
    );
    expect(projection.ok).toBeTruthy();
    expect(await projection.json()).toEqual([]);
    const independent = await timedPublicFetch(`/${locale}/talent/${slug}`);
    expect(independent.status).toBe(404);
    expect(independent.body).not.toContain("Synthetic UI Applicant");
    const withdrawn = await request.get(`/${locale}/talent/${slug}`);
    const withdrawnBody = await withdrawn.text();
    expect(withdrawnBody).not.toContain("Synthetic UI Applicant");
  });
});
