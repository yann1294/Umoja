import { expect, test } from "@playwright/test";

import { expectDeterministicScreenshot, expectNoPageHorizontalOverflow } from "./helpers/visual";

test("renders the placeholder without overflow or visual regressions", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "African expertise. One trusted force.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Umoja" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Platform foundation in progress");

  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "placeholder-page.png");
});
