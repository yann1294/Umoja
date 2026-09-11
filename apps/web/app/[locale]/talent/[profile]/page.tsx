import { Container, LinkButton, Section } from "@umoja/ui";
import type { PublicProfile } from "@umoja/validation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getPublicProfile, localize, PROFILE_SLUGS } from "@/content/public-content";
import { publicMetadata } from "@/content/public-metadata";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  getPublicTalentProfile,
  type PublicTalentProfile,
  publicTalentInitials,
} from "@/lib/profile/public";
import { Breadcrumbs, ContentHero, publicContentStyles as styles } from "../../public-content";
type Props = Readonly<{ params: Promise<{ locale: string; profile: string }> }>;
export const dynamic = "force-dynamic";
export const revalidate = 0;
export function generateStaticParams() {
  return PROFILE_SLUGS.map((profile) => ({ profile }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, profile } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const item = getPublicProfile(profile);
  const published = await getPublicTalentProfile(profile);
  if (!item && !published) notFound();
  if (published)
    return publicMetadata(
      locale,
      `talent/${profile}`,
      published.name,
      published.headline || published.biography,
    );
  if (!item) notFound();
  return publicMetadata(
    locale,
    `talent/${profile}`,
    localize(item.publicName, locale),
    localize(item.bio, locale),
  );
}
function PublicProfileDetails({
  profile,
  locale,
  labels,
}: Readonly<{
  profile: PublicProfile;
  locale: AppLocale;
  labels: Readonly<{ region: string; seniority: string; availability: string; skills: string }>;
}>) {
  return (
    <div className={styles.detailGrid}>
      <div>
        <h2>{labels.skills}</h2>
        <ul className={styles.tagList}>
          {profile.skills.map((skill) => (
            <li key={localize(skill, locale)}>{localize(skill, locale)}</li>
          ))}
        </ul>
      </div>
      <dl className={styles.detailList}>
        <div className={styles.detailCard}>
          <dt>{labels.region}</dt>
          <dd>{localize(profile.region, locale)}</dd>
        </div>
        <div className={styles.detailCard}>
          <dt>{labels.seniority}</dt>
          <dd>{localize(profile.seniority, locale)}</dd>
        </div>
        <div className={styles.detailCard}>
          <dt>{labels.availability}</dt>
          <dd>{localize(profile.availability, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}
export default async function ProfilePage({ params }: Props) {
  const { locale, profile } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const item = getPublicProfile(profile);
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const published = await getPublicTalentProfile(profile);
  if (published) {
    const french = locale === "fr";
    return (
      <>
        <Breadcrumbs
          ariaLabel={t("breadcrumbLabel")}
          items={[
            { label: t("home"), href: `/${locale}` },
            { label: t("talentTitle"), href: `/${locale}/talent` },
            { label: published.name },
          ]}
        />
        <ContentHero
          eyebrow={t("talentEyebrow")}
          title={published.name}
          summary={published.headline || published.biography}
        />
        <Section aria-label={published.name}>
          <Container>
            <EnrichedPublicProfile profile={published} locale={locale} french={french} />
          </Container>
        </Section>
      </>
    );
  }
  if (!item) notFound();
  const title = localize(item.publicName, locale);
  return (
    <>
      <Breadcrumbs
        ariaLabel={t("breadcrumbLabel")}
        items={[
          { label: t("home"), href: `/${locale}` },
          { label: t("talentTitle"), href: `/${locale}/talent` },
          { label: title },
        ]}
      />
      <ContentHero
        eyebrow={t("talentEyebrow")}
        title={title}
        summary={localize(item.bio, locale)}
        illustrativeLabel={localize(item.illustrativeLabel, locale)}
      />
      <Section aria-label={title}>
        <Container>
          <PublicProfileDetails
            profile={item}
            locale={locale}
            labels={{
              region: t("region"),
              seniority: t("seniority"),
              availability: t("availability"),
              skills: t("skills"),
            }}
          />
        </Container>
      </Section>
    </>
  );
}

function EnrichedPublicProfile({
  french,
  locale,
  profile,
}: Readonly<{ french: boolean; locale: AppLocale; profile: PublicTalentProfile }>) {
  return (
    <div className={styles.talentDetail}>
      <section className={styles.talentIdentity} aria-labelledby="public-profile-overview">
        <span className={styles.talentAvatarLarge} aria-hidden="true">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" />
          ) : (
            publicTalentInitials(profile.name)
          )}
        </span>
        <div>
          <h2 id="public-profile-overview">{french ? "Aperçu" : "Overview"}</h2>
          <p>{profile.biography}</p>
          <dl className={styles.talentMeta}>
            {profile.countryCode ? (
              <div>
                <dt>{french ? "Région" : "Region"}</dt>
                <dd>{profile.countryCode}</dd>
              </div>
            ) : null}
            {profile.availability?.workMode ? (
              <div>
                <dt>{french ? "Mode" : "Mode"}</dt>
                <dd>{workModeLabel(profile.availability.workMode, french)}</dd>
              </div>
            ) : null}
            {profile.availability?.nextAvailableOn ? (
              <div>
                <dt>{french ? "Prochaine disponibilité" : "Next available"}</dt>
                <dd>{profile.availability.nextAvailableOn}</dd>
              </div>
            ) : null}
          </dl>
          <div className={styles.actionRow}>
            <LinkButton href={`/${locale}/hire?talent=${profile.slug}`} variant="primary">
              {french ? "Travailler avec ce talent" : "Work with this talent"}
            </LinkButton>
          </div>
        </div>
      </section>

      {profile.skills.length ? (
        <section className={styles.detailCard} aria-labelledby="public-profile-skills">
          <h2 id="public-profile-skills">
            {french ? "Compétences approuvées" : "Approved skills"}
          </h2>
          <ul className={styles.tagList}>
            {profile.skills.map((skill) => (
              <li key={skill.name}>{skill.name}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.languages.length ? (
        <section className={styles.detailCard} aria-labelledby="public-profile-languages">
          <h2 id="public-profile-languages">{french ? "Langues" : "Languages"}</h2>
          <ul className={styles.talentLanguageList}>
            {profile.languages.map((language) => (
              <li key={language.code}>
                {french ? language.labelFr : language.labelEn} ·{" "}
                {proficiencyLabel(language.proficiency, french)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.portfolio.length ? (
        <section aria-labelledby="public-profile-portfolio">
          <h2 id="public-profile-portfolio">
            {french ? "Projets et exemples approuvés" : "Approved project examples"}
          </h2>
          <ul className={styles.portfolioGrid}>
            {profile.portfolio.map((item) => (
              <li className={styles.detailCard} key={item.id}>
                <h3>{item.title}</h3>
                <p>{item.role}</p>
                {item.category ? <small>{item.category}</small> : null}
                {item.technologies.length ? (
                  <ul className={styles.tagList}>
                    {item.technologies.map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                ) : null}
                {item.endedOn || item.startedOn ? (
                  <p>{item.endedOn?.slice(0, 4) ?? item.startedOn?.slice(0, 4)}</p>
                ) : null}
                {item.url ? (
                  <a href={item.url} rel="noreferrer noopener" target="_blank">
                    {french ? "Voir le projet" : "View project"}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className={styles.statePanel} aria-labelledby="portfolio-curated-empty">
          <span className={styles.stateMark} aria-hidden="true">
            —
          </span>
          <h2 id="portfolio-curated-empty">
            {french ? "Exemples en revue" : "Examples under review"}
          </h2>
          <p>
            {french
              ? "Umoja affiche uniquement les exemples approuvés avec consentement."
              : "Umoja shows only approved examples with explicit consent."}
          </p>
        </section>
      )}

      {profile.websiteUrl || profile.professionalLinks.length ? (
        <section className={styles.detailCard} aria-labelledby="public-profile-links">
          <h2 id="public-profile-links">{french ? "Liens publics" : "Public links"}</h2>
          <ul className={styles.publicLinkList}>
            {profile.websiteUrl ? (
              <li>
                <a href={profile.websiteUrl} rel="noreferrer noopener" target="_blank">
                  {french ? "Site web" : "Website"}
                </a>
              </li>
            ) : null}
            {profile.professionalLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url} rel="noreferrer noopener" target="_blank">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function workModeLabel(value: string, french: boolean) {
  const labels: Record<string, string> = french
    ? { remote: "À distance", hybrid: "Hybride", onsite: "Sur site", flexible: "Flexible" }
    : { remote: "Remote", hybrid: "Hybrid", onsite: "On site", flexible: "Flexible" };
  return labels[value] ?? value;
}

function proficiencyLabel(value: string, french: boolean) {
  const labels: Record<string, string> = french
    ? {
        basic: "Débutant",
        conversational: "Conversation",
        professional: "Professionnel",
        fluent: "Courant",
        native: "Langue maternelle",
      }
    : {
        basic: "Basic",
        conversational: "Conversational",
        professional: "Professional",
        fluent: "Fluent",
        native: "Native",
      };
  return labels[value] ?? value;
}
