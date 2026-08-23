import { expect, test } from "@playwright/test";
import axe from "axe-core";
import {
  expectDeterministicScreenshot,
  expectMinimumTouchTargets,
  expectNoPageHorizontalOverflow,
} from "./helpers/visual";

const screenshotProjects = new Set([
  "width-320",
  "width-390",
  "width-768",
  "width-1024",
  "width-1440",
  "width-1920",
]);

test("invite-only sign-in is accessible across the responsive matrix", async ({
  page,
}, testInfo) => {
  const locale = ["width-390", "width-1024", "width-1920"].includes(testInfo.project.name)
    ? "fr"
    : "en";
  await page.goto(`/${locale}/sign-in`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    locale === "fr" ? "Connexion à Umoja" : "Sign in to Umoja",
  );
  await expect(
    page.getByText(locale === "fr" ? /uniquement sur invitation/ : /invitation only/),
  ).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveAttribute("autocomplete", "email");
  await expect(page.locator('input[name="password"]')).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(
    page,
    "main input:visible, main button:visible, header a:visible, header button:visible",
  );
  if (screenshotProjects.has(testInfo.project.name)) {
    await expectDeterministicScreenshot(page, `workspace-sign-in-${locale}.png`);
  }
});

test("workspace route is protected on the server", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-1280",
    "A single project verifies the server redirect.",
  );
  await page.goto("/en/workspace");
  await expect(page).toHaveURL(/\/en\/sign-in$/);
});

test("admin route is protected on the server", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-1280",
    "A single project verifies the server redirect.",
  );
  await page.goto("/en/admin");
  await expect(page).toHaveURL(/\/en\/sign-in$/);
});

test("there is no public account registration route", async ({ request }, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-1280",
    "A single project verifies invite-only routing.",
  );
  const response = await request.post("/api/auth/sign-up", {
    data: { email: "person@example.com", password: "not-a-real-password" },
  });
  expect(response.status()).toBe(404);
});

test("recovery remains private and responsive", async ({ page }, testInfo) => {
  const locale = ["width-360", "width-1024", "wide-2560"].includes(testInfo.project.name)
    ? "fr"
    : "en";
  await page.goto(`/${locale}/forgot-password`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    locale === "fr" ? "Récupérer l’accès" : "Recover access",
  );
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(
    page,
    "main input:visible, main button:visible, header a:visible",
  );
});

test("role-aware workspace and admin fixtures are responsive", async ({ page }, testInfo) => {
  const admin = ["width-390", "width-1024", "width-1920", "tablet-landscape"].includes(
    testInfo.project.name,
  );
  const locale = ["width-390", "width-768", "width-1440", "phone-landscape"].includes(
    testInfo.project.name,
  )
    ? "fr"
    : "en";
  await page.goto(
    `/design-system/workspace?role=${admin ? "admin" : "reviewer"}&locale=${locale}`,
    {
      waitUntil: "networkidle",
    },
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const mobileNavigation = page.locator(".workspace-mobile-navigation");
  if (await mobileNavigation.isVisible()) {
    await mobileNavigation.locator("summary").click();
  }
  await expect(page.locator(".workspace-nav-locked:visible").first()).toContainText(
    /Governance|Gouvernance/,
  );
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(
    page,
    ".workspace-topbar a:visible, .workspace-topbar button:visible, .workspace-mobile-navigation summary:visible, .workspace-mobile-navigation a:visible, .workspace-rail a:visible",
  );

  if (screenshotProjects.has(testInfo.project.name)) {
    await expectDeterministicScreenshot(
      page,
      `${admin ? "admin" : "workspace"}-shell-${locale}.png`,
    );
  }
});

test("auth and shell fixtures have no serious accessibility violations", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One desktop project runs the axe audit.");
  for (const path of ["/en/sign-in", "/design-system/workspace?role=admin&locale=en"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () => {
      const result = await (
        window as typeof window & {
          axe: {
            run: (
              context: Document,
            ) => Promise<{ violations: Array<{ impact: string | null; id: string }> }>;
          };
        }
      ).axe.run(document);
      return result.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      );
    });
    expect(violations).toEqual([]);
  }
});

test("session controls announce refresh, offline state, and sign-out", async ({
  context,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One project verifies session controls.");
  await page.route("**/api/auth/session/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"reason":"allowed"}',
    });
  });
  await page.route("**/api/auth/sign-out", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' });
  });
  await page.goto("/design-system/workspace?role=admin&locale=en", {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Refresh session" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Session refreshed." })).toBeAttached();

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);
});
