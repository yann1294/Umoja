import { expect, test } from "@playwright/test";

import {
  expectDeterministicScreenshot,
  expectMinimumTouchTargets,
  expectNoPageHorizontalOverflow,
} from "./helpers/visual";

const routes = [
  "services",
  "services/product-engineering",
  "services/data-ai",
  "services/design-brand",
  "services/cloud-enterprise",
  "services/digital-growth",
  "work",
  "work/illustrative-delivery-template",
  "talent",
  "talent/illustrative-public-profile",
  "organizations",
  "africit",
  "africit/workshops",
  "africit/research",
  "africit/resources",
  "about",
  "about/model",
  "about/governance",
  "about/manifesto",
] as const;

test("renders representative bilingual content and empty states across the viewport matrix", async ({
  page,
}) => {
  await page.goto("/fr/services", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Services" })).toBeVisible();
  await expect(page.locator('main a[href^="/fr/services/"]')).toHaveCount(5);
  await expectNoPageHorizontalOverflow(page);
  await expectMinimumTouchTargets(page, "main a:visible");
  await expectDeterministicScreenshot(page, "services-fr.png");

  await page.goto("/en/work", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-content-state="empty"]')).toHaveCount(1);
  await expect(page.getByText("No verified case studies are published yet.")).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "work-empty-en.png");
});

test("serves every public content route in both locales with metadata", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-1280",
    "One project verifies the complete static route set.",
  );
  for (const locale of ["en", "fr"] as const) {
    for (const route of routes) {
      const response = await page.goto(`/${locale}/${route}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `/${locale}/${route}`).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/.+ \| Umoja$/);
      await expectNoPageHorizontalOverflow(page);
      await expect(page.locator("body")).not.toContainText(/PublicContent\.[A-Za-z]/);
    }
  }
});

test("localizes missing public content without exposing a generic template", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One project verifies not-found handling.");
  const response = await page.goto("/fr/services/inconnue", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Cette page publique n’est pas disponible." }),
  ).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
});

test("renders illustrative templates and institutional content without real-world claims", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-1280",
    "One desktop project records detail templates.",
  );

  await page.goto("/en/work/illustrative-delivery-template", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Illustrative case-study template")).toBeVisible();
  await expect(page.getByText("No result is claimed here.", { exact: false })).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "case-study-template-en.png");

  await page.goto("/fr/talent/illustrative-public-profile", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Ceci n’est pas une personne réelle.", { exact: false }),
  ).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "public-profile-template-fr.png");

  await page.goto("/en/about/model", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "One project, many modules, only the context each role needs.",
    }),
  ).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "umoja-model-en.png");
});

test("contains long bilingual loading and error fixtures at the narrowest width", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-320",
    "The narrowest viewport carries state stress fixtures.",
  );
  await page.goto("/fr/work", { waitUntil: "domcontentloaded" });
  const state = page.locator("[data-content-state]");
  await state.evaluate((element) => {
    element.setAttribute("data-state", "loading");
    element.setAttribute("data-content-state", "loading");
    element.setAttribute("aria-busy", "true");
    const heading = element.querySelector("h2");
    const paragraph = element.querySelector("p");
    if (heading)
      heading.textContent = "Chargement d’un dossier public bilingue exceptionnellement détaillé";
    if (paragraph)
      paragraph.textContent =
        "interopérabilitétransfrontalièreaccessibilitédocumentationresponsable";
  });
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "public-content-loading-long-fr.png");

  await state.evaluate((element) => {
    element.setAttribute("data-state", "error");
    element.setAttribute("data-content-state", "error");
    element.setAttribute("aria-busy", "false");
  });
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "public-content-error-long-fr.png");
});
