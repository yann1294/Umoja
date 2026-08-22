import { expect, type Page } from "@playwright/test";

export async function expectNoPageHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    body: {
      clientWidth: document.body.clientWidth,
      scrollWidth: document.body.scrollWidth,
    },
    document: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    },
    viewportWidth: window.innerWidth,
  }));

  expect(
    dimensions.document.scrollWidth,
    `Document overflows horizontally: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.document.clientWidth);
  expect(
    dimensions.body.scrollWidth,
    `Body overflows horizontally: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth);
}

export async function expectDeterministicScreenshot(page: Page, name: string): Promise<void> {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (image) => (image.complete ? undefined : image.decode())),
    );
  });

  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
  });
}
