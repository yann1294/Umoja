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

export async function expectMinimumTouchTargets(
  page: Page,
  selector = ".u-button, input, select, textarea",
): Promise<void> {
  const targets = page.locator(selector);
  const count = await targets.count();

  expect(count, `Expected touch targets matching ${selector}`).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const target = targets.nth(index);
    const box = await target.boundingBox();
    const description = await target.evaluate((element) => ({
      name: element.getAttribute("aria-label") ?? element.textContent?.trim(),
      tag: element.tagName.toLowerCase(),
    }));

    expect(box, `Touch target is not rendered: ${JSON.stringify(description)}`).not.toBeNull();
    expect(
      box?.width,
      `Touch target is narrower than 44px: ${JSON.stringify(description)}`,
    ).toBeGreaterThanOrEqual(44);
    expect(
      box?.height,
      `Touch target is shorter than 44px: ${JSON.stringify(description)}`,
    ).toBeGreaterThanOrEqual(44);
  }
}
