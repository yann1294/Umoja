import { Container, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CASE_STUDY_SLUGS, getCaseStudy, localize } from "@/content/public-content";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { Breadcrumbs, ContentHero, publicContentStyles as styles } from "../../public-content";
type Props = Readonly<{ params: Promise<{ locale: string; caseStudy: string }> }>;
export function generateStaticParams() { return CASE_STUDY_SLUGS.map((caseStudy) => ({ caseStudy })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, caseStudy } = await params; if (!hasLocale(routing.locales, locale)) notFound(); const study=getCaseStudy(caseStudy); if(!study) notFound(); return publicMetadata(locale,`work/${caseStudy}`,localize(study.title,locale),localize(study.summary,locale)); }
export default async function CaseStudyPage({params}:Props){const{locale,caseStudy}=await params;if(!hasLocale(routing.locales,locale))notFound();const study=getCaseStudy(caseStudy);if(!study)notFound();const t=await getTranslations({locale,namespace:"PublicContent"});const title=localize(study.title,locale);const items=[[t("challenge"),study.challenge],[t("contribution"),study.contribution],[t("result"),study.result],[t("status"),study.status],[t("lessons"),study.lessons]] as const;return <><Breadcrumbs ariaLabel={t("breadcrumbLabel")} items={[{label:t("home"),href:`/${locale}`},{label:t("workTitle"),href:`/${locale}/work`},{label:title}]}/><ContentHero eyebrow={t("workEyebrow")} title={title} summary={localize(study.summary,locale)} illustrativeLabel={localize(study.illustrativeLabel,locale)}/><Section aria-label={title}><Container><div className={styles.featureGrid}>{items.map(([label,value])=><article className={styles.featureCard} key={label}><h2>{label}</h2><p>{localize(value,locale)}</p></article>)}</div></Container></Section></>;}
