import { Badge, Container, LinkButton, Logo, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import type { CmsPage } from "@/lib/cms/domain";
import { cmsField, getSupabasePublishedCmsPage } from "@/lib/cms/service";

import { EngagementOptions } from "./engagement-options";
import styles from "./page.module.css";

type HomePageProps = Readonly<{ params: Promise<{ locale: string }> }>;
type OperatingStep = Readonly<{ title: string; description: string }>;
type Capability = Readonly<{ title: string; description: string }>;
type EngagementDetail = Readonly<{ label: string; value: string }>;
type TalentPreviewPrinciple = Readonly<{ title: string; description: string }>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Home" });
  const cms = await getSupabasePublishedCmsPage(locale, "home");
  return {
    title: cms?.seoTitle ?? cms?.title ?? t("title"),
    description: cms?.seoDescription ?? t("metadataDescription"),
    alternates: { canonical: `/${locale}`, languages: { en: "/en", fr: "/fr" } },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Home" });
  const cms = await getSupabasePublishedCmsPage(locale, "home", {
    [`${locale}:home`]: homeFallback(locale, {
      title: t("title"),
      introduction: t("introduction"),
      eyebrow: t("eyebrow"),
      primaryAction: t("primaryAction"),
      secondaryAction: t("secondaryAction"),
      metadataDescription: t("metadataDescription"),
    }),
  });
  const field = (key: string, fallback: string) => cmsField(cms, key, fallback);
  const operatingSteps = t.raw("operating.steps") as OperatingStep[];
  const capabilities = t.raw("capabilities.items") as Capability[];
  const talentPreviewPrinciples = t.raw("talent.principles") as TalentPreviewPrinciple[];
  const engagementOptions = [
    {
      title: field("engagement.individual.title", t("engagement.individualTitle")),
      description: field(
        "engagement.individual.description",
        t("engagement.individualDescription"),
      ),
      action: field("engagement.individual.action", t("engagement.individualAction")),
      href: `/${locale}/hire#individual`,
      details: t.raw("engagement.individualDetails") as EngagementDetail[],
    },
    {
      title: field("engagement.team.title", t("engagement.teamTitle")),
      description: field("engagement.team.description", t("engagement.teamDescription")),
      action: field("engagement.team.action", t("engagement.teamAction")),
      href: `/${locale}/hire#team`,
      details: t.raw("engagement.teamDetails") as EngagementDetail[],
    },
  ] as const;

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
              <p className={styles.eyebrow}>{field("hero.eyebrow", t("eyebrow"))}</p>
              <h1 id="home-title">{field("hero.title", t("title"))}</h1>
              <p className={styles.introduction}>{field("hero.introduction", t("introduction"))}</p>
              <div className={styles.actions}>
                <LinkButton href={`/${locale}/hire`} variant="highlight" size="large">
                  {field("hero.primaryAction", t("primaryAction"))}
                </LinkButton>
                <LinkButton href={`/${locale}/join`} variant="inverse" size="large">
                  {field("hero.secondaryAction", t("secondaryAction"))}
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

      <Section aria-labelledby="talent-title">
        <Container>
          <div className={styles.talentGrid}>
            <SectionHeading
              index="01"
              eyebrow={field("talent.eyebrow", t("talent.eyebrow"))}
              title={field("talent.title", t("talent.title"))}
              description={field("talent.description", t("talent.description"))}
              id="talent-title"
            />
            <HomeTalentPreview
              action={field("talent.action", t("talent.action"))}
              locale={locale}
              principles={talentPreviewPrinciples.map((principle, index) => ({
                title: field(`talent.principles.${index}.title`, principle.title),
                description: field(`talent.principles.${index}.description`, principle.description),
              }))}
              status={field("talent.status", t("talent.status"))}
              summary={field("talent.previewDescription", t("talent.previewDescription"))}
              title={field("talent.previewTitle", t("talent.previewTitle"))}
            />
          </div>
        </Container>
      </Section>

      <Section tone="sand" aria-labelledby="capabilities-title">
        <Container>
          <SectionHeading
            index="02"
            eyebrow={field("capabilities.eyebrow", t("capabilities.eyebrow"))}
            title={field("capabilities.title", t("capabilities.title"))}
            description={field("capabilities.description", t("capabilities.description"))}
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
                <h3>{field(`capabilities.${index}.title`, capability.title)}</h3>
                <p>{field(`capabilities.${index}.description`, capability.description)}</p>
              </li>
            ))}
          </ul>
          <LinkButton href={`/${locale}/services`} variant="secondary">
            {field("capabilities.action", t("capabilities.action"))}
          </LinkButton>
        </Container>
      </Section>

      <Section aria-labelledby="engagement-title">
        <Container>
          <SectionHeading
            index="03"
            eyebrow={field("engagement.eyebrow", t("engagement.eyebrow"))}
            title={field("engagement.title", t("engagement.title"))}
            description={field("engagement.description", t("engagement.description"))}
            id="engagement-title"
          />
          <EngagementOptions compact options={engagementOptions} />
        </Container>
      </Section>

      <Section className={styles.operatingSection} tone="sand" aria-labelledby="operating-title">
        <Container>
          <SectionHeading
            index="04"
            eyebrow={field("operating.eyebrow", t("operating.eyebrow"))}
            title={field("operating.title", t("operating.title"))}
            description={field("operating.description", t("operating.description"))}
            id="operating-title"
          />
          <ol className={styles.steps} data-count={operatingSteps.length}>
            {operatingSteps.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{field(`operating.${index}.title`, step.title)}</h3>
                  <p>{field(`operating.${index}.description`, step.description)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section className={styles.workSection} tone="ink" aria-labelledby="work-title">
        <Container>
          <div className={styles.workGrid}>
            <SectionHeading
              index="05"
              eyebrow={field("work.eyebrow", t("work.eyebrow"))}
              title={field("work.title", t("work.title"))}
              description={field("work.description", t("work.description"))}
              id="work-title"
              inverse
            />
            <div className={styles.emptyState} data-content-state="empty">
              <Badge variant="inverse">{field("work.status", t("work.status"))}</Badge>
              <div className={styles.emptyStateGraphic} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h3>{field("work.emptyTitle", t("work.emptyTitle"))}</h3>
              <p>{field("work.emptyDescription", t("work.emptyDescription"))}</p>
              <LinkButton href={`/${locale}/work`} variant="inverse">
                {field("work.action", t("work.action"))}
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>

      <Section className={styles.finalSection} tone="sand" aria-labelledby="final-title">
        <Container>
          <p className={styles.eyebrowDark}>{field("final.eyebrow", t("final.eyebrow"))}</p>
          <h2 id="final-title" className={styles.finalTitle}>
            {field("final.title", t("final.title"))}
          </h2>
          <div className={styles.finalGrid}>
            <article className={styles.finalCard}>
              <span className={styles.finalCardMark} aria-hidden="true">
                ↗
              </span>
              <h3>{field("final.buildTitle", t("final.buildTitle"))}</h3>
              <p>{field("final.buildDescription", t("final.buildDescription"))}</p>
              <LinkButton href={`/${locale}/hire`} variant="highlight" size="large">
                {field("final.buildAction", t("final.buildAction"))}
              </LinkButton>
            </article>
            <article className={`${styles.finalCard} ${styles.finalCardDark}`}>
              <span className={styles.finalCardMark} aria-hidden="true">
                ＋
              </span>
              <h3>{field("final.growTitle", t("final.growTitle"))}</h3>
              <p>{field("final.growDescription", t("final.growDescription"))}</p>
              <LinkButton href={`/${locale}/join`} variant="inverse" size="large">
                {field("final.growAction", t("final.growAction"))}
              </LinkButton>
            </article>
          </div>
        </Container>
      </Section>
    </>
  );
}

function HomeTalentPreview({
  action,
  locale,
  principles,
  status,
  summary,
  title,
}: Readonly<{
  action: string;
  locale: "en" | "fr";
  principles: readonly TalentPreviewPrinciple[];
  status: string;
  summary: string;
  title: string;
}>) {
  // Homepage talent previews stay curated and must not auto-select the first approved profile.
  // TODO: add explicit CMS/moderation-controlled "featured on homepage" selection if needed.
  return (
    <div className={styles.talentPlaceholder} data-content-state="curated">
      <div className={styles.profileModules} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Badge variant="neutral">{status}</Badge>
      <h3>{title}</h3>
      <p>{summary}</p>
      <ul className={styles.talentPrinciples}>
        {principles.map((principle) => (
          <li key={principle.title}>
            <span aria-hidden="true" />
            <div>
              <strong>{principle.title}</strong>
              <p>{principle.description}</p>
            </div>
          </li>
        ))}
      </ul>
      <LinkButton href={`/${locale}/talent`} variant="secondary">
        {action}
      </LinkButton>
    </div>
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
