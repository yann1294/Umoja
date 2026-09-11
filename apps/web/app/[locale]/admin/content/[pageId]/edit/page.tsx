import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { ContentEditorForm } from "@/components/cms/content-editor-form";
import { ContentWorkflow, RevisionHistory } from "@/components/cms/content-workflow";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseCmsEditorRepository } from "@/lib/cms/service";
import { label, publicSurfaceForPage } from "@/lib/cms/public-surfaces";
import { saveContent } from "../../actions";

export const dynamic = "force-dynamic";
export default async function EditContent({
  params,
}: Readonly<{ params: Promise<{ locale: string; pageId: string }> }>) {
  const { locale, pageId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  const repository = await createSupabaseCmsEditorRepository();
  const [page, revisions, allPages] = await Promise.all([
    repository.getDraft(pageId),
    repository.listRevisions(pageId),
    repository.list(),
  ]);
  if (!page) notFound();
  const french = locale === "fr";
  const pairedLocale = page.locale === "en" ? "fr" : "en";
  const paired = allPages.find(
    (candidate) =>
      candidate.translationGroupId === page.translationGroupId && candidate.locale === pairedLocale,
  );
  const surface = publicSurfaceForPage(page);
  return (
    <WorkspaceShell current="content" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">
            {french
              ? `Contenu · ${page.locale.toUpperCase()}`
              : `Content · ${page.locale.toUpperCase()}`}
          </p>
          <h1>{page.title}</h1>
          <p className="workspace-page-summary">/{page.slug}</p>
        </div>
      </header>
      <section className="cms-pairing-panel" aria-labelledby="cms-pairing-title">
        <div>
          <p className="workspace-eyebrow">{french ? "Bilingue" : "Bilingual"}</p>
          <h2 id="cms-pairing-title">
            {paired
              ? french
                ? `Variante ${pairedLocale.toUpperCase()} disponible`
                : `${pairedLocale.toUpperCase()} variant available`
              : french
                ? `Variante ${pairedLocale.toUpperCase()} manquante`
                : `${pairedLocale.toUpperCase()} variant missing`}
          </h2>
          <p>
            {surface
              ? french
                ? `Surface : ${label(surface.group, "fr")} · ${label(surface.label, "fr")}. Le chemin et la clé stable sont verrouillés pour préserver la paire.`
                : `Surface: ${label(surface.group, "en")} · ${label(surface.label, "en")}. Path and stable key are locked to preserve the pair.`
              : french
                ? "Ce contenu spécialisé utilise encore les champs techniques."
                : "This specialized content still uses technical fields."}
          </p>
        </div>
        {paired ? (
          <a
            className="u-button u-button--secondary u-button--medium"
            href={`/${locale}/admin/content/${paired.id}/edit`}
          >
            {french ? "Modifier la variante" : "Edit paired variant"}
          </a>
        ) : surface ? (
          <a
            className="u-button u-button--secondary u-button--medium"
            href={`/${locale}/admin/content/new?surface=${surface.key}&contentLocale=${pairedLocale}`}
          >
            {french ? "Créer la variante" : "Create paired variant"}
          </a>
        ) : null}
      </section>
      <div className="cms-editor-layout">
        <ContentEditorForm
          locale={locale}
          page={page}
          action={saveContent.bind(null, locale, page.id)}
        />
        <ContentWorkflow locale={locale} page={page} user={user} />
      </div>
      <RevisionHistory locale={locale} page={page} revisions={revisions} />
    </WorkspaceShell>
  );
}
