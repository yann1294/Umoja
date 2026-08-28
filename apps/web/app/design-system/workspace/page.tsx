import { notFound } from "next/navigation";
import type { UmojaRole } from "@/lib/auth/policy";

import { AdminOverview, WorkspaceOverview } from "@/components/workspace/workspace-overviews";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import "../../[locale]/admin/content/content.css";

export const dynamic = "force-dynamic";

const validRoles: readonly UmojaRole[] = [
  "admin",
  "cms-editor",
  "reviewer",
  "core",
  "extended",
  "project-manager",
];

export default async function WorkspaceFixturePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    locale?: string;
    mfa?: string;
    role?: string;
    roles?: string;
    session?: string;
    state?: string;
    view?: string;
  }>;
}>) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_SYSTEM_ENABLED !== "true") {
    notFound();
  }
  const query = await searchParams;
  const locale = query.locale === "fr" ? "fr" : "en";
  const content = query.view === "content";
  const admin = query.view === "admin" || query.role === "admin";
  const requestedRoles = (query.roles ?? "")
    .split(",")
    .filter((role): role is UmojaRole => validRoles.includes(role as UmojaRole));
  const roles: UmojaRole[] = requestedRoles.length
    ? requestedRoles
    : admin
      ? ["admin"]
      : content
        ? ["admin", "cms-editor"]
        : ["reviewer", "project-manager"];
  const user = {
    id: "visual-fixture-only",
    name:
      query.state === "missing-name"
        ? ""
        : locale === "fr"
          ? "Nom de démonstration exceptionnellement long pour vérifier l’adaptation"
          : "Exceptionally long demonstration name for wrapping review",
    email: "workspace-visual-fixture-with-an-unbroken-address@example.invalid",
    emailVerified: true,
    mfaEnabled: query.mfa ? query.mfa === "active" : admin,
    roles,
  } as const;

  return (
    <WorkspaceShell
      current={content ? "content" : admin ? "admin" : "workspace"}
      locale={locale}
      sessionState={query.session === "stale" ? "stale" : "active"}
      user={user}
    >
      {query.state === "loading" ? (
        <FixtureState locale={locale} state="loading" />
      ) : query.state === "error" ? (
        <FixtureState locale={locale} state="error" />
      ) : query.state === "permission" ? (
        <FixtureState locale={locale} state="permission" />
      ) : content ? (
        <CmsFixture locale={locale} state={query.state} />
      ) : admin ? (
        <AdminOverview locale={locale} user={user} />
      ) : (
        <WorkspaceOverview locale={locale} user={user} />
      )}
    </WorkspaceShell>
  );
}

function CmsFixture({ locale, state }: Readonly<{ locale: "en" | "fr"; state?: string }>) {
  const french = locale === "fr";
  const records = [
    {
      title: french ? "Page d’accueil" : "Homepage",
      key: "homepage:home",
      language: "EN",
      status: french ? "Publié" : "Published",
      state: "published",
    },
    {
      title: french ? "Accueil — version française" : "Homepage — French variant",
      key: "homepage:home",
      language: "FR",
      status: french ? "En révision" : "In review",
      state: "review",
    },
    {
      title: french
        ? "Une vision panafricaine exceptionnellement détaillée pour vérifier les longues lignes éditoriales"
        : "An exceptionally detailed pan-African vision for long editorial titles",
      key: "about:manifesto",
      language: locale.toUpperCase(),
      status: french ? "Brouillon" : "Draft",
      state: "draft",
    },
  ];
  const header = (
    <header className="workspace-page-header">
      <div>
        <p className="workspace-eyebrow">
          {french ? "Administration · contenu" : "Administration · content"}
        </p>
        <h1>{french ? "Contenu public" : "Public content"}</h1>
        <p className="workspace-page-summary">
          {french
            ? "Rédigez les variantes bilingues, organisez la révision et publiez uniquement des versions complètes."
            : "Draft bilingual variants, coordinate review, and publish only complete versions."}
        </p>
      </div>
      <div className="cms-page-header-actions">
        <a className="u-button u-button--secondary u-button--medium" href="#media">
          {french ? "Médias" : "Media"}
        </a>
        <a className="u-button u-button--highlight u-button--medium" href="#editor">
          {french ? "Nouveau contenu" : "New content"}
        </a>
      </div>
    </header>
  );
  if (state === "empty")
    return (
      <>
        {header}
        <section className="cms-empty">
          <p className="workspace-eyebrow">{french ? "Aucun contenu" : "Nothing here yet"}</p>
          <h2>
            {french ? "Créez le premier brouillon bilingue" : "Create the first bilingual draft"}
          </h2>
          <p>
            {french
              ? "Commencez par une variante, puis reliez sa traduction."
              : "Start with one locale, then connect its translation."}
          </p>
        </section>
      </>
    );
  if (state === "preview")
    return (
      <>
        {header}
        <article className="cms-preview">
          <div className="cms-preview-banner">
            <strong>{french ? "Aperçu non public" : "Non-public preview"}</strong>
            <span>FR · /home</span>
          </div>
          <h2>{records[1]!.title}</h2>
          <p>
            {french
              ? "Une prévisualisation privée réutilise les composants publics sans exposer le brouillon."
              : "A private preview reuses public components without exposing the draft."}
          </p>
        </article>
      </>
    );
  if (state === "revision")
    return (
      <>
        {header}
        <div className="cms-comparison">
          <article>
            <p className="workspace-eyebrow">
              {french ? "Révision sélectionnée" : "Selected revision"}
            </p>
            <h2>{french ? "Version publiée complète" : "Complete published version"}</h2>
            <p>
              {french
                ? "Contenu antérieur conservé de manière immuable."
                : "Earlier content retained as an immutable snapshot."}
            </p>
          </article>
          <article>
            <p className="workspace-eyebrow">
              {french ? "Copie de travail actuelle" : "Current working copy"}
            </p>
            <h2>{records[2]!.title}</h2>
            <p>
              {french
                ? "Modifications encore privées et non publiées."
                : "Changes that remain private and unpublished."}
            </p>
          </article>
        </div>
      </>
    );
  if (state === "media")
    return (
      <>
        {header}
        <fieldset className="cms-field-group" id="media">
          <legend>{french ? "Ajouter un média" : "Add media"}</legend>
          <p>
            {french
              ? "PNG, JPEG ou WEBP, avec texte alternatif dans les deux langues."
              : "PNG, JPEG, or WEBP with alt text in both languages."}
          </p>
          <div className="cms-fields cms-fields-two">
            <label className="cms-field">
              <span>{french ? "Fichier" : "File"}</span>
              <input type="file" />
            </label>
            <label className="cms-field">
              <span>{french ? "Consentement" : "Consent"}</span>
              <select>
                <option>{french ? "Non requis" : "Not required"}</option>
              </select>
            </label>
            <label className="cms-field">
              <span>{french ? "Texte alternatif anglais" : "English alt text"}</span>
              <input value="A geometric Umoja workshop graphic" readOnly />
            </label>
            <label className="cms-field">
              <span>{french ? "Texte alternatif français" : "French alt text"}</span>
              <input value="Un visuel géométrique d’un atelier Umoja" readOnly />
            </label>
          </div>
        </fieldset>
      </>
    );
  return (
    <>
      {header}
      {state === "editor" || state === "validation" ? (
        <div className="cms-editor-layout" id="editor">
          <div className="cms-editor">
            {state === "validation" ? (
              <div className="cms-form-status is-error" role="alert">
                <strong>
                  {french ? "Corrigez les champs signalés." : "Correct the highlighted fields."}
                </strong>
                <ul>
                  <li>{french ? "Le titre est obligatoire." : "Title is required."}</li>
                  <li>
                    {french
                      ? "Le texte français dépasse la limite autorisée."
                      : "French text exceeds the allowed length."}
                  </li>
                </ul>
              </div>
            ) : null}
            <fieldset className="cms-field-group">
              <legend>{french ? "Titre et corps" : "Title and body"}</legend>
              <label className="cms-field">
                <span>{french ? "Titre interne et public" : "Internal and public title"}</span>
                <textarea rows={3} defaultValue={records[2]!.title} />
              </label>
              <label className="cms-field">
                <span>{french ? "Corps du contenu" : "Content body"}</span>
                <textarea
                  rows={12}
                  defaultValue={
                    french
                      ? "Un long contenu éditorial se replie naturellement sans masquer les actions ni les messages de validation."
                      : "Long editorial content wraps naturally without hiding actions or validation messages."
                  }
                />
              </label>
            </fieldset>
            <div className="cms-editor-actions">
              <div>
                <strong>{french ? "Modifications non enregistrées" : "Unsaved changes"}</strong>
                <span>{french ? "La publication est distincte." : "Publishing is separate."}</span>
              </div>
              <button className="u-button u-button--primary u-button--medium" type="button">
                {french ? "Enregistrer" : "Save draft"}
              </button>
            </div>
          </div>
          <aside className="cms-workflow">
            <span className="cms-status cms-status-draft">{french ? "Brouillon" : "Draft"}</span>
            <h2>{french ? "Flux éditorial" : "Editorial workflow"}</h2>
            <p>
              {french
                ? "Une version complète reste publique pendant cette modification."
                : "A complete version remains public while this copy is edited."}
            </p>
          </aside>
        </div>
      ) : (
        <>
          <form className="cms-toolbar" role="search">
            <label>
              <span>{french ? "Rechercher" : "Search"}</span>
              <input
                type="search"
                placeholder={french ? "Titre, chemin ou clé" : "Title, path, or key"}
              />
            </label>
            <label>
              <span>{french ? "Langue" : "Language"}</span>
              <select defaultValue="">
                <option value="">{french ? "Toutes" : "All"}</option>
              </select>
            </label>
            <label>
              <span>{french ? "État" : "State"}</span>
              <select defaultValue="">
                <option value="">{french ? "Tous" : "All"}</option>
              </select>
            </label>
            <button className="u-button u-button--secondary u-button--medium" type="submit">
              {french ? "Filtrer" : "Filter"}
            </button>
          </form>
          <ul className="cms-content-list">
            {records.map((record, index) => (
              <li className="cms-content-row" key={index}>
                <div className="cms-content-meta">
                  <h2>
                    <a href="#editor">{record.title}</a>
                  </h2>
                  <small>{record.key}</small>
                </div>
                <div className="cms-content-meta">
                  <span>{record.language}</span>
                  <small>{french ? "Langue" : "Locale"}</small>
                </div>
                <div className="cms-content-meta">
                  <span className={`cms-status cms-status-${record.state}`}>{record.status}</span>
                  <small>
                    {record.state === "published"
                      ? french
                        ? "Version publique disponible"
                        : "Public version available"
                      : french
                        ? "Non public"
                        : "Not public"}
                  </small>
                </div>
                <div className="cms-content-meta">
                  <time>23 Aug 2026</time>
                  <small>/home</small>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function FixtureState({
  locale,
  state,
}: Readonly<{ locale: "en" | "fr"; state: "loading" | "error" | "permission" }>) {
  const french = locale === "fr";
  const copy = {
    loading: {
      eyebrow: french ? "Chargement" : "Loading",
      title: french ? "Préparation de votre espace" : "Preparing your workspace",
      body: french ? "Nous vérifions vos accès actuels." : "We are checking your current access.",
    },
    error: {
      eyebrow: french ? "Service indisponible" : "Service unavailable",
      title: french ? "Cet espace ne peut pas être chargé" : "This workspace cannot be loaded",
      body: french
        ? "Vos données restent protégées. Réessayez lorsque la connexion est rétablie."
        : "Your data remains protected. Try again when the connection returns.",
    },
    permission: {
      eyebrow: french ? "Accès refusé" : "Permission denied",
      title: french ? "Vous n’avez pas accès à cet espace" : "You do not have access to this area",
      body: french
        ? "Votre session est active, mais votre rôle actuel ne permet pas d’ouvrir cette destination."
        : "Your session is active, but your current role cannot open this destination.",
    },
  }[state];
  return (
    <section
      className="workspace-empty-state"
      aria-live={state === "loading" ? "polite" : undefined}
    >
      <p className="workspace-eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p className="workspace-page-summary">{copy.body}</p>
      {state === "loading" ? (
        <div className="workspace-loading-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <a className="u-button u-button--secondary u-button--medium" href={`/${locale}/workspace`}>
          {french ? "Retour à l’espace" : "Return to workspace"}
        </a>
      )}
    </section>
  );
}
