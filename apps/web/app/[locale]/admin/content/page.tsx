import { Button, LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { statusLabel } from "@/components/cms/content-workflow";
import { rolesHaveCapability } from "@/lib/auth/policy";
import { routing } from "@/i18n/routing";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseCmsEditorRepository } from "@/lib/cms/service";
import type { CmsPage } from "@/lib/cms/domain";
import { hasPublicationConsent, isGovernanceControlled } from "@/lib/cms/domain";
import {
  PUBLIC_CONTENT_SURFACES,
  caseStudySurface,
  label,
  publicSurfaceForPage,
  type PublicSurface,
} from "@/lib/cms/public-surfaces";
import { transitionContent } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContentIndex({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; state?: string; contentLocale?: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  const query = await searchParams;
  const pages = (
    await (
      await createSupabaseCmsEditorRepository()
    ).list({
      query: query.q,
      locale:
        query.contentLocale === "en" || query.contentLocale === "fr"
          ? query.contentLocale
          : undefined,
      state: ["draft", "review", "published", "archived"].includes(query.state ?? "")
        ? (query.state as "draft" | "review" | "published" | "archived")
        : undefined,
    })
  ).filter((page) => !page.stableKey.startsWith("media:"));
  const french = locale === "fr";
  const canPublish = rolesHaveCapability(user.roles, "cms.publish");
  const caseStudySurfaces = pages
    .filter((page) => page.stableKey.startsWith("case-study:"))
    .map((page) => caseStudySurface(page.slug.replace(/^work\//, "")));
  const surfaces = dedupeSurfaces([...PUBLIC_CONTENT_SURFACES, ...caseStudySurfaces]);
  return (
    <WorkspaceShell current="content" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">
            {french ? "Administration · contenu" : "Administration · content"}
          </p>
          <h1>{french ? "Contenu public" : "Public content"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Rédigez les versions anglaise et française, préparez la révision et publiez des versions complètes."
              : "Draft English and French variants, prepare review, and publish complete versions."}
          </p>
        </div>
        <div className="cms-page-header-actions">
          <LinkButton href={`/${locale}/admin/content/media`} variant="secondary">
            {french ? "Médias" : "Media"}
          </LinkButton>
          <LinkButton href={`/${locale}/admin/content/new?surface=case-study`} variant="secondary">
            {french ? "Nouvelle étude de cas" : "New case study"}
          </LinkButton>
          <LinkButton href={`/${locale}/admin/content/new`} variant="highlight">
            {french ? "Nouveau contenu" : "New content"}
          </LinkButton>
        </div>
      </header>
      <form className="cms-toolbar" role="search">
        <label>
          <span>{french ? "Rechercher" : "Search"}</span>
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder={french ? "Titre, chemin ou clé" : "Title, path, or key"}
          />
        </label>
        <label>
          <span>{french ? "Langue" : "Language"}</span>
          <select name="contentLocale" defaultValue={query.contentLocale ?? ""}>
            <option value="">{french ? "Toutes" : "All"}</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label>
          <span>{french ? "État" : "State"}</span>
          <select name="state" defaultValue={query.state ?? ""}>
            <option value="">{french ? "Tous" : "All"}</option>
            <option value="draft">{french ? "Brouillon" : "Draft"}</option>
            <option value="review">{french ? "En révision" : "In review"}</option>
            <option value="published">{french ? "Publié" : "Published"}</option>
            <option value="archived">{french ? "Archivé" : "Archived"}</option>
          </select>
        </label>
        <button className="u-button u-button--secondary u-button--medium" type="submit">
          {french ? "Filtrer" : "Filter"}
        </button>
      </form>
      {surfaces.length ? (
        <div className="cms-surface-groups">
          {groupSurfaces(surfaces).map(([group, groupSurfaces]) => (
            <section className="cms-surface-group" key={group} aria-labelledby={`cms-${group}`}>
              <div className="workspace-section-heading">
                <h2 id={`cms-${group}`}>{group}</h2>
                <p>{groupSurfaces.length}</p>
              </div>
              <ul className="cms-surface-list">
                {groupSurfaces.map((surface) => (
                  <SurfaceCard
                    canPublish={canPublish}
                    key={surface.key}
                    locale={locale}
                    pages={pages}
                    surface={surface}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <section className="cms-empty">
          <p className="workspace-eyebrow">{french ? "Aucun résultat" : "Nothing here yet"}</p>
          <h2>
            {french ? "Créez le premier brouillon bilingue" : "Create the first bilingual draft"}
          </h2>
          <p>
            {french
              ? "Commencez par une variante, puis créez sa traduction avec le même groupe de traduction."
              : "Start with one locale, then create its counterpart using the same translation group."}
          </p>
          <LinkButton href={`/${locale}/admin/content/new`}>
            {french ? "Créer un brouillon" : "Create a draft"}
          </LinkButton>
        </section>
      )}
    </WorkspaceShell>
  );
}

function SurfaceCard({
  canPublish,
  locale,
  pages,
  surface,
}: Readonly<{
  canPublish: boolean;
  locale: "en" | "fr";
  pages: readonly CmsPage[];
  surface: PublicSurface;
}>) {
  const french = locale === "fr";
  const variants = {
    en: pages.find((page) => page.locale === "en" && matchesSurface(page, surface)),
    fr: pages.find((page) => page.locale === "fr" && matchesSurface(page, surface)),
  };
  const missing = !variants.en || !variants.fr;
  const latest = [variants.en, variants.fr]
    .filter((page): page is CmsPage => Boolean(page))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const governanceBlocked =
    surface.governanceSensitive ||
    [variants.en, variants.fr].some((page) => (page ? isGovernanceControlled(page) : false));
  return (
    <li className="cms-surface-card">
      <div className="cms-surface-card-main">
        <div>
          <p className="workspace-eyebrow">{label(surface.group, locale)}</p>
          <h3>{label(surface.label, locale)}</h3>
          <p>{label(surface.summary, locale)}</p>
        </div>
        <div
          className="cms-locale-statuses"
          aria-label={french ? "États par langue" : "Locale states"}
        >
          <LocaleStatus locale="en" page={variants.en} uiLocale={locale} surface={surface} />
          <LocaleStatus locale="fr" page={variants.fr} uiLocale={locale} surface={surface} />
        </div>
      </div>
      <div className="cms-surface-flags">
        {missing ? (
          <span className="cms-warning">
            {french ? "Traduction manquante" : "Missing translation"}
          </span>
        ) : null}
        {governanceBlocked ? (
          <span className="cms-warning">
            {french ? "Publication gouvernance bloquée" : "Governance publication blocked"}
          </span>
        ) : null}
        {surface.requiresConsent ? (
          <span className="cms-warning">{french ? "Consentement requis" : "Consent required"}</span>
        ) : null}
        {latest ? (
          <span>
            {french ? "Mis à jour " : "Updated "}
            <time dateTime={latest.updatedAt}>
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                new Date(latest.updatedAt),
              )}
            </time>
          </span>
        ) : null}
      </div>
      <details className="cms-technical-details">
        <summary>{french ? "Identifiants techniques" : "Technical identifiers"}</summary>
        <dl>
          <div>
            <dt>{french ? "Clé stable" : "Stable key"}</dt>
            <dd>{surface.stableKey}</dd>
          </div>
          <div>
            <dt>{french ? "Chemin" : "Path"}</dt>
            <dd>/{surface.slug}</dd>
          </div>
          <div>
            <dt>{french ? "Groupe bilingue" : "Translation group"}</dt>
            <dd>{surface.translationGroupId}</dd>
          </div>
        </dl>
      </details>
      <div className="cms-surface-actions">
        {(["en", "fr"] as const).map((contentLocale) => {
          const page = variants[contentLocale];
          return page ? (
            <LinkButton
              href={`/${locale}/admin/content/${page.id}/edit`}
              key={contentLocale}
              variant="secondary"
            >
              {contentLocale === "fr"
                ? french
                  ? "Modifier FR"
                  : "Edit FR"
                : french
                  ? "Modifier EN"
                  : "Edit EN"}
            </LinkButton>
          ) : (
            <LinkButton
              href={`/${locale}/admin/content/new?surface=${surface.key}&contentLocale=${contentLocale}`}
              key={contentLocale}
              variant="secondary"
            >
              {contentLocale === "fr"
                ? french
                  ? "Créer FR"
                  : "Create FR"
                : french
                  ? "Créer EN"
                  : "Create EN"}
            </LinkButton>
          );
        })}
        {latest ? (
          <LinkButton href={`/${locale}/admin/content/${latest.id}/preview`} variant="secondary">
            {french ? "Prévisualiser" : "Preview"}
          </LinkButton>
        ) : null}
        {[variants.en, variants.fr].map((page) =>
          page?.state === "draft" && !governanceBlocked && hasPublicationConsent(page) ? (
            <form action={transitionContent.bind(null, locale, page.id, "submit")} key={page.id}>
              <Button type="submit" size="small" variant="secondary">
                {page.locale.toUpperCase()} {french ? "en révision" : "to review"}
              </Button>
            </form>
          ) : page?.state === "review" && canPublish && !governanceBlocked ? (
            <form action={transitionContent.bind(null, locale, page.id, "publish")} key={page.id}>
              <Button type="submit" size="small" variant="highlight">
                {french ? "Publier" : "Publish"} {page.locale.toUpperCase()}
              </Button>
            </form>
          ) : null,
        )}
      </div>
    </li>
  );
}

function LocaleStatus({
  locale,
  page,
  surface,
  uiLocale,
}: Readonly<{
  locale: "en" | "fr";
  page?: CmsPage;
  surface: PublicSurface;
  uiLocale: "en" | "fr";
}>) {
  const blocked = surface.requiresBothLocales && !page;
  return (
    <div className={blocked ? "cms-locale-status is-missing" : "cms-locale-status"}>
      <strong>{locale.toUpperCase()}</strong>
      {page ? (
        <>
          <span className={`cms-status cms-status-${page.state}`}>
            {statusLabel(page.state, uiLocale)}
          </span>
          <small>/{page.slug}</small>
        </>
      ) : (
        <>
          <span className="cms-status cms-status-archived">
            {uiLocale === "fr" ? "Manquant" : "Missing"}
          </span>
          <small>{uiLocale === "fr" ? "Créer la variante" : "Create variant"}</small>
        </>
      )}
    </div>
  );
}

function matchesSurface(page: CmsPage, surface: PublicSurface) {
  return publicSurfaceForPage(page)?.key === surface.key;
}

function dedupeSurfaces(surfaces: readonly PublicSurface[]) {
  return [...new Map(surfaces.map((surface) => [surface.key, surface])).values()];
}

function groupSurfaces(surfaces: readonly PublicSurface[]) {
  const groups = new Map<string, PublicSurface[]>();
  for (const surface of surfaces) {
    const group = label(surface.group, "en");
    groups.set(group, [...(groups.get(group) ?? []), surface]);
  }
  return [...groups.entries()];
}
