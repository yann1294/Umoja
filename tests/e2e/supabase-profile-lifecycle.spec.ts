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
  slug = `ui-profile-${run}`;
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
}) => {
  await page.goto("/en/sign-in?next=%2Fen%2Fworkspace%2Fprofile");
  await page.getByLabel("Email address").fill(applicantEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/en/workspace/profile");
  await page.getByLabel("Professional name").fill("Synthetic UI Applicant");
  await page.getByLabel("Public slug").fill(slug);
  await page.getByLabel("Country or region").fill("KE");
  await page.getByLabel("Public biography").fill("Synthetic browser biography");
  await page.getByLabel("I consent to request publication").check();
  await page.getByLabel("Submit for public review").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("submitted")).toBeVisible();
  const moderation = await api("/rest/v1/rpc/moderate_profile", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      profile_user_id: applicantId,
      decision: "approved",
      expected_state: "submitted",
      feedback: "Please keep your public biography concise.",
    }),
  });
  expect(moderation.ok).toBeTruthy();
  const publicPage = await request.get(`/en/talent/${slug}`);
  expect(publicPage.status()).toBe(200);
  expect(await publicPage.text()).toContain("Synthetic UI Applicant");
  await page.goto("/en/workspace/profile");
  await page.getByLabel("Private draft").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByLabel("Private draft")).toBeChecked();
  const withdrawn = await request.get(`/en/talent/${slug}`);
  const withdrawnBody = await withdrawn.text();
  expect(withdrawnBody).not.toContain("Synthetic UI Applicant");
});
