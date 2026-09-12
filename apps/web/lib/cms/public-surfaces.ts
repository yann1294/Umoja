import type { CmsBlock, CmsPage } from "./domain";

export type PublicSurfaceKind =
  "homepage" | "about" | "work-index" | "case-study" | "services" | "contact" | "talent-copy";

export type PublicSurfaceField = Readonly<{
  key: string;
  label: Readonly<{ en: string; fr: string }>;
  multiline?: boolean;
  required?: boolean;
  rows?: number;
}>;

export type PublicSurface = Readonly<{
  group: Readonly<{ en: string; fr: string }>;
  key: string;
  kind: PublicSurfaceKind;
  label: Readonly<{ en: string; fr: string }>;
  slug: string;
  stableKey: string;
  summary: Readonly<{ en: string; fr: string }>;
  translationGroupId: string;
  governanceSensitive?: boolean;
  requiresBothLocales?: boolean;
  requiresConsent?: boolean;
  fields: readonly PublicSurfaceField[];
}>;

const commonHeroFields = [
  field("hero.eyebrow", "Eyebrow", "Surtitre"),
  field("hero.title", "Hero title", "Titre principal", {
    required: true,
    multiline: true,
    rows: 2,
  }),
  field("hero.summary", "Intro / summary", "Introduction / résumé", {
    required: true,
    multiline: true,
    rows: 4,
  }),
] as const;

const aboutSectionFields = [1, 2, 3, 4].flatMap((index) => [
  field(`section.${index}.title`, `Section ${index} heading`, `Titre de section ${index}`, {
    multiline: true,
    rows: 2,
  }),
  field(`section.${index}.body`, `Section ${index} body`, `Texte de section ${index}`, {
    multiline: true,
    rows: 5,
  }),
]);

const caseStudyFields = [
  ...commonHeroFields,
  field("case.challenge", "Challenge", "Défi", { required: true, multiline: true, rows: 4 }),
  field("case.contribution", "Umoja contribution", "Contribution d’Umoja", {
    required: true,
    multiline: true,
    rows: 4,
  }),
  field("case.result", "Result / outcome", "Résultat", {
    required: true,
    multiline: true,
    rows: 4,
  }),
  field("case.status", "Status", "État", { required: true, multiline: true, rows: 3 }),
  field("case.lessons", "Lessons", "Enseignements", {
    required: true,
    multiline: true,
    rows: 4,
  }),
  field("case.period", "Year / period", "Année / période"),
  field("case.capabilities", "Capabilities / skills", "Compétences / capacités"),
  field("case.publishable", "Publishable approval", "Autorisation de publication", {
    required: true,
  }),
] as const;

export const PUBLIC_CONTENT_SURFACES = [
  surface("homepage", "homepage", "home", "homepage:home", "home", {
    group: { en: "Homepage", fr: "Page d’accueil" },
    label: { en: "Homepage", fr: "Page d’accueil" },
    summary: {
      en: "Hero, engagement choices, talent preview copy, proof states, and final calls to action.",
      fr: "Héros, choix d’engagement, texte du vivier de talents, preuves et appels à l’action finaux.",
    },
    fields: [
      field("hero.eyebrow", "Hero eyebrow", "Surtitre du héros"),
      field("hero.title", "Hero title", "Titre du héros", {
        required: true,
        multiline: true,
        rows: 2,
      }),
      field("hero.introduction", "Hero introduction", "Introduction du héros", {
        required: true,
        multiline: true,
        rows: 4,
      }),
      field("hero.primaryAction", "Primary action", "Action principale"),
      field("hero.secondaryAction", "Secondary action", "Action secondaire"),
      field("talent.title", "Talent section title", "Titre de la section talents"),
      field("talent.status", "Talent preview status", "Statut de l’aperçu talents"),
      field(
        "talent.description",
        "Talent section description",
        "Description de la section talents",
        {
          multiline: true,
          rows: 3,
        },
      ),
      field("talent.previewTitle", "Talent preview card title", "Titre de la carte talents", {
        multiline: true,
        rows: 2,
      }),
      field(
        "talent.previewDescription",
        "Talent preview card description",
        "Description de la carte talents",
        {
          multiline: true,
          rows: 3,
        },
      ),
      field("talent.principles.0.title", "Talent principle 1 title", "Titre du principe talents 1"),
      field(
        "talent.principles.0.description",
        "Talent principle 1 description",
        "Description du principe talents 1",
        {
          multiline: true,
          rows: 3,
        },
      ),
      field("talent.principles.1.title", "Talent principle 2 title", "Titre du principe talents 2"),
      field(
        "talent.principles.1.description",
        "Talent principle 2 description",
        "Description du principe talents 2",
        {
          multiline: true,
          rows: 3,
        },
      ),
      field("talent.principles.2.title", "Talent principle 3 title", "Titre du principe talents 3"),
      field(
        "talent.principles.2.description",
        "Talent principle 3 description",
        "Description du principe talents 3",
        {
          multiline: true,
          rows: 3,
        },
      ),
      field("talent.action", "Talent preview action", "Action de l’aperçu talents"),
    ],
  }),
  surface("about:model", "about", "about/model", "about:model", "about-model", {
    group: { en: "About", fr: "À propos" },
    label: { en: "Model", fr: "Modèle" },
    summary: {
      en: "The public explanation of Umoja’s modular delivery and contributor progression model.",
      fr: "L’explication publique du modèle de réalisation modulaire et de progression.",
    },
    fields: [...commonHeroFields, ...aboutSectionFields],
    requiresBothLocales: true,
  }),
  surface("about:governance", "about", "about/governance", "about:governance", "about-governance", {
    group: { en: "About", fr: "À propos" },
    label: { en: "Governance", fr: "Gouvernance" },
    summary: {
      en: "Governance-sensitive public copy. Drafting is allowed; ordinary CMS publication remains blocked.",
      fr: "Texte public sensible de gouvernance. La rédaction est possible; la publication CMS ordinaire reste bloquée.",
    },
    fields: [
      ...commonHeroFields,
      ...aboutSectionFields,
      field(
        "review.status",
        "Governance/legal review status",
        "État de revue gouvernance/juridique",
        { multiline: true, rows: 3 },
      ),
    ],
    governanceSensitive: true,
    requiresBothLocales: true,
  }),
  surface("about:manifesto", "about", "about/manifesto", "about:manifesto", "about-manifesto", {
    group: { en: "About", fr: "À propos" },
    label: { en: "Manifesto", fr: "Manifeste" },
    summary: {
      en: "The public manifesto copy, with permissions and attribution kept explicit.",
      fr: "Le manifeste public, avec permissions et attribution explicites.",
    },
    fields: [
      ...commonHeroFields,
      ...aboutSectionFields,
      field("review.status", "Permission / review status", "État permissions / revue", {
        multiline: true,
        rows: 3,
      }),
    ],
    governanceSensitive: true,
    requiresBothLocales: true,
  }),
  surface("work:index", "work-index", "work", "work:index", "work", {
    group: { en: "Work", fr: "Réalisations" },
    label: { en: "Work index", fr: "Index des réalisations" },
    summary: {
      en: "The selected-work landing page and honest empty state.",
      fr: "La page des réalisations sélectionnées et son état vide honnête.",
    },
    fields: [
      ...commonHeroFields,
      field("empty.title", "Empty-state title", "Titre de l’état vide"),
      field("empty.description", "Empty-state description", "Description de l’état vide", {
        multiline: true,
        rows: 3,
      }),
    ],
    requiresBothLocales: true,
  }),
  surface("services:index", "services", "services", "services:index", "services", {
    group: { en: "Services", fr: "Services" },
    label: { en: "Services overview", fr: "Vue d’ensemble des services" },
    summary: {
      en: "Top-level services copy. Category detail pages still fall back to the approved structured content.",
      fr: "Texte principal des services. Les pages de catégories conservent le contenu structuré approuvé.",
    },
    fields: [...commonHeroFields],
    requiresBothLocales: true,
  }),
  surface("contact:index", "contact", "contact", "contact:index", "contact", {
    group: { en: "Contact", fr: "Contact" },
    label: { en: "Contact", fr: "Contact" },
    summary: {
      en: "Public contact-path copy and calls to action.",
      fr: "Texte des parcours de contact et appels à l’action.",
    },
    fields: [
      field("paths.title", "Contact paths heading", "Titre des parcours de contact", {
        required: true,
      }),
      field(
        "paths.description",
        "Contact paths description",
        "Description des parcours de contact",
        {
          multiline: true,
          rows: 3,
        },
      ),
      field("paths.hire.title", "Hire path title", "Titre du parcours recrutement"),
      field(
        "paths.hire.description",
        "Hire path description",
        "Description du parcours recrutement",
        {
          multiline: true,
          rows: 3,
        },
      ),
      field("paths.hire.action", "Hire path action", "Action du parcours recrutement"),
      field("paths.team.title", "Team path title", "Titre du parcours équipe"),
      field("paths.team.description", "Team path description", "Description du parcours équipe", {
        multiline: true,
        rows: 3,
      }),
      field("paths.team.action", "Team path action", "Action du parcours équipe"),
      field("paths.join.title", "Join path title", "Titre du parcours talents"),
      field("paths.join.description", "Join path description", "Description du parcours talents", {
        multiline: true,
        rows: 3,
      }),
      field("paths.join.action", "Join path action", "Action du parcours talents"),
      field("paths.general.title", "General enquiry title", "Titre demande générale"),
      field(
        "paths.general.description",
        "General enquiry description",
        "Description demande générale",
        {
          multiline: true,
          rows: 3,
        },
      ),
      field("paths.general.action", "General enquiry action", "Action demande générale"),
    ],
    requiresBothLocales: true,
  }),
  surface("talent:index", "talent-copy", "talent", "talent:index", "talent", {
    group: { en: "Talent", fr: "Talents" },
    label: { en: "Talent public copy", fr: "Texte public talents" },
    summary: {
      en: "Public talent-pool landing copy. Profiles remain driven by consent and moderation.",
      fr: "Texte public du vivier de talents. Les profils restent soumis au consentement et à la modération.",
    },
    fields: [...commonHeroFields],
    requiresBothLocales: true,
  }),
] as const satisfies readonly PublicSurface[];

export function caseStudySurface(slug: string): PublicSurface {
  return surface(
    `case-study:${slug}`,
    "case-study",
    `work/${slug}`,
    `case-study:${slug}`,
    `case-study-${slug}`,
    {
      group: { en: "Work", fr: "Réalisations" },
      label: { en: `Case study · ${slug}`, fr: `Étude de cas · ${slug}` },
      summary: {
        en: "A verified, consented case study. Public rendering requires publication consent and publishable approval.",
        fr: "Une étude de cas vérifiée et consentie. Le rendu public exige consentement et autorisation.",
      },
      fields: caseStudyFields,
      requiresBothLocales: true,
      requiresConsent: true,
    },
  );
}

export function field(
  key: string,
  en: string,
  fr: string,
  options: Omit<PublicSurfaceField, "key" | "label"> = {},
): PublicSurfaceField {
  return { key, label: { en, fr }, ...options };
}

function surface(
  key: string,
  kind: PublicSurfaceKind,
  slug: string,
  stableKey: string,
  translationGroupId: string,
  options: Omit<PublicSurface, "key" | "kind" | "slug" | "stableKey" | "translationGroupId">,
): PublicSurface {
  return { key, kind, slug, stableKey, translationGroupId, ...options };
}

export function label(value: Readonly<{ en: string; fr: string }>, locale: "en" | "fr") {
  return value[locale];
}

export function fieldBlock(page: CmsPage | null | undefined, key: string) {
  return page?.blocks.find((block) => block.type === "field" && block.key === key);
}

export function fieldValue(page: CmsPage | null | undefined, key: string, fallback = "") {
  const block = fieldBlock(page, key);
  return block?.type === "field" ? block.value : fallback;
}

export function paragraphs(page: CmsPage | null | undefined) {
  return (
    page?.blocks.filter((block) => block.type === "paragraph").map((block) => block.text) ?? []
  );
}

export function publicSurfaceForPage(page: Pick<CmsPage, "stableKey" | "slug"> | null | undefined) {
  if (!page) return null;
  return (
    PUBLIC_CONTENT_SURFACES.find(
      (surface) => surface.stableKey === page.stableKey || surface.slug === page.slug,
    ) ??
    (page.stableKey.startsWith("case-study:")
      ? caseStudySurface(page.slug.replace(/^work\//, ""))
      : null)
  );
}

export function expectedSlug(surface: PublicSurface) {
  return surface.slug;
}

export function expectedStableKey(surface: PublicSurface) {
  return surface.stableKey;
}

export function isPublishableApproved(page: CmsPage) {
  return fieldValue(page, "case.publishable").toLowerCase() === "yes";
}

export function blockWithoutStructuredFields(blocks: readonly CmsBlock[]) {
  return blocks.filter((block) => block.type !== "field");
}
