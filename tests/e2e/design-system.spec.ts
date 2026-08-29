import { expect, test } from "@playwright/test";

import {
  expectDeterministicScreenshot,
  expectMinimumTouchTargets,
  expectNoPageHorizontalOverflow,
} from "./helpers/visual";

test("renders tokens, primitives, and stress fixtures responsively", async ({ page }) => {
  await page.goto("/design-system", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "The Connected U, translated into interface foundations.",
    }),
  ).toBeVisible();

  for (const fixture of [
    "long-english",
    "long-french",
    "long-name",
    "loading",
    "empty",
    "error",
    "validation",
  ]) {
    await expect(page.locator(`[data-stress-fixture="${fixture}"]`)).toBeVisible();
  }

  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(page);
  await expectDeterministicScreenshot(page, "design-system-page.png");
});

test("exposes keyboard focus and honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-system", { waitUntil: "networkidle" });

  await page.keyboard.press("Tab");

  const focusStyle = await page.locator(":focus-visible").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });

  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(3);

  const spinnerAnimation = await page
    .locator(".u-button__spinner")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(spinnerAnimation).toBe("none");
});
