import { Badge, Card, Container, LinkButton, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";

import styles from "./page.module.css";

const pageSlugs = [
  "services",
  "work",
  "talent",
  "africit",
  "about",
  "start-a-project",
  "join",
] as const;

type PageSlug = (typeof pageSlugs)[number];
type PlaceholderPageProps = Readonly<{
  params: Promise<{ locale: string; slug: string }>;
}>;

export const dynamicParams = false;

export function generateStaticParams() {
  return pageSlugs.map((slug) => ({ slug }));
}

function isPageSlug(value: string): value is PageSlug {
  return pageSlugs.includes(value as PageSlug);
}

export async function generateMetadata({ params }: PlaceholderPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || !isPageSlug(slug)) notFound();
  const t = await getTranslations({ locale, namespace: `Pages.${slug}` });

  return {
    title: t("title"),
    description: t("summary"),
    alternates: {
      canonical: `/${locale}/${slug}`,
      languages: { en: `/en/${slug}`, fr: `/fr/${slug}` },
    },
  };
}

export default async function PlaceholderPage({ params }: PlaceholderPageProps) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || !isPageSlug(slug)) notFound();

  const page = await getTranslations({ locale, namespace: `Pages.${slug}` });
  const common = await getTranslations({ locale, namespace: "Pages" });

  return (
    <Section spacing="spacious" aria-labelledby="placeholder-title">
      <Container size="narrow">
        <div className={styles.wrapper}>
          <Badge variant="accent">{common("eyebrow")}</Badge>
          <h1 id="placeholder-title">{page("title")}</h1>
          <p className={styles.summary}>{page("summary")}</p>
          <Card tone="sand" padding="spacious" className={styles.statusCard}>
            <p>{common("status")}</p>
          </Card>
          <LinkButton href={`/${locale}`} variant="secondary">
            {common("backHome")}
          </LinkButton>
        </div>
      </Container>
    </Section>
  );
}
