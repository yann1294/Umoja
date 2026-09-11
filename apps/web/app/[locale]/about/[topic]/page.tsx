import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ABOUT_SLUGS, getEditorialPage, localize } from "@/content/public-content";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { Breadcrumbs, EditorialPageView } from "../../public-content";
import { getSupabasePublishedCmsPage } from "@/lib/cms/service";
import { editorialPageFromCms } from "@/lib/cms/public-rendering";
type Props = Readonly<{ params: Promise<{ locale: string; topic: string }> }>;

// This route is pre-rendered for the editorial fallback at build time.  It is
// also an ISR boundary so an on-demand `revalidatePath` after a CMS publish can
// replace that fallback in the Full Route Cache without making all public
// routes dynamic.
export const revalidate = 300;

export function generateStaticParams() {
  return ABOUT_SLUGS.map((topic) => ({ topic }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, topic } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const page = getEditorialPage(topic);
  if (!page) notFound();
  const cms = await getSupabasePublishedCmsPage(locale, `about/${topic}`);
  const published = editorialPageFromCms(page, cms, locale);
  return publicMetadata(
    locale,
    `about/${topic}`,
    localize(published.title, locale),
    localize(published.summary, locale),
  );
}
export default async function AboutTopic({ params }: Props) {
  const { locale, topic } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const page = getEditorialPage(topic);
  if (!page) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const cms = await getSupabasePublishedCmsPage(locale, `about/${topic}`);
  const published = editorialPageFromCms(page, cms, locale);
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
