import { Container, LinkButton, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { Breadcrumbs, ContentHero, ContentState } from "../public-content";
type Props = Readonly<{ params: Promise<{ locale: string }> }>;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  return publicMetadata(locale, "talent", t("talentTitle"), t("talentSummary"));
}
export default async function TalentPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const { data: profiles } = await createSupabasePublicClient()
    .from("public_profiles")
    .select("public_slug,professional_name,public_bio,country_code")
    .order("professional_name");
  return (
    <>
      <Breadcrumbs
        ariaLabel={t("breadcrumbLabel")}
        items={[{ label: t("home"), href: `/${locale}` }, { label: t("talentTitle") }]}
      />
      <ContentHero
        eyebrow={t("talentEyebrow")}
        title={t("talentTitle")}
        summary={t("talentSummary")}
      />
      <Section aria-label={profiles?.length ? t("talentTitle") : t("talentEmptyTitle")}>
        <Container>
          {profiles?.length ? (
            <ul>
              {profiles.map((profile) => (
                <li key={profile.public_slug}>
                  <a href={`/${locale}/talent/${profile.public_slug}`}>
                    {profile.professional_name}
                  </a>
                  <p>{profile.public_bio}</p>
                  <small>{profile.country_code ?? ""}</small>
                </li>
              ))}
            </ul>
          ) : (
            <ContentState title={t("talentEmptyTitle")} description={t("talentEmptyDescription")}>
              <LinkButton
                href={`/${locale}/talent/illustrative-public-profile`}
                variant="secondary"
              >
                {t("viewProfileTemplate")}
              </LinkButton>
            </ContentState>
          )}
        </Container>
      </Section>
    </>
  );
}
