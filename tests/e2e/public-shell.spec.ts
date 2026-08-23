import { expect, test } from "@playwright/test";

import {
  expectDeterministicScreenshot,
  expectMinimumTouchTargets,
  expectNoPageHorizontalOverflow,
} from "./helpers/visual";

const publicSlugs = [
  "services",
  "work",
  "talent",
  "africit",
  "about",
  "start-a-project",
  "join",
] as const;

test("switches the current page between complete English and French shells", async ({ page }) => {
  await page.goto("/en", { waitUntil: "networkidle" });

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { level: 1, name: "African expertise. One trusted force." }),
  ).toBeVisible();
  await expect(page).toHaveTitle("African expertise. One trusted force.");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "From a real need to a stronger shared capability.",
    }),
  ).toBeVisible();
  await expect(page.locator('[data-content-state="empty"]')).toHaveCount(2);
  await expectNoTranslationKeys(page);
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(page, "a:visible, button:visible");
  await expectDeterministicScreenshot(page, "public-home-en.png");

  await page.getByRole("link", { name: "Language: Français" }).click();
  await expect(page).toHaveURL(/\/fr$/);
  await expect
    .poll(async () => {
      const localeCookie = (await page.context().cookies()).find(
        (cookie) => cookie.name === "umoja_locale",
      );
      return localeCookie?.value;
    })
    .toBe("fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(
    page.getByRole("heading", { level: 1, name: "L’expertise africaine. Une force unie." }),
  ).toBeVisible();
  await expect(page).toHaveTitle("L’expertise africaine. Une force unie.");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "D’un besoin réel à une capacité commune renforcée.",
    }),
  ).toBeVisible();
  await expectNoTranslationKeys(page);
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(page, "a:visible, button:visible");
  await expectDeterministicScreenshot(page, "public-home-fr.png");

  const menuButton = page.getByRole("button", { name: "Ouvrir le menu" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
    const dialog = page.getByRole("dialog", { name: "Navigation principale" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Démarrer un projet" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Rejoindre Umoja" })).toBeVisible();
    await expectMinimumTouchTargets(page, "dialog a:visible, dialog button:visible");
    await expect(dialog).toHaveScreenshot("public-mobile-navigation-fr.png", {
      animations: "disabled",
      caret: "hide",
    });
  }
});

test("uses a coherent landmark and heading hierarchy with resolving calls to action", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One project verifies document semantics.");
  await page.goto("/en", { waitUntil: "networkidle" });

  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator("footer")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);

  const levels = await page
    .locator("h1, h2, h3")
    .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
  expect(levels[0]).toBe(1);
  for (let index = 1; index < levels.length; index += 1) {
    expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1);
  }

  const mainLinks = await page
    .locator("main a[href]")
    .evaluateAll((links) => [
      ...new Set(links.map((link) => (link as HTMLAnchorElement).getAttribute("href"))),
    ]);
  expect(mainLinks).toEqual(
    expect.arrayContaining([
      "/en/start-a-project",
      "/en/join",
      "/en/services",
      "/en/work",
      "/en/talent",
      "/en/africit",
      "/en/about",
    ]),
  );
  for (const href of mainLinks) {
    expect(href).not.toBeNull();
    const response = await request.get(href!);
    expect(response.ok(), `${href} should resolve`).toBe(true);
  }

  await expectNoPageHorizontalOverflow(page);
});

test("contains long translated and loading-state fixtures without clipping", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-320",
    "The narrowest viewport carries the stress fixture.",
  );
  await page.goto("/fr", { waitUntil: "networkidle" });

  const unbroken = "interopérabilitétransfrontalièreaccessibilitédocumentationresponsable";
  await page.locator('[data-content-state="empty"]').evaluateAll((states, token) => {
    for (const state of states) {
      state.setAttribute("aria-busy", "true");
      state.setAttribute("data-content-state", "loading");
      const heading = state.querySelector("h3");
      const link = state.querySelector("a");
      if (heading) heading.textContent = `${heading.textContent} ${token}`;
      if (link)
        link.textContent = `${link.textContent} — libellé de chargement exceptionnellement long`;
    }
  }, unbroken);

  await expectNoPageHorizontalOverflow(page);
  const clipped = await page
    .locator('[data-content-state="loading"], main h2, main h3, main a')
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => ({
          text: element.textContent?.trim(),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        })),
    );
  expect(clipped).toEqual([]);
  await expectDeterministicScreenshot(page, "homepage-long-content-loading-fr.png");
});

test("keeps modal navigation keyboard-contained and restores focus", async ({ page }) => {
  await page.goto("/en", { waitUntil: "networkidle" });
  const menuButton = page.getByRole("button", { name: "Open menu" });

  if (await menuButton.isVisible()) {
    await menuButton.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Main navigation" });
    const closeButton = dialog.getByRole("button", { name: "Close menu" });

    await expect(dialog).toBeVisible();
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menuButton).toBeFocused();

    await menuButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: "About", exact: true }).click();
  } else {
    const navigation = page.getByRole("navigation", { name: "Main navigation" }).first();
    await navigation.getByRole("link", { name: "About", exact: true }).focus();
    await page.keyboard.press("Enter");
  }

  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A delivery collective built to strengthen shared capability.",
    }),
  ).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
});

test("serves every equivalent localized navigation route", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One project verifies the static route set.");

  for (const locale of ["en", "fr"] as const) {
    for (const slug of publicSlugs) {
      await page.goto(`/${locale}/${slug}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoTranslationKeys(page);
      await expectNoPageHorizontalOverflow(page);
    }
  }
});

async function expectNoTranslationKeys(page: import("@playwright/test").Page) {
  await expect(page.locator("body")).not.toContainText(/(?:Shell|Navigation|Home|Pages)\.[A-Za-z]/);
}
