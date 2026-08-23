import { expect, test } from "@playwright/test";
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
