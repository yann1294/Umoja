import type { EditorialPage, LocalizedText, PublicCaseStudy } from "@umoja/validation";

import type { AppLocale } from "@/i18n/routing";
import type { StaticCmsFallback } from "./service";
import type { CmsLocale, CmsPage } from "./domain";
import { cmsBlocksSchema, cmsPageInputSchema, hasPublicationConsent } from "./domain";
import { getSupabasePublishedCmsPage } from "./service";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { fieldValue, isPublishableApproved, paragraphs } from "./public-surfaces";

const localized = (value: string): LocalizedText => ({ en: value, fr: value });

export function editorialPageFromCms(
  fallback: EditorialPage,
  cms: CmsPage | null,
  locale: AppLocale,
): EditorialPage {
  if (!cms) return fallback;
  const body = paragraphs(cms);
  const title = fieldValue(cms, "hero.title", cms.title);
  const summary = fieldValue(cms, "hero.summary", body[0] ?? fallback.summary[locale]);
  const eyebrow = fieldValue(cms, "hero.eyebrow", fallback.eyebrow[locale]);
  const sections = fallback.sections.map((section, index) => {
    const ordinal = index + 1;
    return {
      title: {
        ...section.title,
        [locale]: fieldValue(cms, `section.${ordinal}.title`, section.title[locale]),
      },
      body: {
        ...section.body,
        [locale]: fieldValue(cms, `section.${ordinal}.body`, body[index] ?? section.body[locale]),
      },
    };
  });
  return {
    ...fallback,
    eyebrow: { ...fallback.eyebrow, [locale]: eyebrow },
    title: { ...fallback.title, [locale]: title },
    summary: { ...fallback.summary, [locale]: summary },
    sections,
  };
}

export function caseStudyFromCms(page: CmsPage): PublicCaseStudy | null {
  if (!hasPublicationConsent(page) || !isPublishableApproved(page)) return null;
  return {
    slug: page.slug.replace(/^work\//, ""),
    title: localized(fieldValue(page, "hero.title", page.title)),
    summary: localized(fieldValue(page, "hero.summary", paragraphs(page)[0] ?? page.title)),
    challenge: localized(fieldValue(page, "case.challenge")),
    contribution: localized(fieldValue(page, "case.contribution")),
    result: localized(fieldValue(page, "case.result")),
    status: localized(fieldValue(page, "case.status")),
    lessons: localized(fieldValue(page, "case.lessons")),
    illustrativeLabel: localized(fieldValue(page, "case.period", "Verified case study")),
    illustrative: true,
  };
}

export async function listPublishedCmsCaseStudies(locale: CmsLocale) {
  const client = createSupabasePublicClient();
  const { data, error } = await client
    .from("cms_pages")
    .select("*, cms_revisions!cms_pages_current_revision_fk(*)")
    .eq("locale", locale)
    .eq("state", "published")
    .like("stable_key", "case-study:%")
    .not("current_revision_id", "is", null)
    .is("archived_at", null)
    .order("published_at", { ascending: false });
  if (error) return [];
  return (data ?? [])
    .map((row) => {
      const revision = Array.isArray(row.cms_revisions) ? row.cms_revisions[0] : row.cms_revisions;
      if (!revision) return null;
      const input = cmsPageInputSchema.parse({
        stableKey: row.stable_key,
        translationGroupId: row.translation_group_id,
        locale: row.locale,
        slug: row.slug,
        title: revision.title,
        seoTitle: revision.seo_title ?? undefined,
        seoDescription: revision.seo_description ?? undefined,
        blocks: cmsBlocksSchema.parse(revision.blocks),
      });
      return caseStudyFromCms({
        ...input,
        id: row.id,
        state: row.state,
        authorId: row.author_id,
        updatedById: row.updated_by_id,
        currentRevisionId: row.current_revision_id ?? undefined,
        publishedAt: row.published_at ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    })
    .filter((study): study is PublicCaseStudy => Boolean(study));
}

export async function getPublishedCmsCaseStudy(
  locale: CmsLocale,
  slug: string,
  fallback: StaticCmsFallback = {},
) {
  const page = await getSupabasePublishedCmsPage(locale, `work/${slug}`, fallback);
  return page ? caseStudyFromCms(page) : null;
}
