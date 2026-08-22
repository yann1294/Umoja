import { expect, test, type Page } from "@playwright/test";

import {
  expectDeterministicScreenshot,
  expectMinimumTouchTargets,
  expectNoPageHorizontalOverflow,
} from "./helpers/visual";

test("keeps the bilingual talent form and long validation state usable across the viewport matrix", async ({
  page,
}) => {
  await page.goto("/fr/join", { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Apportez votre pratique, vos preuves et vos disponibilités.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Envoi simulé", { exact: false })).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  await expectControlsInsideViewport(page);
  await expectMinimumTouchTargets(
    page,
    "main input:visible, main select:visible, main textarea:visible, main button:visible",
  );
  await expectDeterministicScreenshot(page, "talent-intake-initial-fr.png");

  await page.getByLabel("E-mail privé").fill("adresse-invalide");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(
    page.getByText("Saisissez une adresse e-mail au format nom@exemple.com."),
  ).toBeVisible();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(4);
  await expectNoPageHorizontalOverflow(page);
  await expectControlsInsideViewport(page);
  await expectDeterministicScreenshot(page, "talent-intake-validation-fr.png");
});

test("validates, reviews, navigates backward, confirms, and submits project intake", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-1280",
    "One project exercises the complete project journey.",
  );
  await page.goto("/en/start-a-project", { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter this information before continuing.")).toBeVisible();
  await expect(
    page.getByText("Enter an email address in the format name@example.com."),
  ).toBeVisible();
  await page.getByLabel("Preferred contact name").fill("Amina Test");
  await page.getByLabel("Private email").fill("project-journey@example.com");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Organization name").fill("Illustrative organization");
  await page.getByLabel("Organization country or region").fill("Senegal");
  await page.getByLabel("Organization website (optional)").fill("https://example.com");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Preferred contact name")).toHaveValue("Amina Test");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Short project title").fill("Bilingual service platform");
  await page
    .getByLabel("Need, users, context, and constraints")
    .fill(
      "We need to understand, design, and deliver a bilingual public service for people using modest mobile devices.",
    );
  await page.getByLabel("Product engineering").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Indicative budget band").selectOption("Still defining");
  await page.getByLabel("Desired timing").selectOption("Within 1–3 months");
  await page.getByLabel("Target date (optional)").fill("2027-01-15");
  await page.getByLabel("Supporting files (optional)").setInputFiles({
    name: "illustrative-brief.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("mock metadata only"),
  });
  await page.getByLabel(/I consent to Umoja using this project information/).check();
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText("illustrative-brief.pdf")).toBeVisible();
  await expectDeterministicScreenshot(page, "project-intake-review-en.png");

  const submit = page.getByRole("button", { name: "Submit to the mock adapter" });
  await submit.click();
  const dialog = page.getByRole("dialog", { name: "Send this mock submission?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Confirm mock submission" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(submit).toBeFocused();
  await submit.click();
  await dialog.getByRole("button", { name: "Confirm mock submission" }).click();
  await expect(dialog.getByRole("button", { name: "Submitting…" })).toBeDisabled();
  const success = page.locator('[data-submission-state="success"]');
  await expect(success).toBeVisible();
  await expect(
    success.getByText("your information is not persisted", { exact: false }),
  ).toBeVisible();
  await expectDeterministicScreenshot(page, "project-intake-success-en.png");
});

test("submits talent with optional public visibility left unchecked", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One project verifies consent separation.");
  await page.goto("/en/join", { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);
  await page.getByLabel("Preferred or public professional name").fill("Kofi Test");
  await page.getByLabel("Private email").fill("talent-journey@example.com");
  await page.getByLabel("Country or region").fill("Ghana");
  await page.getByLabel("Timezone").fill("Africa/Accra");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Software engineering").check();
  await page.getByLabel("Experience band").selectOption("Independent contributor");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Portfolio item title").fill("Illustrative delivery portfolio");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Weekly capacity").selectOption("11–20 hours");
  await page.getByLabel("Preferred work mode").selectOption("Remote");
  await page.getByLabel("English").check();
  await page.getByRole("button", { name: "Continue" }).click();
  const publicConsent = page.getByLabel(/optionally consent to a limited public profile/);
  await expect(publicConsent).not.toBeChecked();
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText("Confirm this consent to submit the form.")).toHaveCount(2);
  const dataConsent = page.getByLabel(/processing of the application information/);
  const applicationConsent = page.getByLabel(/submit this private application/);
  await dataConsent.check();
  await expect(dataConsent).toBeChecked();
  await applicationConsent.check();
  await expect(applicationConsent).toBeChecked();
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText("No", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Submit to the mock adapter" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm mock submission" }).click();
  await expect(page.locator('[data-submission-state="success"]')).toBeVisible();
});

test("preserves contact entries through network and duplicate responses", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One project verifies mock response states.");
  const email = "contact-journey@example.com";
  await page.goto("/en/contact", { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);
  await fillContact(page, email);
  await page.route("**/api/intake/contact", (route) => route.abort());
  await confirmContact(page);
  await expect(page.locator('[data-submission-state="network"]')).toBeVisible();
  await page.unroute("**/api/intake/contact");
  await page.getByRole("button", { name: "Return to the form" }).click();
  await confirmContact(page);
  await expect(page.locator('[data-submission-state="success"]')).toBeVisible();

  await page.goto("/en/contact", { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);
  await fillContact(page, email);
  await confirmContact(page);
  await expect(page.locator('[data-submission-state="duplicate"]')).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  await expectDeterministicScreenshot(page, "contact-intake-duplicate-en.png");
});

async function fillContact(page: Page, email: string) {
  await page.getByLabel("Preferred name").fill("Contact Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Subject").fill("A clear question");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("This message contains enough context for a responsible reply.");
  await page.getByLabel(/consent to Umoja using these details/).check();
  await page.getByRole("button", { name: "Review" }).click();
}

async function confirmContact(page: Page) {
  await page.getByRole("button", { name: "Submit to the mock adapter" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm mock submission" }).click();
}

async function expectControlsInsideViewport(page: Page) {
  const clipped = await page
    .locator("main input:visible, main select:visible, main textarea:visible, main button:visible")
    .evaluateAll((controls) =>
      controls
        .map((control) => ({
          box: control.getBoundingClientRect().toJSON(),
          name: control.getAttribute("aria-label") ?? control.id ?? control.textContent,
        }))
        .filter(({ box }) => box.left < -1 || box.right > window.innerWidth + 1),
    );
  expect(clipped).toEqual([]);
}

async function hideOffscreenSkipLinkForCapture(page: Page) {
  await page.addStyleTag({
    content: 'a[href="#main-content"]:not(:focus) { visibility: hidden !important; }',
  });
}
