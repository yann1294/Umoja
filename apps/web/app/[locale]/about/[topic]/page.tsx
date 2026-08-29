import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ABOUT_SLUGS, getEditorialPage, localize } from "@/content/public-content";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { Breadcrumbs, EditorialPageView } from "../../public-content";
import { getPublishedCmsPage } from "@/lib/cms/service";
type Props = Readonly<{ params: Promise<{ locale: string; topic: string }> }>;
export function generateStaticParams() {
  return ABOUT_SLUGS.map((topic) => ({ topic }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, topic } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const page = getEditorialPage(topic);
  if (!page) notFound();
  return publicMetadata(
    locale,
    `about/${topic}`,
    localize(page.title, locale),
    localize(page.summary, locale),
  );
}
export default async function AboutTopic({ params }: Props) {
  const { locale, topic } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const page = getEditorialPage(topic);
  if (!page) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const cms = await getPublishedCmsPage(locale, `about/${topic}`);
  const paragraphs = cms?.blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text);
  const published =
    cms && paragraphs?.length
      ? {
          ...page,
          title: { ...page.title, [locale]: cms.title },
          summary: { ...page.summary, [locale]: paragraphs[0] ?? page.summary[locale] },
          sections: page.sections.map((section, index) => ({
            ...section,
            body: { ...section.body, [locale]: paragraphs[index] ?? section.body[locale] },
          })),
        }
      : page;
  return (
    <>
      <Breadcrumbs
        ariaLabel={t("breadcrumbLabel")}
        items={[
          { label: t("home"), href: `/${locale}` },
          { label: locale === "fr" ? "À propos d’Umoja" : "About Umoja", href: `/${locale}/about` },
          { label: localize(published.title, locale) },
        ]}
      />
      <EditorialPageView locale={locale} page={published} />
    </>
  );
}
