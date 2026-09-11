import { Container, LinkButton, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { listPublicTalentProfiles, publicTalentInitials } from "@/lib/profile/public";
import {
  Breadcrumbs,
  ContentHero,
  ContentState,
  publicContentStyles as styles,
} from "../public-content";
type Props = Readonly<{ params: Promise<{ locale: string }> }>;
export const dynamic = "force-dynamic";
export const revalidate = 0;
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
  const profiles = await listPublicTalentProfiles();
  const french = locale === "fr";
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
            <ul className={styles.talentGrid}>
              {profiles.map((profile) => (
                <li className={styles.talentCard} key={profile.slug}>
                  <div className={styles.talentCardHeader}>
                    <span className={styles.talentAvatar} aria-hidden="true">
                      {profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatarUrl} alt="" loading="lazy" />
                      ) : (
                        publicTalentInitials(profile.name)
                      )}
                    </span>
                    <div>
                      <h2>{profile.name}</h2>
                    </div>
                  </div>
                  <p>{profile.headline || profile.biography}</p>
                  <dl className={styles.talentMeta}>
                    {profile.countryCode ? (
                      <div>
                        <dt>{french ? "Région" : "Region"}</dt>
                        <dd>{profile.countryCode}</dd>
                      </div>
                    ) : null}
                    {profile.availability?.workMode ? (
                      <div>
                        <dt>{french ? "Disponibilité" : "Availability"}</dt>
                        <dd>{workModeLabel(profile.availability.workMode, french)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {profile.skills.length ? (
                    <ul className={styles.tagList} aria-label={french ? "Compétences" : "Skills"}>
                      {profile.skills.slice(0, 4).map((skill) => (
                        <li key={skill.name}>{skill.name}</li>
                      ))}
                    </ul>
                  ) : null}
                  {profile.languages.length ? (
                    <ul
                      className={styles.talentLanguageList}
                      aria-label={french ? "Langues" : "Languages"}
                    >
                      {profile.languages.slice(0, 4).map((language) => (
                        <li key={language.code}>{french ? language.labelFr : language.labelEn}</li>
                      ))}
                    </ul>
                  ) : null}
                  <LinkButton href={`/${locale}/talent/${profile.slug}`} variant="secondary">
                    {french ? "Voir le profil" : "View profile"}
                  </LinkButton>
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

function workModeLabel(value: string, french: boolean) {
  const labels: Record<string, string> = french
    ? { remote: "À distance", hybrid: "Hybride", onsite: "Sur site", flexible: "Flexible" }
    : { remote: "Remote", hybrid: "Hybrid", onsite: "On site", flexible: "Flexible" };
  return labels[value] ?? value;
}
