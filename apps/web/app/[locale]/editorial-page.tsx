import { Container, LinkButton, Section } from "@umoja/ui";
import type { EditorialPage } from "@umoja/validation";
import type { CmsPage } from "@/lib/cms/domain";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import {
  Breadcrumbs,
  ContentState,
  EditorialPageView,
  publicContentStyles as styles,
  SectionHeading,
} from "./public-content";
export async function EditorialRoute({
  cms,
  locale,
  page,
  emptyState,
  showAboutLinks = false,
  showAfricITLinks = false,
}: Readonly<{
  cms?: CmsPage | null;
  locale: AppLocale;
  page: EditorialPage;
  emptyState?: "organizations" | "africit";
  showAboutLinks?: boolean;
  showAfricITLinks?: boolean;
}>) {
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const publishedPage = cms ? applyCmsPage(page, cms, locale) : page;
  return (
    <>
      <Breadcrumbs
        ariaLabel={t("breadcrumbLabel")}
        items={[{ label: t("home"), href: `/${locale}` }, { label: publishedPage.title[locale] }]}
      />
      <EditorialPageView locale={locale} page={publishedPage} />
      {emptyState ? (
        <Section aria-label={t(`${emptyState}EmptyTitle`)}>
          <Container>
            <ContentState
              title={t(`${emptyState}EmptyTitle`)}
              description={t(`${emptyState}EmptyDescription`)}
            />
          </Container>
        </Section>
      ) : null}
      {showAboutLinks ? (
        <Section tone="sand" aria-labelledby="about-explore">
          <Container>
            <SectionHeading
              title={t("aboutExploreTitle")}
              description={t("aboutExploreDescription")}
            />
            <div id="about-explore" className={styles.actionRow}>
              {(["model", "governance", "manifesto"] as const).map((topic) => (
                <LinkButton href={`/${locale}/about/${topic}`} variant="secondary" key={topic}>
                  {t(topic)}
                </LinkButton>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
      {showAfricITLinks ? (
        <Section tone="sand" aria-labelledby="africit-explore">
          <Container>
            <SectionHeading
              title={t("africitExploreTitle")}
              description={t("africitExploreDescription")}
            />
            <div id="africit-explore" className={styles.actionRow}>
              {(["workshops", "research", "resources"] as const).map((topic) => (
                <LinkButton href={`/${locale}/africit/${topic}`} variant="secondary" key={topic}>
                  {t(topic)}
                </LinkButton>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

/** CMS keeps prose structured while the page layout remains code-controlled. */
function applyCmsPage(page: EditorialPage, cms: CmsPage, locale: AppLocale): EditorialPage {
  const paragraphs = cms.blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text);
  if (!paragraphs.length) return page;
  const localized = (value: string) => ({ ...page.title, [locale]: value });
  const sections = page.sections.map((section, index) => ({
    ...section,
    body: { ...section.body, [locale]: paragraphs[index] ?? section.body[locale] },
  }));
  return {
    ...page,
    title: localized(cms.title),
    summary: localized(paragraphs[0] ?? page.summary[locale]),
    sections,
  };
}
