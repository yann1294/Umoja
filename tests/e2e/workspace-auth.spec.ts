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
    `/design-system/workspace?view=${admin ? "admin" : "workspace"}&roles=${admin ? "admin" : "reviewer,project-manager"}&locale=${locale}&mfa=${admin ? "inactive" : "active"}`,
    {
      waitUntil: "networkidle",
    },
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByText("workspace-visual-fixture-with-an-unbroken-address@example.invalid"),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Governance|Gouvernance/ })).toHaveCount(0);
  if (!admin)
    await expect(page.getByRole("link", { name: /Operations|Opérations/ })).toHaveCount(0);
  if (
    admin &&
    (await page.getByRole("button", { name: /Open navigation|Ouvrir la navigation/ }).isVisible())
  ) {
    await page.getByRole("button", { name: /Open navigation|Ouvrir la navigation/ }).click();
    await expect(
      page.getByRole("dialog", { name: /Workspace navigation|Navigation de l’espace/ }),
    ).toBeVisible();
  }
  if (admin)
    await expect(page.getByRole("link", { name: /Operations|Opérations/ }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );
  if (
    admin &&
    (await page
      .getByRole("dialog", { name: /Workspace navigation|Navigation de l’espace/ })
      .isVisible())
  ) {
    await page.keyboard.press("Escape");
  }
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(
    page,
    ".workspace-topbar a:visible, .workspace-topbar button:visible, .workspace-sidebar a:visible, .workspace-sidebar button:visible",
  );

  if (screenshotProjects.has(testInfo.project.name)) {
    await expectDeterministicScreenshot(
      page,
      `${admin ? "admin" : "workspace"}-shell-${locale}.png`,
    );
  }
});

test("mobile drawer and account menu are accessible and private by default", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-390",
    "One narrow project verifies compact navigation.",
  );
  await page.goto(
    "/design-system/workspace?view=workspace&roles=reviewer,project-manager&locale=en&mfa=inactive",
    { waitUntil: "networkidle" },
  );
  const drawerTrigger = page.getByRole("button", { name: "Open navigation" });
  await drawerTrigger.click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(drawer).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeFocused();
  await expectDeterministicScreenshot(page, "workspace-mobile-navigation-en.png");
  await page.keyboard.press("Escape");
  await expect(drawerTrigger).toBeFocused();

  const accountTrigger = page.getByRole("button", { name: "Open account menu" });
  await accountTrigger.click();
  await expect(page.getByRole("dialog", { name: "Account and session" })).toBeVisible();
  await expect(
    page.getByText("workspace-visual-fixture-with-an-unbroken-address@example.invalid"),
  ).toBeVisible();
  await expectDeterministicScreenshot(page, "workspace-account-menu-en.png");
  await page.keyboard.press("Escape");
  await expect(accountTrigger).toBeFocused();
  await expectNoPageHorizontalOverflow(page);
});

test("permission, MFA, and multiple-role states remain concise", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-1280",
    "One desktop project verifies operational states.",
  );
  await page.goto(
    "/design-system/workspace?view=admin&roles=admin,cms-editor,reviewer,project-manager&locale=fr&mfa=inactive",
    { waitUntil: "networkidle" },
  );
  await expect(page.getByText("MFA à configurer", { exact: true })).toBeVisible();
  await expect(page.getByText("Limite de gouvernance", { exact: true })).toHaveCount(1);
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "admin-multiple-roles-mfa-fr.png");

  await page.goto("/design-system/workspace?state=permission&roles=reviewer&locale=en", {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: "You do not have access to this area" }),
  ).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "workspace-permission-denied-en.png");
});

test("loading and unavailable states preserve the authorized shell", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One desktop project verifies service states.");
  for (const state of ["loading", "error"] as const) {
    await page.goto(`/design-system/workspace?state=${state}&roles=reviewer&locale=fr`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation de l’espace" })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  }
});

test("auth and shell fixtures have no serious accessibility violations", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One desktop project runs the axe audit.");
  for (const path of [
    "/en/sign-in",
    "/design-system/workspace?role=admin&locale=en",
    "/design-system/workspace?state=error&roles=reviewer&locale=fr",
  ]) {
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

test("account menu announces stale-session refresh, offline state, and sign-out", async ({
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
  await page.goto("/design-system/workspace?view=admin&roles=admin&locale=en&session=stale", {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Open account menu" }).first().click();
  await page.getByRole("button", { name: "Check session" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Session refreshed." })).toBeAttached();

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);
});
