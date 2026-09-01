import { Button } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { MediaReplacement, MediaUpload } from "@/components/cms/media-upload";
import { statusLabel } from "@/components/cms/content-workflow";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { rolesHaveCapability } from "@/lib/auth/policy";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseCmsEditorRepository } from "@/lib/cms/service";
import { transitionMedia, updateMediaMetadata } from "./actions";

export const dynamic = "force-dynamic";
export default async function MediaPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  const pages = (await (await createSupabaseCmsEditorRepository()).list()).filter((page) =>
    page.stableKey.startsWith("media:"),
  );
  const french = locale === "fr";
  const canPublish = rolesHaveCapability(user.roles, "cms.publish");
  return (
    <WorkspaceShell current="content" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">{french ? "Contenu · médias" : "Content · media"}</p>
          <h1>{french ? "Bibliothèque média" : "Media library"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Gérez les fichiers publics et leurs métadonnées bilingues dans le compartiment partagé protégé."
              : "Manage public files and bilingual metadata in the protected shared bucket."}
          </p>
        </div>
      </header>
      <MediaUpload locale={locale} />
      <section className="workspace-section" aria-labelledby="media-list-heading">
        <div className="workspace-section-heading">
          <h2 id="media-list-heading">{french ? "Médias enregistrés" : "Saved media"}</h2>
          <p>{pages.length}</p>
        </div>
        {pages.length ? (
          <ul className="cms-content-list">
            {pages.map((page) => {
              const metadata = page.blocks.find((block) => block.type === "media-metadata");
              return (
                <li className="cms-content-row cms-media-row" key={page.id}>
                  <div className="cms-content-meta">
                    <h2>{page.title}</h2>
                    <small>
                      {metadata?.type === "media-metadata"
                        ? `${metadata.mimeType} · ${Math.ceil(metadata.size / 1024)} KB`
                        : ""}
                    </small>
                  </div>
                  <div className="cms-content-meta">
                    <span className={`cms-status cms-status-${page.state}`}>
                      {statusLabel(page.state, locale)}
                    </span>
                    <small>
                      {metadata?.type === "media-metadata" ? metadata.consentState : ""}
                    </small>
                  </div>
                  <div className="cms-content-meta">
                    <span>{metadata?.type === "media-metadata" ? metadata.altEn : ""}</span>
                    <small>{metadata?.type === "media-metadata" ? metadata.altFr : ""}</small>
                  </div>
                  <div className="cms-workflow-actions">
                    {metadata?.type === "media-metadata" ? (
                      <details className="cms-media-details">
                        <summary>{french ? "Modifier les métadonnées" : "Edit metadata"}</summary>
                        <form action={updateMediaMetadata.bind(null, locale, page.id)}>
                          <label className="cms-field">
                            <span>{french ? "Texte alternatif anglais" : "English alt text"}</span>
                            <textarea
                              name="altEn"
                              defaultValue={metadata.altEn}
                              required
                              rows={3}
                            />
                          </label>
                          <label className="cms-field">
                            <span>{french ? "Texte alternatif français" : "French alt text"}</span>
                            <textarea
                              name="altFr"
                              defaultValue={metadata.altFr}
                              required
                              rows={3}
                            />
                          </label>
                          <label className="cms-field">
                            <span>{french ? "Références d’utilisation" : "Usage references"}</span>
                            <textarea
                              name="usageReferences"
                              defaultValue={metadata.usageReferences.join("\n")}
                              rows={3}
                            />
                          </label>
                          <label className="cms-field">
                            <span>{french ? "Consentement" : "Consent"}</span>
                            <select name="consentState" defaultValue={metadata.consentState}>
                              <option value="not-required">
                                {french ? "Non requis" : "Not required"}
                              </option>
                              <option value="recorded">{french ? "Enregistré" : "Recorded"}</option>
                              <option value="revoked">{french ? "Révoqué" : "Revoked"}</option>
                            </select>
                          </label>
                          <Button type="submit" size="small">
                            {french ? "Enregistrer les métadonnées" : "Save metadata"}
                          </Button>
                        </form>
                      </details>
                    ) : null}
                    <MediaReplacement locale={locale} pageId={page.id} />
                    {page.state === "draft" &&
                    metadata?.type === "media-metadata" &&
                    metadata.consentState !== "revoked" ? (
                      <form action={transitionMedia.bind(null, locale, page.id, "submit")}>
                        <Button type="submit" size="small">
                          {french ? "Soumettre" : "Submit"}
                        </Button>
                      </form>
                    ) : null}
                    {page.state === "review" &&
                    canPublish &&
                    metadata?.type === "media-metadata" &&
                    metadata.consentState !== "revoked" ? (
                      <form action={transitionMedia.bind(null, locale, page.id, "publish")}>
                        <Button type="submit" size="small" variant="highlight">
                          {french ? "Publier" : "Publish"}
                        </Button>
                      </form>
                    ) : null}
                    {page.currentRevisionId && canPublish ? (
                      <form action={transitionMedia.bind(null, locale, page.id, "unpublish")}>
                        <Button type="submit" size="small" variant="secondary">
                          {french ? "Dépublier" : "Unpublish"}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="cms-empty-inline">
            <strong>{french ? "Aucun média" : "No media yet"}</strong>
            <p>
              {french
                ? "Ajoutez un fichier avec ses deux textes alternatifs."
                : "Add a file with both alt-text variants."}
            </p>
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
