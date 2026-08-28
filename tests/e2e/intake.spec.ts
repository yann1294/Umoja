import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";

import {
  expectDeterministicScreenshot,
  expectMinimumTouchTargets,
  expectNoPageHorizontalOverflow,
} from "./helpers/visual";

const INTAKE_SCREENSHOT_PROJECTS = new Set([
  "width-320",
  "width-390",
  "width-768",
  "width-1024",
  "width-1440",
  "width-1920",
]);

test("keeps both intake journeys usable across the full viewport and orientation matrix", async ({
  page,
}) => {
  await page.goto("/en/start-a-project", { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tell us about your project." }),
  ).toBeVisible();
  await expectJourneySeparation(page);
  await expectResponsiveProgress(page);
  await expectNoPageHorizontalOverflow(page);
  await expectControlsInsideViewport(page);
  await expectNoSeriousAccessibilityViolations(page);

  await page.goto("/fr/join", { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Candidatez pour contribuer avec Umoja.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Cette candidature privée reste distincte", { exact: false }),
  ).toBeVisible();
  await expectJourneySeparation(page);
  await expectResponsiveProgress(page);
  await expectNoPageHorizontalOverflow(page);
  await expectControlsInsideViewport(page);
  await expectMinimumTouchTargets(
    page,
    "main input:visible, main select:visible, main textarea:visible, main button:visible",
  );
  await expectDeterministicScreenshot(page, "talent-intake-initial-fr.png", 0.0025);

  await page.getByLabel("E-mail privé").fill("adresse-invalide");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Vérifiez les informations signalées" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nom professionnel préféré ou public")).toBeFocused();
  await expect(page.locator("#talent-email-error")).toBeVisible();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(4);
  await expectNoPageHorizontalOverflow(page);
  await expectControlsInsideViewport(page);
  await expectDeterministicScreenshot(page, "talent-intake-validation-fr.png", 0.0025);
  await expectNoSeriousAccessibilityViolations(page);
});

test("captures project intake task states in English and French at the required visual widths", async ({
  page,
}, testInfo) => {
  test.skip(
    !INTAKE_SCREENSHOT_PROJECTS.has(testInfo.project.name),
    "The six required visual widths carry the detailed intake captures.",
  );
  const french = ["width-320", "width-768", "width-1440"].includes(testInfo.project.name);
  const locale = french ? "fr" : "en";
  const t = intakeLabels(locale);
  await page.goto(`/${locale}/start-a-project`, { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);
  await captureIntakeState(page, `project-first-${locale}.png`);

  await page.getByRole("button", { name: t.continue, exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: t.errorSummary })).toBeVisible();
  await expect(page.getByLabel(t.projectName)).toBeFocused();
  await captureIntakeState(page, `project-validation-${locale}.png`);

  await page.getByLabel(t.projectName).fill("Amina N’Diaye-Kouyaté");
  await page.getByLabel(t.projectEmail).fill("project-visual@example.com");
  await page.getByRole("button", { name: t.continue, exact: true }).click();
  await page.getByLabel(t.organization).fill("Illustrative regional cooperative");
  await page.getByLabel(t.organizationCountry).fill("Senegal / Sénégal");
  await page.getByRole("button", { name: t.continue, exact: true }).click();
  await captureIntakeState(page, `project-middle-${locale}.png`);

  await page.getByLabel(t.projectTitle).fill("Accessible bilingual public-service platform");
  await page.getByLabel(t.projectDescription).fill(t.projectDescriptionValue);
  await page.getByLabel(t.projectService).check();
  await page.getByRole("button", { name: t.continue, exact: true }).click();
  await page.getByLabel(t.budget).selectOption({ index: 1 });
  await page.getByLabel(t.timing).selectOption({ index: 1 });
  await page.getByLabel(t.projectConsent).check();
  await page.getByRole("button", { name: t.review, exact: true }).click();
  await expect(page.getByRole("button", { name: new RegExp(`^${t.edit}`) }).first()).toBeVisible();
  await captureIntakeState(page, `project-review-${locale}.png`);
});

test("captures talent intake identity, practice, portfolio, consent, and review states", async ({
  page,
}, testInfo) => {
  test.skip(
    !INTAKE_SCREENSHOT_PROJECTS.has(testInfo.project.name),
    "The six required visual widths carry the detailed intake captures.",
  );
  const french = !["width-320", "width-768", "width-1440"].includes(testInfo.project.name);
  const locale = french ? "fr" : "en";
  const t = intakeLabels(locale);
  await page.goto(`/${locale}/join`, { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);
  await captureIntakeState(page, `talent-first-${locale}.png`);

  await page.getByLabel(t.talentName).fill("Jean-Baptiste N’Guessan-Mukamana");
  await page.getByLabel(t.talentEmail).fill("talent-visual@example.com");
  await page.getByLabel(t.talentCountry).fill("Côte d’Ivoire / Rwanda");
  await page.getByLabel(t.timezone).fill("Africa/Abidjan");
  await page.getByRole("button", { name: t.continue, exact: true }).click();
  await page.getByLabel(t.skill).check();
  await page.getByLabel(t.experience).selectOption({ index: 2 });
  await captureIntakeState(page, `talent-skills-${locale}.png`);

  await page.getByRole("button", { name: t.continue, exact: true }).click();
  await page.getByLabel(t.portfolioTitle).fill("Public-interest delivery work");
  await page.getByLabel(t.portfolioUrl).fill(`https://example.com/evidence/${"a".repeat(96)}`);
  await page.getByRole("button", { name: t.addPortfolio, exact: true }).click();
  await page.getByLabel(t.portfolioTitle).nth(1).fill("Community research archive");
  await captureIntakeState(page, `talent-portfolio-${locale}.png`);
  await page.getByRole("button", { name: t.continue, exact: true }).click();

  await page.getByLabel(t.weekly).selectOption({ index: 2 });
  await page.getByLabel(t.workMode).selectOption({ index: 1 });
  await page.getByLabel(t.language).check();
  await page.getByRole("button", { name: t.continue, exact: true }).click();
  await expect(page.getByLabel(t.publicConsent)).not.toBeChecked();
  await captureIntakeState(page, `talent-consent-${locale}.png`);
  await page.getByLabel(t.applicationConsent).check();
  await page.getByLabel(t.dataConsent).check();
  await page.getByRole("button", { name: t.review, exact: true }).click();
  await captureIntakeState(page, `talent-review-${locale}.png`);
});

test("validates, reviews, navigates backward, confirms, and submits project intake", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "width-1280",
    "One project exercises the complete project journey.",
  );
  let releaseSubmission!: () => void;
  const submissionReleased = new Promise<void>((resolve) => {
    releaseSubmission = resolve;
  });
  let submissionAttempts = 0;
  await page.route("**/api/intake/project", async (route) => {
    submissionAttempts += 1;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataBuffer()?.byteLength ?? 0).toBeGreaterThan(0);
    if (submissionAttempts === 1) {
      await route.abort("internetdisconnected");
      return;
    }
    await submissionReleased;
    await route.fulfill({
      body: JSON.stringify({
        persisted: true,
        reference: "UP-SYNTHETIC01",
        status: "success",
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.goto("/en/start-a-project", { waitUntil: "domcontentloaded" });
  await hideOffscreenSkipLinkForCapture(page);

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#project-name-error")).toHaveText(
    "Enter this information before continuing.",
  );
  await expect(page.locator("#project-email-error")).toHaveText(
    "Enter an email address in the format name@example.com.",
  );
  await expect(page.getByLabel("Preferred contact name")).toBeFocused();
  await page.getByLabel("Preferred contact name").fill("Amina Test");
  await page.getByLabel("Private email").fill("project-journey@example.com");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Organization name").fill("Illustrative organization");
  await page.getByLabel("Organization country or region").fill("Senegal");
  await page.getByLabel("Organization website (optional)").fill("https://example.com");
  await page.getByRole("button", { name: /Return to Contact\. Completed/ }).click();
  await expect(page.getByLabel("Preferred contact name")).toHaveValue("Amina Test");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Organization name")).toHaveValue("Illustrative organization");
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
    buffer: Buffer.from("%PDF-1.7\nSynthetic browser fixture only.\n"),
  });
  await page.getByLabel(/I consent to Umoja using this project information/).check();
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText("illustrative-brief.pdf")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await expectDeterministicScreenshot(page, "project-intake-review-en.png");

  const submit = page.getByRole("button", { name: "Submit securely" });
  await submit.click();
  const dialog = page.getByRole("dialog", { name: "Send this submission?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Confirm submission" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(submit).toBeFocused();
  await submit.click();
  await dialog.getByRole("button", { name: "Confirm submission" }).click();
  await expect(page.locator('[data-submission-state="network"]')).toBeVisible();
  await page.getByRole("button", { name: "Return to the form" }).click();
  await page.getByRole("button", { name: "Submit securely" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm submission" }).click();
  await expect(dialog.getByRole("button", { name: "Submitting…" })).toBeDisabled();
  releaseSubmission();
  const success = page.locator('[data-submission-state="success"]');
  await expect(success).toBeVisible();
  await expect(
    success.getByText("Your submission is stored securely", { exact: false }),
  ).toBeVisible();
  await expectDeterministicScreenshot(page, "project-intake-success-en.png");
});

test("submits talent with optional public visibility left unchecked", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "width-1280", "One project verifies consent separation.");
  await page.route("**/api/intake/talent", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataBuffer()?.byteLength ?? 0).toBeGreaterThan(0);
    await route.fulfill({
      body: JSON.stringify({
        persisted: true,
        status: "duplicate",
      }),
      contentType: "application/json",
      status: 200,
    });
  });
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
  await expect(page.locator(".u-field__error")).toHaveCount(2);
  const dataConsent = page.getByLabel(/processing of the application information/);
  const applicationConsent = page.getByLabel(/submit this private application/);
  await dataConsent.check();
  await expect(dataConsent).toBeChecked();
  await applicationConsent.check();
  await expect(applicationConsent).toBeChecked();
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText("No", { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole("button", { name: "Submit securely" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm submission" }).click();
  await expect(page.locator('[data-submission-state="duplicate"]')).toBeVisible();
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

async function captureIntakeState(page: Page, name: string) {
  await expectNoPageHorizontalOverflow(page);
  await expectControlsInsideViewport(page);
  await expectFormSemantics(page);
  await expectMinimumTouchTargets(
    page,
    "main input:visible, main select:visible, main textarea:visible, main button:visible",
  );
  await expectDeterministicScreenshot(page, name, 0.0025);
}

async function expectFormSemantics(page: Page) {
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main form[aria-labelledby='journey-step-title']")).toHaveCount(1);
  await expect(page.locator("main form > fieldset")).toHaveCount(1);
  const unnamed = await page
    .locator("main input:visible, main select:visible, main textarea:visible")
    .evaluateAll((controls) =>
      controls
        .filter((control) => !(control instanceof HTMLInputElement && control.type === "hidden"))
        .filter(
          (control) =>
            !(control as HTMLInputElement).labels?.length && !control.getAttribute("aria-label"),
        )
        .map((control) => control.id || control.tagName),
    );
  expect(unnamed, "Every form control needs an accessible name").toEqual([]);
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    type AxeResult = {
      violations: Array<{
        id: string;
        impact: string | null;
        nodes: Array<{ target: string[] }>;
      }>;
    };
    const axeApi = (
      window as typeof window & {
        axe: { run: (context: Document, options: { resultTypes: string[] }) => Promise<AxeResult> };
      }
    ).axe;
    const result = await axeApi.run(document, { resultTypes: ["violations"] });
    return result.violations
      .filter(({ impact }) => impact === "critical" || impact === "serious")
      .map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map(({ target }) => target.join(" ")),
      }));
  });
  expect(violations, "No serious or critical axe violations are allowed").toEqual([]);
}

async function expectResponsiveProgress(page: Page) {
  const width = page.viewportSize()?.width ?? 1280;
  const compact = page.locator("main nav progress");
  const orderedSteps = page.locator("main nav:has(progress) ol");
  if (width < 960) {
    await expect(compact).toBeVisible();
    await expect(orderedSteps).toBeHidden();
  } else {
    await expect(compact).toBeHidden();
    await expect(orderedSteps).toBeVisible();
  }
}

function intakeLabels(locale: "en" | "fr") {
  if (locale === "fr") {
    return {
      continue: "Continuer",
      review: "Vérifier",
      edit: "Modifier",
      errorSummary: "Vérifiez les informations signalées",
      projectName: "Nom de contact préféré",
      projectEmail: "E-mail privé",
      organization: "Nom de l’organisation",
      organizationCountry: "Pays ou région de l’organisation",
      projectTitle: "Titre court du projet",
      projectDescription: "Besoin, utilisateurs, contexte et contraintes",
      projectDescriptionValue:
        "Nous devons comprendre, concevoir et livrer un service public bilingue accessible sur des appareils mobiles modestes.",
      projectService: "Ingénierie produit",
      budget: "Fourchette budgétaire indicative",
      timing: "Calendrier souhaité",
      projectConsent:
        "J’accepte qu’Umoja utilise ces informations pour analyser ce projet et répondre à cette demande.",
      talentName: "Nom professionnel préféré ou public",
      talentEmail: "E-mail privé",
      talentCountry: "Pays ou région",
      timezone: "Fuseau horaire",
      skill: "Ingénierie logicielle",
      experience: "Niveau d’expérience",
      portfolioTitle: "Titre de l’élément de portfolio",
      portfolioUrl: "Lien du portfolio (facultatif)",
      addPortfolio: "Ajouter un autre élément de portfolio",
      weekly: "Capacité hebdomadaire",
      workMode: "Mode de travail préféré",
      language: "Français",
      publicConsent:
        "J’accepte facultativement un profil public limité après validation. Ne pas cocher cette case n’affecte pas ma candidature.",
      applicationConsent:
        "J’accepte d’envoyer cette candidature privée pour l’examen des contributeurs Umoja.",
      dataConsent: "J’accepte le traitement des informations de candidature décrites ici.",
    } as const;
  }
  return {
    continue: "Continue",
    review: "Review",
    edit: "Edit",
    errorSummary: "Check the highlighted information",
    projectName: "Preferred contact name",
    projectEmail: "Private email",
    organization: "Organization name",
    organizationCountry: "Organization country or region",
    projectTitle: "Short project title",
    projectDescription: "Need, users, context, and constraints",
    projectDescriptionValue:
      "We need to understand, design, and deliver an accessible bilingual public service for people using modest mobile devices.",
    projectService: "Product engineering",
    budget: "Indicative budget band",
    timing: "Desired timing",
    projectConsent:
      "I consent to Umoja using this project information to assess and respond to this request.",
    talentName: "Preferred or public professional name",
    talentEmail: "Private email",
    talentCountry: "Country or region",
    timezone: "Timezone",
    skill: "Software engineering",
    experience: "Experience band",
    portfolioTitle: "Portfolio item title",
    portfolioUrl: "Portfolio link (optional)",
    addPortfolio: "Add another portfolio item",
    weekly: "Weekly capacity",
    workMode: "Preferred work mode",
    language: "English",
    publicConsent:
      "I optionally consent to a limited public profile after review. Leaving this unchecked does not affect my application.",
    applicationConsent:
      "I consent to submit this private application for Umoja’s contributor review.",
    dataConsent: "I consent to the processing of the application information described here.",
  } as const;
}

async function expectJourneySeparation(page: Page) {
  const geometry = await page.evaluate(() => {
    const intro = document.querySelector("main > div > section");
    const form = document.querySelector("main form");
    if (!(intro instanceof HTMLElement) || !(form instanceof HTMLFormElement)) return null;
    const introBox = intro.getBoundingClientRect();
    const formBox = form.getBoundingClientRect();
    const journey = form.closest("section");
    const journeyBox = journey?.getBoundingClientRect();
    return {
      gap: formBox.top - introBox.bottom,
      introClass: intro.className,
      journeyClass: journey?.className,
      journeyPadding: journey ? getComputedStyle(journey).paddingBlockStart : null,
      journeyTop: journeyBox?.top,
      formTop: formBox.top,
      introBottom: introBox.bottom,
      scrollY: window.scrollY,
    };
  });
  expect(geometry, "Expected the intake introduction and form").not.toBeNull();
  expect(
    geometry?.gap,
    `The form must not touch or overlap the introduction: ${JSON.stringify(geometry)}`,
  ).toBeGreaterThanOrEqual(24);
}

async function hideOffscreenSkipLinkForCapture(page: Page) {
  await page.addStyleTag({
    content: 'a[href="#main-content"]:not(:focus) { visibility: hidden !important; }',
  });
}
