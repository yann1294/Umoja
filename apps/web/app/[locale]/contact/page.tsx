import { Container, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { getIntakeCopy } from "@/content/intake-copy";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { cmsField, getSupabasePublishedCmsPage } from "@/lib/cms/service";

import { EngagementOptions } from "../engagement-options";
import { IntakePage } from "../intake/intake-page";
import { SectionHeading } from "../public-content";

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const copy = getIntakeCopy(locale).contact;
  return publicMetadata(locale, "contact", copy.title, copy.intro);
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Engagement" });
  const cms = await getSupabasePublishedCmsPage(locale, "contact");
  const field = (key: string, fallback: string) => cmsField(cms, key, fallback);
  const options = [
    {
      title: field("paths.hire.title", t("contactHire")),
      description: field("paths.hire.description", t("individualDescription")),
      action: field("paths.hire.action", t("contactHire")),
      href: `/${locale}/hire#individual`,
    },
    {
      title: field("paths.team.title", t("contactTeam")),
      description: field("paths.team.description", t("teamDescription")),
      action: field("paths.team.action", t("contactTeam")),
      href: `/${locale}/hire#team`,
    },
    {
      title: field("paths.join.title", t("contactJoin")),
      description: field(
        "paths.join.description",
        locale === "fr"
          ? "Candidatez par le parcours privé et consenti réservé aux professionnels."
          : "Apply through the private, consent-led professional journey.",
      ),
      action: field("paths.join.action", t("contactJoin")),
      href: `/${locale}/join`,
    },
    {
      title: field("paths.general.title", t("contactGeneral")),
      description: field("paths.general.description", t("contactDescription")),
      action: field("paths.general.action", t("contactGeneral")),
      href: "#contact-form",
    },
  ] as const;

  const lead = (
    <Section tone="sand" aria-label={field("paths.title", t("contactTitle"))}>
      <Container>
        <SectionHeading
          title={field("paths.title", t("contactTitle"))}
          description={field("paths.description", t("contactDescription"))}
        />
        <EngagementOptions compact options={options} />
      </Container>
    </Section>
  );

  return <IntakePage locale={locale} kind="contact" lead={lead} />;
}
