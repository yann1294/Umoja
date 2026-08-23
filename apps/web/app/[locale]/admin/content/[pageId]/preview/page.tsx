import { LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { requireWorkspaceCapability } from "@/lib/appwrite/auth";
import { createSessionServices } from "@/lib/appwrite/session";
import { createCmsEditorRepository } from "@/lib/cms/service";

export const dynamic = "force-dynamic";
export default async function PreviewContent({
  params,
}: Readonly<{ params: Promise<{ locale: string; pageId: string }> }>) {
  const { locale, pageId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireWorkspaceCapability("cms.manage", locale);
  const services = await createSessionServices();
  if (!services) notFound();
  const page = await createCmsEditorRepository(services.tables).getDraft(pageId);
  if (!page) notFound();
  const french = locale === "fr";
  return (
    <WorkspaceShell current="content" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">
            {french ? "Prévisualisation privée" : "Private preview"}
          </p>
          <h1>{french ? "Aperçu du brouillon" : "Draft preview"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Cet aperçu est protégé et n’utilise pas la requête publique."
              : "This preview is protected and does not use the public query."}
          </p>
        </div>
        <LinkButton href={`/${locale}/admin/content/${page.id}/edit`} variant="secondary">
          {french ? "Retour à l’éditeur" : "Back to editor"}
        </LinkButton>
      </header>
      <article className="cms-preview">
        <div className="cms-preview-banner">
          <strong>{french ? "Aperçu non public" : "Non-public preview"}</strong>
          <span>
            {page.locale.toUpperCase()} · /{page.slug}
          </span>
        </div>
        <h2>{page.title}</h2>
        {page.blocks.map((block, index) =>
          block.type === "heading" ? (
            block.level === 2 ? (
              <h2 key={index}>{block.text}</h2>
            ) : (
              <h3 key={index}>{block.text}</h3>
            )
          ) : block.type === "paragraph" ? (
            <p key={index}>{block.text}</p>
          ) : block.type === "callout" ? (
            <aside key={index}>
              <strong>{block.title}</strong>
              <p>{block.text}</p>
            </aside>
          ) : block.type === "field" ? (
            <div className="cms-preview-field" key={index}>
              <small>{block.label}</small>
              <strong>{block.value}</strong>
            </div>
          ) : block.type === "link" ? (
            <p key={index}>
              <a href={block.href}>{block.label}</a>
            </p>
          ) : null,
        )}
      </article>
    </WorkspaceShell>
  );
}
