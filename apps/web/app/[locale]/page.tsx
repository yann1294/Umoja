import { Container, LinkButton, Logo, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";

import styles from "./page.module.css";

type HomePageProps = Readonly<{ params: Promise<{ locale: string }> }>;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Home" });

  return {
    title: t("title"),
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

  return (
    <Section tone="canopy" spacing="spacious" aria-labelledby="home-title">
      <Container>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t("eyebrow")}</p>
            <h1 id="home-title">{t("title")}</h1>
            <p className={styles.introduction}>{t("introduction")}</p>
            <div className={styles.actions}>
              <LinkButton href={`/${locale}/start-a-project`} variant="highlight" size="large">
                {t("primaryAction")}
              </LinkButton>
              <LinkButton href={`/${locale}/join`} variant="inverse" size="large">
                {t("secondaryAction")}
              </LinkButton>
            </div>
          </div>
          <Logo className={styles.heroMark} variant="mark" size="large" decorative />
        </div>
      </Container>
    </Section>
  );
}
