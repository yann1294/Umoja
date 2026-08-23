import { Badge, Container, LinkButton, Logo, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import type { CmsPage } from "@umoja/appwrite/cms";
import { cmsField, getPublishedCmsPage } from "@/lib/cms/service";

import styles from "./page.module.css";

type HomePageProps = Readonly<{ params: Promise<{ locale: string }> }>;
type OperatingStep = Readonly<{ title: string; description: string }>;
type Capability = Readonly<{ title: string; description: string }>;
type NetworkPart = Readonly<{ name: string; description: string }>;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Home" });
  const cms = await getPublishedCmsPage(locale, "home");

  return {
    title: cms?.seoTitle ?? cms?.title ?? t("title"),
    description: cms?.seoDescription ?? t("metadataDescription"),
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", fr: "/fr" },
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Home" });
  const cms = await getPublishedCmsPage(locale, "home", {
    [`${locale}:home`]: homeFallback(locale, {
      title: t("title"),
      introduction: t("introduction"),
      eyebrow: t("eyebrow"),
      primaryAction: t("primaryAction"),
      secondaryAction: t("secondaryAction"),
      metadataDescription: t("metadataDescription"),
    }),
  });
  const operatingSteps = t.raw("operating.steps") as OperatingStep[];
  const capabilities = t.raw("capabilities.items") as Capability[];
  const networkParts = t.raw("network.parts") as NetworkPart[];

  return (
    <>
      <Section
        className={styles.heroSection}
        tone="canopy"
        spacing="spacious"
        aria-labelledby="home-title"
      >
        <Container>
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{cmsField(cms, "hero.eyebrow", t("eyebrow"))}</p>
              <h1 id="home-title">{cmsField(cms, "hero.title", t("title"))}</h1>
              <p className={styles.introduction}>
                {cmsField(cms, "hero.introduction", t("introduction"))}
              </p>
              <div className={styles.actions}>
                <LinkButton href={`/${locale}/start-a-project`} variant="highlight" size="large">
                  {cmsField(cms, "hero.primaryAction", t("primaryAction"))}
                </LinkButton>
                <LinkButton href={`/${locale}/join`} variant="inverse" size="large">
                  {cmsField(cms, "hero.secondaryAction", t("secondaryAction"))}
                </LinkButton>
              </div>
            </div>
            <div className={styles.heroGraphic} aria-hidden="true">
              <span className={styles.heroModule} />
              <span className={styles.heroModule} />
              <span className={styles.heroModule} />
              <Logo className={styles.heroMark} variant="mark" size="large" decorative />
            </div>
          </div>
        </Container>
      </Section>

      <section className={styles.trustSection} aria-labelledby="trust-title">
        <Container>
          <div className={styles.trustGrid}>
            <p className={styles.sectionIndex}>01</p>
            <div>
              <p className={styles.eyebrowDark}>{t("trust.eyebrow")}</p>
              <h2 id="trust-title">{t("trust.title")}</h2>
            </div>
            <p className={styles.trustCopy}>{t("trust.description")}</p>
          </div>
          <ul className={styles.trustPrinciples} aria-label={t("trust.principlesLabel")}>
            <li>{t("trust.managed")}</li>
            <li>{t("trust.modular")}</li>
            <li>{t("trust.bilingual")}</li>
          </ul>
        </Container>
      </section>

      <Section className={styles.operatingSection} tone="sand" aria-labelledby="operating-title">
        <Container>
          <SectionHeading
            index="02"
            eyebrow={t("operating.eyebrow")}
            title={t("operating.title")}
            description={t("operating.description")}
            id="operating-title"
          />
          <ol className={styles.steps}>
            {operatingSteps.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section aria-labelledby="capabilities-title">
        <Container>
          <SectionHeading
            index="03"
            eyebrow={t("capabilities.eyebrow")}
            title={t("capabilities.title")}
            description={t("capabilities.description")}
            id="capabilities-title"
          />
          <ul className={styles.capabilityGrid}>
            {capabilities.map((capability, index) => (
              <li key={capability.title}>
                <span
                  className={styles.capabilityMark}
                  data-accent={index % 3}
                  aria-hidden="true"
                />
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
              </li>
            ))}
          </ul>
          <LinkButton href={`/${locale}/services`} variant="secondary">
            {t("capabilities.action")}
          </LinkButton>
        </Container>
      </Section>

      <Section className={styles.workSection} tone="ink" aria-labelledby="work-title">
        <Container>
          <div className={styles.workGrid}>
            <SectionHeading
              index="04"
              eyebrow={t("work.eyebrow")}
              title={t("work.title")}
              description={t("work.description")}
              id="work-title"
              inverse
            />
            <div className={styles.emptyState} data-content-state="empty">
              <Badge variant="inverse">{t("work.status")}</Badge>
              <div className={styles.emptyStateGraphic} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h3>{t("work.emptyTitle")}</h3>
              <p>{t("work.emptyDescription")}</p>
              <LinkButton href={`/${locale}/work`} variant="inverse">
                {t("work.action")}
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>

      <Section className={styles.networkSection} tone="sand" aria-labelledby="network-title">
        <Container>
          <SectionHeading
            index="05"
            eyebrow={t("network.eyebrow")}
            title={t("network.title")}
            description={t("network.description")}
            id="network-title"
          />
          <figure className={styles.networkFigure} aria-labelledby="network-caption">
            <div className={styles.networkCore} aria-hidden="true">
              <Logo variant="mark" size="medium" decorative />
            </div>
            <ul className={styles.networkParts}>
              {networkParts.map((part, index) => (
                <li key={part.name} data-position={index}>
                  <span className={styles.networkNode} aria-hidden="true" />
                  <h3>{part.name}</h3>
                  <p>{part.description}</p>
                </li>
              ))}
            </ul>
            <figcaption id="network-caption">{t("network.caption")}</figcaption>
          </figure>
        </Container>
      </Section>

      <Section aria-labelledby="talent-title">
        <Container>
          <div className={styles.talentGrid}>
            <SectionHeading
              index="06"
              eyebrow={t("talent.eyebrow")}
              title={t("talent.title")}
              description={t("talent.description")}
              id="talent-title"
            />
            <div className={styles.talentPlaceholder} data-content-state="empty">
              <div className={styles.profileModules} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <Badge variant="neutral">{t("talent.status")}</Badge>
              <h3>{t("talent.emptyTitle")}</h3>
              <p>{t("talent.emptyDescription")}</p>
              <LinkButton href={`/${locale}/talent`} variant="secondary">
                {t("talent.action")}
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>

      <Section className={styles.africitSection} tone="canopy" aria-labelledby="africit-title">
        <Container>
          <div className={styles.africitGrid}>
            <div className={styles.africitGraphic} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className={styles.africitCopy}>
              <p className={styles.eyebrow}>{t("africit.eyebrow")}</p>
              <h2 id="africit-title">{t("africit.title")}</h2>
              <p>{t("africit.description")}</p>
              <ul>
                <li>{t("africit.workshops")}</li>
                <li>{t("africit.resources")}</li>
                <li>{t("africit.research")}</li>
              </ul>
              <LinkButton href={`/${locale}/africit`} variant="highlight">
                {t("africit.action")}
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>

      <Section className={styles.manifestoSection} aria-labelledby="manifesto-title">
        <Container>
          <div className={styles.manifestoGrid}>
            <p className={styles.sectionIndex}>07</p>
            <div>
              <p className={styles.eyebrowDark}>{t("manifesto.eyebrow")}</p>
              <h2 id="manifesto-title">{t("manifesto.title")}</h2>
              <p className={styles.manifestoText}>{t("manifesto.description")}</p>
              <LinkButton href={`/${locale}/about`} variant="secondary">
                {t("manifesto.action")}
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>

      <Section className={styles.finalSection} tone="sand" aria-labelledby="final-title">
        <Container>
          <p className={styles.eyebrowDark}>{t("final.eyebrow")}</p>
          <h2 id="final-title" className={styles.finalTitle}>
            {t("final.title")}
          </h2>
          <div className={styles.finalGrid}>
            <article className={styles.finalCard}>
              <span className={styles.finalCardMark} aria-hidden="true">
                ↗
              </span>
              <h3>{t("final.buildTitle")}</h3>
              <p>{t("final.buildDescription")}</p>
              <LinkButton href={`/${locale}/start-a-project`} variant="highlight" size="large">
                {t("final.buildAction")}
              </LinkButton>
            </article>
            <article className={`${styles.finalCard} ${styles.finalCardDark}`}>
              <span className={styles.finalCardMark} aria-hidden="true">
                ＋
              </span>
              <h3>{t("final.growTitle")}</h3>
              <p>{t("final.growDescription")}</p>
              <LinkButton href={`/${locale}/join`} variant="inverse" size="large">
                {t("final.growAction")}
              </LinkButton>
            </article>
          </div>
        </Container>
      </Section>
    </>
  );
}

function SectionHeading({
  description,
  eyebrow,
  id,
  index,
  inverse = false,
  title,
}: Readonly<{
  description: string;
  eyebrow: string;
  id: string;
  index: string;
  inverse?: boolean;
  title: string;
}>) {
  return (
    <div className={`${styles.sectionHeading} ${inverse ? styles.sectionHeadingInverse : ""}`}>
      <p className={styles.sectionIndex}>{index}</p>
      <div>
        <p className={inverse ? styles.eyebrow : styles.eyebrowDark}>{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      <p>{description}</p>
    </div>
  );
}

function homeFallback(
  locale: "en" | "fr",
  copy: Readonly<{
    eyebrow: string;
    title: string;
    introduction: string;
    primaryAction: string;
    secondaryAction: string;
    metadataDescription: string;
  }>,
): CmsPage {
  return {
    id: `static-home-${locale}`,
    stableKey: "homepage:home",
    translationGroupId: "home",
    locale,
    slug: "home",
    title: copy.title,
    seoTitle: copy.title,
    seoDescription: copy.metadataDescription,
    blocks: [
      { type: "field", key: "hero.eyebrow", label: "Eyebrow", value: copy.eyebrow },
      { type: "field", key: "hero.title", label: "Title", value: copy.title },
      { type: "field", key: "hero.introduction", label: "Introduction", value: copy.introduction },
      {
        type: "field",
        key: "hero.primaryAction",
        label: "Primary action",
        value: copy.primaryAction,
      },
      {
        type: "field",
        key: "hero.secondaryAction",
        label: "Secondary action",
        value: copy.secondaryAction,
      },
    ],
    state: "published",
    authorId: "static-fallback",
    updatedById: "static-fallback",
    currentRevisionId: `static-home-${locale}`,
    publishedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
