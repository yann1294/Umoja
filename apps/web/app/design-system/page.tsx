import {
  Badge,
  badgeVariants,
  brandColors,
  Button,
  buttonSizes,
  buttonVariants,
  Card,
  cardPaddings,
  cardTones,
  Container,
  LinkButton,
  Logo,
  logoSizes,
  logoVariants,
  Section,
  sectionSpacings,
  sectionTones,
  VisuallyHidden,
} from "@umoja/ui";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const colorRoles = [
  ["ink", "Primary text and deep surfaces"],
  ["canopy", "Institutional surfaces and primary actions"],
  ["kijani", "Growth and verified graphic accents"],
  ["gold", "Energy, highlights, and focus"],
  ["terracotta", "Warm editorial accent"],
  ["indigo", "Technology and research accent"],
  ["canvas", "Default warm background"],
  ["sand", "Quiet sections and cards"],
  ["mist", "Borders and dividers"],
  ["slate", "Secondary text"],
  ["white", "Cards and inverse text"],
  ["success", "Accepted, delivered, verified"],
  ["warning", "Risk, attention, expiring"],
  ["danger", "Error, declined, destructive"],
  ["info", "Neutral system guidance"],
] as const;

const typographyTokens = [
  ["Display", "u-type-display", "African expertise, connected."],
  ["Heading 1", "u-type-h1", "One trusted force."],
  ["Heading 2", "u-type-h2", "Built for meaningful delivery."],
  ["Heading 3", "u-type-h3", "A clear path to grow."],
  [
    "Body large",
    "u-type-body-large",
    "Vetted through evidence, strengthened through real delivery.",
  ],
  ["Body", "u-type-body", "English and French have equal product status across the platform."],
  ["Label", "u-type-label", "Project readiness"],
  ["Caption", "u-type-caption", "Updated with verified evidence"],
] as const;

function FixtureTitle({ children }: Readonly<{ children: ReactNode }>) {
  return <h3 className={styles.fixtureTitle}>{children}</h3>;
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_SYSTEM_ENABLED !== "true") {
    notFound();
  }

  return (
    <main className={styles.page}>
      <Section tone="canopy" spacing="spacious" aria-labelledby="design-system-title">
        <Container>
          <div className={styles.hero}>
            <Logo variant="mark" size="medium" label="Umoja" />
            <Badge variant="inverse">Development reference</Badge>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Umoja design system</p>
              <h1 id="design-system-title">
                The Connected U, translated into interface foundations.
              </h1>
              <p>
                Approved tokens and accessible primitives for a bilingual, mobile-first delivery
                collective. This route is unavailable in production unless explicitly enabled for
                automated review.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="canvas" aria-labelledby="colour-title">
        <Container>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Tokens</p>
            <h2 id="colour-title">Approved colour palette</h2>
            <p>
              Semantic meaning always includes text. White is not used for normal text on Kijani or
              Terracotta because those combinations do not meet the documented contrast threshold.
            </p>
          </header>
          <div className={styles.swatchGrid}>
            {colorRoles.map(([name, role]) => (
              <Card key={name} padding="compact" className={styles.swatchCard}>
                <span
                  className={styles.swatch}
                  style={{ "--swatch-color": brandColors[name] } as CSSProperties}
                  aria-hidden="true"
                />
                <div>
                  <strong>{name}</strong>
                  <code>{brandColors[name]}</code>
                  <p>{role}</p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="sand" aria-labelledby="type-title">
        <Container>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Typography</p>
            <h2 id="type-title">Fluid, bilingual type scale</h2>
            <p>Manrope leads headings; Noto Sans supports body, interface, and tabular data.</p>
          </header>
          <div className={styles.typeStack}>
            {typographyTokens.map(([label, className, sample]) => (
              <div className={styles.typeRow} key={label}>
                <code>{label}</code>
                <p className={className}>{sample}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="canvas" aria-labelledby="shape-title">
        <Container>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Shape and rhythm</p>
            <h2 id="shape-title">Spacing, widths, and radii</h2>
          </header>
          <div className={styles.shapeGrid}>
            <Card>
              <FixtureTitle>Spacing</FixtureTitle>
              <div className={styles.spacingScale} aria-label="Spacing token scale">
                {["0-5", "1", "2", "3", "4", "6", "8"].map((token) => (
                  <div key={token}>
                    <span
                      style={{ "--space-size": `var(--u-space-${token})` } as CSSProperties}
                      aria-hidden="true"
                    />
                    <code>--u-space-{token}</code>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <FixtureTitle>Radii</FixtureTitle>
              <div className={styles.radiusScale}>
                <span className={styles.radiusControl}>12px control</span>
                <span className={styles.radiusCard}>20px card</span>
                <span className={styles.radiusPanel}>28px panel</span>
              </div>
            </Card>
            <Card>
              <FixtureTitle>Content widths</FixtureTitle>
              <p>
                Reading content is capped at <code>46rem</code>; primary layout content is capped at
                <code>78rem</code> with a fluid gutter.
              </p>
            </Card>
          </div>
        </Container>
      </Section>

      <Section tone="sand" aria-labelledby="controls-title">
        <Container>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Primitives</p>
            <h2 id="controls-title">Buttons and links</h2>
            <p>Every control size preserves a minimum 44×44 CSS-pixel target and visible focus.</p>
          </header>
          <Card padding="spacious">
            <FixtureTitle>Button variants</FixtureTitle>
            <div className={styles.controlGrid}>
              {buttonVariants
                .filter((variant) => variant !== "inverse")
                .map((variant) => (
                  <Button key={variant} variant={variant}>
                    {variant} action
                  </Button>
                ))}
            </div>
            <FixtureTitle>Sizes and link buttons</FixtureTitle>
            <div className={styles.controlGrid}>
              {buttonSizes.map((size) => (
                <Button key={size} size={size} variant="secondary">
                  {size} button
                </Button>
              ))}
              <LinkButton href="#stress-fixtures">Review stress fixtures</LinkButton>
              <Button variant="ghost" aria-label="Open navigation example">
                <span aria-hidden="true">☰</span>
                <VisuallyHidden>Open navigation example</VisuallyHidden>
              </Button>
            </div>
          </Card>
        </Container>
      </Section>

      <Section tone="canopy" aria-labelledby="dark-title">
        <Container>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Dark surfaces</p>
            <h2 id="dark-title">High-contrast inverse treatments</h2>
          </header>
          <div className={styles.darkGrid}>
            <Card tone="dark">
              <FixtureTitle>Canopy card</FixtureTitle>
              <p>Warm Canvas or White text stays legible against the institutional surface.</p>
              <div className={styles.controlGrid}>
                <Button variant="highlight">Highlighted action</Button>
                <LinkButton variant="inverse" href="#logos">
                  Inverse link
                </LinkButton>
              </div>
            </Card>
            <Card tone="dark">
              <FixtureTitle>Status with text</FixtureTitle>
              <div className={styles.badgeRow}>
                <Badge variant="inverse">Verified contributor</Badge>
                <Badge variant="inverse">Needs review</Badge>
              </div>
            </Card>
          </div>
        </Container>
      </Section>

      <Section tone="canvas" aria-labelledby="cards-title">
        <Container>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Composition</p>
            <h2 id="cards-title">Cards, sections, and badges</h2>
          </header>
          <div className={styles.cardGrid}>
            {cardTones
              .filter((tone) => tone !== "dark")
              .map((tone) => (
                <Card key={tone} tone={tone}>
                  <FixtureTitle>{tone} card</FixtureTitle>
                  <p>Flat surfaces use borders and background contrast before shadow.</p>
                </Card>
              ))}
          </div>
          <div className={styles.metaTokens}>
            <p>
              Card padding: <code>{cardPaddings.join(" · ")}</code>
            </p>
            <p>
              Section tones: <code>{sectionTones.join(" · ")}</code>
            </p>
            <p>
              Section spacing: <code>{sectionSpacings.join(" · ")}</code>
            </p>
          </div>
          <div className={styles.badgeRow} aria-label="Badge variants">
            {badgeVariants
              .filter((variant) => variant !== "inverse")
              .map((variant) => (
                <Badge key={variant} variant={variant}>
                  {variant} status
                </Badge>
              ))}
          </div>
        </Container>
      </Section>

      <Section tone="sand" aria-labelledby="logos-title" id="logos">
        <Container>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Brand assets</p>
            <h2 id="logos-title">Unmodified logo family</h2>
          </header>
          <div className={styles.logoGrid}>
            {logoVariants.map((variant) => (
              <Card key={variant} className={styles.logoCard}>
                <Logo variant={variant} size={variant === "mark" ? "large" : "medium"} />
                <code>{variant}</code>
              </Card>
            ))}
          </div>
          <p className={styles.metaTokens}>
            Supported sizes: <code>{logoSizes.join(" · ")}</code>
          </p>
        </Container>
      </Section>

      <Section tone="canvas" aria-labelledby="stress-title" id="stress-fixtures">
        <Container>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Resilience</p>
            <h2 id="stress-title">Content and state stress fixtures</h2>
            <p>These fixtures are intentionally difficult and remain part of responsive review.</p>
          </header>
          <div className={styles.stressGrid}>
            <Card data-stress-fixture="long-english">
              <FixtureTitle>Long English</FixtureTitle>
              <p>
                Tell us what your distributed organization needs to research, design, build,
                document, validate, maintain, and hand over responsibly across multiple regions,
                disciplines, timelines, and accessibility requirements.
              </p>
            </Card>
            <Card data-stress-fixture="long-french">
              <FixtureTitle>Français long</FixtureTitle>
              <p lang="fr">
                Expliquez-nous ce que votre organisation doit rechercher, concevoir, développer,
                documenter, valider, maintenir et transmettre de façon responsable dans plusieurs
                régions, disciplines et contextes d’accessibilité.
              </p>
            </Card>
            <Card data-stress-fixture="long-name">
              <FixtureTitle>Long name</FixtureTitle>
              <p>Aminata N’Guessan-Kouamé Mbuyi wa Tshibangu</p>
              <p className={styles.unbroken}>
                project-interface-contract-v2026-final-approved-with-cross-module-dependencies
              </p>
            </Card>
            <Card data-stress-fixture="loading" aria-live="polite">
              <FixtureTitle>Loading</FixtureTitle>
              <p>Actions remain named and expose their busy state.</p>
              <Button loading loadingLabel="Sending securely…">
                Send brief
              </Button>
            </Card>
            <Card data-stress-fixture="empty" role="status">
              <Badge variant="neutral">Empty</Badge>
              <FixtureTitle>No assigned modules yet</FixtureTitle>
              <p>New assignments will appear here with their required context and outputs.</p>
            </Card>
            <Card data-stress-fixture="error" role="alert">
              <Badge variant="danger">Error</Badge>
              <FixtureTitle>We could not save the review</FixtureTitle>
              <p>Your draft remains on this device. Check the connection and try again.</p>
              <Button variant="secondary">Try again</Button>
            </Card>
            <Card data-stress-fixture="validation">
              <Badge variant="warning">Validation</Badge>
              <FixtureTitle>Project contact</FixtureTitle>
              <label className={styles.label} htmlFor="project-email">
                Work email
              </label>
              <input
                className={`${styles.input} u-focusable`}
                id="project-email"
                name="project-email"
                type="email"
                value="not-an-email"
                readOnly
                aria-invalid="true"
                aria-describedby="project-email-error"
              />
              <p className={styles.validationMessage} id="project-email-error">
                Enter a valid work email, for example name@organisation.org.
              </p>
            </Card>
          </div>
        </Container>
      </Section>
    </main>
  );
}
