import { LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { statusLabel } from "@/components/cms/content-workflow";
import { routing } from "@/i18n/routing";
import { requireWorkspaceCapability } from "@/lib/appwrite/auth";
import { createSessionServices } from "@/lib/appwrite/session";
import { createCmsEditorRepository } from "@/lib/cms/service";

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
  const user = await requireWorkspaceCapability("cms.manage", locale);
  const services = await createSessionServices();
  if (!services) notFound();
  const query = await searchParams;
  const pages = (
    await createCmsEditorRepository(services.tables).list({
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
      {pages.length ? (
        <ul className="cms-content-list" aria-label={french ? "Contenus" : "Content items"}>
          {pages.map((page) => (
            <li className="cms-content-row" key={page.id}>
              <div className="cms-content-meta">
                <h2>
                  <a href={`/${locale}/admin/content/${page.id}/edit`}>{page.title}</a>
                </h2>
                <small>{page.stableKey}</small>
              </div>
              <div className="cms-content-meta">
                <span>{page.locale.toUpperCase()}</span>
                <small>{french ? "Langue" : "Locale"}</small>
              </div>
              <div className="cms-content-meta">
                <span className={`cms-status cms-status-${page.state}`}>
                  {statusLabel(page.state, locale)}
                </span>
                <small>
                  {page.currentRevisionId
                    ? french
                      ? "Version publique disponible"
                      : "Public version available"
                    : french
                      ? "Non public"
                      : "Not public"}
                </small>
              </div>
              <div className="cms-content-meta">
                <time dateTime={page.updatedAt}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    new Date(page.updatedAt),
                  )}
                </time>
                <small>/{page.slug}</small>
              </div>
            </li>
          ))}
        </ul>
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
