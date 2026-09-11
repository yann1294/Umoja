import { Container, Section } from "@umoja/ui";
import type { PublicProfile } from "@umoja/validation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getPublicProfile, localize, PROFILE_SLUGS } from "@/content/public-content";
import { publicMetadata } from "@/content/public-metadata";
import { routing, type AppLocale } from "@/i18n/routing";
import { createSupabasePublicClient } from "@/lib/supabase/public";
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
  const { data: published } = await createSupabasePublicClient({ noStore: true })
    .from("public_profiles")
    .select("public_slug,professional_name,public_bio")
    .eq("public_slug", profile)
    .maybeSingle();
  if (!item && !published) notFound();
  if (published)
    return publicMetadata(
      locale,
      `talent/${profile}`,
      published.professional_name ?? "",
      published.public_bio ?? "",
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
  const { data: published } = await createSupabasePublicClient({ noStore: true })
    .from("public_profiles")
    .select("public_slug,professional_name,locale,country_code,public_bio")
    .eq("public_slug", profile)
    .maybeSingle();
  if (published) {
    return (
      <>
        <Breadcrumbs
          ariaLabel={t("breadcrumbLabel")}
          items={[
            { label: t("home"), href: `/${locale}` },
            { label: t("talentTitle"), href: `/${locale}/talent` },
            { label: published.professional_name ?? "" },
          ]}
        />
        <ContentHero
          eyebrow={t("talentEyebrow")}
          title={published.professional_name ?? ""}
          summary={published.public_bio ?? ""}
        />
        <Section aria-label={published.professional_name ?? ""}>
          <Container>
            <p>{published.country_code ?? ""}</p>
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
