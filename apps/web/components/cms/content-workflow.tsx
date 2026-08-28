import { Button, LinkButton } from "@umoja/ui";
import {
  hasPublicationConsent,
  isGovernanceControlled,
  type CmsPage,
  type CmsRevision,
} from "@umoja/appwrite/cms";
import { rolesHaveCapability } from "@/lib/auth/policy";
import type { SupabaseWorkspaceUser as WorkspaceUser } from "@/lib/supabase/auth";
import { rollbackContent, transitionContent } from "@/app/[locale]/admin/content/actions";

export function ContentWorkflow({
  locale,
  page,
  user,
}: Readonly<{ locale: "en" | "fr"; page: CmsPage; user: WorkspaceUser }>) {
  const french = locale === "fr";
  const canPublish = rolesHaveCapability(user.roles, "cms.publish");
  const governanceBlocked = isGovernanceControlled(page);
  const consentBlocked = !hasPublicationConsent(page);
  return (
    <aside className="cms-workflow" aria-labelledby="cms-workflow-title">
      <div>
        <span className={`cms-status cms-status-${page.state}`}>
          {statusLabel(page.state, locale)}
        </span>
        <h2 id="cms-workflow-title">{french ? "Flux éditorial" : "Editorial workflow"}</h2>
        <p>
          {page.currentRevisionId
            ? french
              ? "Une version complète est actuellement publique; ce brouillon peut évoluer sans la remplacer."
              : "A complete version is currently public; this working copy can change without replacing it."
            : french
              ? "Aucune version de ce contenu n’est publique."
              : "No version of this content is public."}
        </p>
      </div>
      <div className="cms-workflow-actions">
        <LinkButton href={`/${locale}/admin/content/${page.id}/preview`} variant="secondary">
          {french ? "Prévisualiser" : "Preview"}
        </LinkButton>
        {page.state === "draft" && !governanceBlocked && !consentBlocked ? (
          <form action={transitionContent.bind(null, locale, page.id, "submit")}>
            <Button type="submit">{french ? "Soumettre en révision" : "Submit for review"}</Button>
          </form>
        ) : null}
        {page.state === "review" && canPublish && !governanceBlocked && !consentBlocked ? (
          <form action={transitionContent.bind(null, locale, page.id, "publish")}>
            <Button type="submit" variant="highlight">
              {french ? "Publier" : "Publish"}
            </Button>
          </form>
        ) : null}
        {page.currentRevisionId && canPublish ? (
          <form action={transitionContent.bind(null, locale, page.id, "unpublish")}>
            <Button type="submit" variant="secondary">
              {french ? "Dépublier" : "Unpublish"}
            </Button>
          </form>
        ) : null}
        {page.state === "archived" ? (
          <form action={transitionContent.bind(null, locale, page.id, "restore")}>
            <Button type="submit" variant="secondary">
              {french ? "Restaurer" : "Restore"}
            </Button>
          </form>
        ) : !page.currentRevisionId || canPublish ? (
          <form action={transitionContent.bind(null, locale, page.id, "archive")}>
            <Button type="submit" variant="ghost">
              {french ? "Archiver" : "Archive"}
            </Button>
          </form>
        ) : null}
      </div>
      {governanceBlocked ? (
        <p className="cms-workflow-note">
          {french
            ? "Ce contenu juridique ou de gouvernance reste contrôlé par le code jusqu’à l’approbation d’une autorisation distincte."
            : "This legal or governance content remains code-controlled until a distinct authorization is approved."}
        </p>
      ) : consentBlocked ? (
        <p className="cms-workflow-note">
          {french
            ? "Un consentement de publication enregistré est requis avant la révision."
            : "Recorded publication consent is required before review."}
        </p>
      ) : null}
      {!canPublish ? (
        <p className="cms-workflow-note">
          {french
            ? "Votre rôle peut rédiger et soumettre. Un administrateur des opérations autorisé publie le contenu ordinaire."
            : "Your role can draft and submit. An authorized operations administrator publishes ordinary content."}
        </p>
      ) : null}
    </aside>
  );
}

export function RevisionHistory({
  locale,
  page,
  revisions,
}: Readonly<{ locale: "en" | "fr"; page: CmsPage; revisions: readonly CmsRevision[] }>) {
  const french = locale === "fr";
  return (
    <section className="cms-revisions" aria-labelledby="revision-heading">
      <div className="workspace-section-heading">
        <h2 id="revision-heading">{french ? "Historique des révisions" : "Revision history"}</h2>
        <p>{revisions.length}</p>
      </div>
      {revisions.length ? (
        <ol>
          {revisions.map((revision) => (
            <li key={revision.id}>
              <div>
                <strong>
                  {french
                    ? `Révision ${revision.revisionNumber}`
                    : `Revision ${revision.revisionNumber}`}
                </strong>
                <span>{revision.changeSummary}</span>
                <small>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(revision.createdAt))}{" "}
                  · {revision.locale.toUpperCase()} ·{" "}
                  {revision.actorId === page.updatedById
                    ? french
                      ? "éditeur actuel"
                      : "current editor"
                    : french
                      ? "éditeur autorisé"
                      : "authorized editor"}
                </small>
              </div>
              <form action={rollbackContent.bind(null, locale, page.id, revision.id)}>
                <a
                  className="u-button u-button--ghost u-button--small"
                  href={`/${locale}/admin/content/${page.id}/revisions/${revision.id}`}
                >
                  {french ? "Comparer" : "Compare"}
                </a>
                <Button type="submit" variant="secondary" size="small">
                  {french ? "Restaurer comme brouillon" : "Restore as draft"}
                </Button>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <div className="cms-empty-inline">
          <strong>{french ? "Aucune révision" : "No revisions yet"}</strong>
          <p>
            {french
              ? "La première révision apparaîtra après un enregistrement ou une publication."
              : "The first revision appears after an update or publication."}
          </p>
        </div>
      )}
    </section>
  );
}

export function statusLabel(state: CmsPage["state"], locale: "en" | "fr") {
  const labels = {
    draft: { en: "Draft", fr: "Brouillon" },
    review: { en: "In review", fr: "En révision" },
    published: { en: "Published", fr: "Publié" },
    archived: { en: "Archived", fr: "Archivé" },
  } as const;
  return labels[state][locale];
}
