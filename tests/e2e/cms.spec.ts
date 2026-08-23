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

test("CMS index and editor inherit the authenticated shell across the viewport matrix", async ({
  page,
}, testInfo) => {
  const locale = ["width-390", "width-768", "width-1440", "phone-landscape"].includes(
    testInfo.project.name,
  )
    ? "fr"
    : "en";
  const editor = ["width-320", "width-768", "width-1440", "tablet-landscape"].includes(
    testInfo.project.name,
  );
  await page.goto(
    `/design-system/workspace?view=content&locale=${locale}&state=${editor ? "editor" : "list"}`,
    { waitUntil: "networkidle" },
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: locale === "fr" ? "Contenu public" : "Public content",
    }),
  ).toBeVisible();
  await expect(
    page.locator('a[aria-current="page"][href$="/admin/content"]').first(),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/@example\.invalid/)).toHaveCount(0);
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(
    page,
    ".workspace-topbar a:visible, .workspace-topbar button:visible, .workspace-sidebar a:visible, .workspace-sidebar button:visible, main button:visible, main a:visible, main input:visible, main select:visible",
  );
  if (screenshotProjects.has(testInfo.project.name))
    await expectDeterministicScreenshot(page, `cms-${editor ? "editor" : "index"}-${locale}.png`);
});

test("CMS route remains protected by direct URL", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One project verifies server protection.");
  await page.goto("/en/admin/content");
  await expect(page).toHaveURL(/\/en\/sign-in$/);
});

test("CMS fixture has no serious accessibility violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One desktop project runs the axe audit.");
  for (const path of [
    "/design-system/workspace?view=content&locale=en",
    "/design-system/workspace?view=content&locale=fr&state=editor",
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

test("CMS operational states remain explicit and responsive", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One desktop project records the state set.");
  for (const state of [
    "loading",
    "empty",
    "error",
    "validation",
    "preview",
    "revision",
    "media",
    "permission",
  ] as const) {
    const locale = ["empty", "validation", "media"].includes(state) ? "fr" : "en";
    await page.goto(`/design-system/workspace?view=content&locale=${locale}&state=${state}`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
    await expectDeterministicScreenshot(page, `cms-state-${state}-${locale}.png`);
  }
});
