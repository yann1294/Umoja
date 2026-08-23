import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { ContentEditorForm } from "@/components/cms/content-editor-form";
import { ContentWorkflow, RevisionHistory } from "@/components/cms/content-workflow";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { requireWorkspaceCapability } from "@/lib/appwrite/auth";
import { createSessionServices } from "@/lib/appwrite/session";
import { createCmsEditorRepository } from "@/lib/cms/service";
import { saveContent } from "../../actions";

export const dynamic = "force-dynamic";
export default async function EditContent({
  params,
}: Readonly<{ params: Promise<{ locale: string; pageId: string }> }>) {
  const { locale, pageId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireWorkspaceCapability("cms.manage", locale);
  const services = await createSessionServices();
  if (!services) notFound();
  const repository = createCmsEditorRepository(services.tables);
  const [page, revisions] = await Promise.all([
    repository.getDraft(pageId),
    repository.listRevisions(pageId),
  ]);
  if (!page) notFound();
  const french = locale === "fr";
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
