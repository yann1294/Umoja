import { LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseCmsEditorRepository } from "@/lib/cms/service";

export const dynamic = "force-dynamic";
export default async function RevisionComparison({
  params,
}: Readonly<{ params: Promise<{ locale: string; pageId: string; revisionId: string }> }>) {
  const { locale, pageId, revisionId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  const repository = await createSupabaseCmsEditorRepository();
  const [page, revisions] = await Promise.all([
    repository.getDraft(pageId),
    repository.listRevisions(pageId),
  ]);
  const revision = revisions.find((item) => item.id === revisionId);
  if (!page || !revision) notFound();
  const french = locale === "fr";
  const body = (blocks: typeof page.blocks) =>
    blocks
      .filter((block) => block.type === "paragraph")
      .map((block) => block.text)
      .join("\n\n") || (french ? "Aucun paragraphe" : "No paragraph content");
  return (
    <WorkspaceShell current="content" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">
            {french ? "Contenu · comparaison" : "Content · comparison"}
          </p>
          <h1>
            {french ? `Révision ${revision.revisionNumber}` : `Revision ${revision.revisionNumber}`}
          </h1>
          <p className="workspace-page-summary">
            {revision.changeSummary} ·{" "}
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(revision.createdAt),
            )}
          </p>
        </div>
        <LinkButton href={`/${locale}/admin/content/${page.id}/edit`} variant="secondary">
          {french ? "Retour à l’éditeur" : "Back to editor"}
        </LinkButton>
      </header>
      <div className="cms-comparison">
        <article>
          <p className="workspace-eyebrow">
            {french ? "Révision sélectionnée" : "Selected revision"}
          </p>
          <h2>{revision.title}</h2>
          <p>{body(revision.blocks)}</p>
        </article>
        <article>
          <p className="workspace-eyebrow">
            {french ? "Copie de travail actuelle" : "Current working copy"}
          </p>
          <h2>{page.title}</h2>
          <p>{body(page.blocks)}</p>
        </article>
      </div>
    </WorkspaceShell>
  );
}
