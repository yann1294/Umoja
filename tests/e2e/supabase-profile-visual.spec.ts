import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { expectMinimumTouchTargets, expectNoPageHorizontalOverflow } from "./helpers/visual";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

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
const run = randomUUID();
const password = `Umoja-${randomUUID()}-A9!`;
const applicantEmail = `profile-visual-applicant-${run}@example.test`;
const adminEmail = `profile-visual-admin-${run}@example.test`;
const service = {
  apikey: env.SUPABASE_SECRET_KEY,
  authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  "content-type": "application/json",
};
let applicantId = "";
let adminId = "";

async function createUser(email: string, role?: string) {
  const created = await api("/auth/v1/admin/users", {
    method: "POST",
    headers: service,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) throw new Error(`create:${created.status}`);
  const id = (await created.json()).id as string;
  if (role) {
    for (const [path, body] of [
      ["/rest/v1/user_roles", { user_id: id, role }],
      [
        "/rest/v1/membership_history",
        { user_id: id, tier: "core", effective_from: new Date().toISOString() },
      ],
    ] as const) {
      const response = await api(path, {
        method: "POST",
        headers: service,
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`seed:${path}:${response.status}`);
    }
  }
  const token = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const accessToken = (await token.json()).access_token as string;
  return {
    id,
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  };
}

async function signIn(page: Page, locale: "en" | "fr", email: string, next: string) {
  await page.goto(`/${locale}/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel(locale === "fr" ? "Adresse courriel" : "Email address").fill(email);
  await page.getByLabel(locale === "fr" ? "Mot de passe" : "Password").fill(password);
  await page.getByRole("button", { name: locale === "fr" ? "Se connecter" : "Sign in" }).click();
  await page.waitForURL(`**${next}`);
}

test.beforeAll(async () => {
  const applicant = await createUser(applicantEmail);
  applicantId = applicant.id;
  const admin = await createUser(adminEmail, "admin");
  adminId = admin.id;
  const slug = `visual-${run}`;
  const profile = await api("/rest/v1/rpc/save_profile_with_audit", {
    method: "POST",
    headers: applicant.headers,
    body: JSON.stringify({
      profile_user_id: applicant.id,
      professional_name: "A very long synthetic contributor name for responsive review",
      profile_locale: "en",
      profile_country: "KE",
      profile_bio:
        "A long bilingual fixture biography with enough text to exercise wrapping, validation spacing and readable line length across every required viewport.",
      profile_slug: slug,
      profile_visibility: "public",
      requested_state: "submitted",
      consent_given: true,
      private_envelope: "synthetic-encrypted-fixture",
      private_key_version: "v1",
    }),
  });
  if (!profile.ok) throw new Error(`profile:${profile.status}`);
  const skills = await api("/rest/v1/skills?select=id&archived_at=is.null&limit=2", {
    headers: applicant.headers,
  });
  const skillRows = (await skills.json()) as Array<{ id: string }>;
  if (skillRows[0])
    await api("/rest/v1/profile_skills", {
      method: "POST",
      headers: applicant.headers,
      body: JSON.stringify({
        profile_id: applicant.id,
        skill_id: skillRows[0].id,
        level: 5,
        years_experience: 12,
      }),
    });
  const languages = await api("/rest/v1/languages?select=code&limit=2", {
    headers: applicant.headers,
  });
  const languageRows = (await languages.json()) as Array<{ code: string }>;
  if (languageRows[0])
    await api("/rest/v1/profile_languages", {
      method: "POST",
      headers: applicant.headers,
      body: JSON.stringify({
        profile_id: applicant.id,
        language_code: languageRows[0].code,
        proficiency: "fluent",
      }),
    });
  await api("/rest/v1/portfolio_items", {
    method: "POST",
    headers: applicant.headers,
    body: JSON.stringify({
      profile_id: applicant.id,
      title: "A long synthetic portfolio title for layout review",
      role_summary:
        "A long project role summary that exercises wrapping and readable forms without containing real personal data.",
      external_url: "https://example.test/synthetic",
    }),
  });
  await api("/rest/v1/availability_snapshots", {
    method: "POST",
    headers: applicant.headers,
    body: JSON.stringify({
      profile_id: applicant.id,
      weekly_hours: 32,
      next_available_on: "2099-01-01",
      work_mode: "remote",
      expires_at: "2099-02-01T00:00:00Z",
    }),
  });
});

test.afterAll(async () => {
  for (const id of [applicantId, adminId])
    if (id) await api(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: service });
});

test("authenticated profile and moderation fixtures remain usable across the required matrix", async ({
  page,
}, testInfo) => {
  const locale = ["width-390", "width-768", "width-1440", "phone-landscape"].includes(
    testInfo.project.name,
  )
    ? "fr"
    : "en";
  const admin = ["width-390", "width-1024", "width-1920", "tablet-landscape"].includes(
    testInfo.project.name,
  );
  const next = admin ? `/${locale}/admin/profiles` : `/${locale}/workspace/profile`;
  await signIn(page, locale, admin ? adminEmail : applicantEmail, next);
  if (admin) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      locale === "fr" ? "Demandes de profil public" : "Public profile requests",
    );
    await expect(
      page.getByText("A very long synthetic contributor name for responsive review"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve|Approuver/ }).first()).toBeVisible();
  } else {
    for (const route of ["profile", "skills", "portfolio", "availability"] as const) {
      await page.goto(`/${locale}/workspace/${route}`);
      await expect(page.locator("#workspace-main")).toBeVisible();
      await expectNoPageHorizontalOverflow(page);
      await expectMinimumTouchTargets(
        page,
        'main button:visible, main input:visible:not([type="checkbox"]):not([type="radio"]), main select:visible, main textarea:visible',
      );
      await page.screenshot({
        path: testInfo.outputPath(`prompt12-${locale}-${route}-${testInfo.project.name}.png`),
        fullPage: true,
      });
    }
    await page.getByRole("textbox").first().focus();
    await expect(page.locator(":focus-visible")).toHaveCount(1);
  }
  await page.addScriptTag({ content: axe.source });
  const axeResults = await page.evaluate(async () => {
    const result = await (
      window as typeof window & {
        axe: { run: (root: Document) => Promise<{ violations: unknown[] }> };
      }
    ).axe.run(document);
    return result.violations;
  });
  expect(axeResults, JSON.stringify(axeResults)).toEqual([]);
  await expectNoPageHorizontalOverflow(page);
});
