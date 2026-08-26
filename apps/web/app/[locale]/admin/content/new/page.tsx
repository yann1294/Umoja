import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { ContentEditorForm } from "@/components/cms/content-editor-form";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createContent } from "../actions";

export const dynamic = "force-dynamic";
export default async function NewContent({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  const french = locale === "fr";
  return (
    <WorkspaceShell current="content" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">{french ? "Contenu · nouveau" : "Content · new"}</p>
          <h1>{french ? "Créer un brouillon" : "Create a draft"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Créez une variante structurée. Rien ne devient public à cette étape."
              : "Create a structured locale variant. Nothing becomes public at this stage."}
          </p>
        </div>
      </header>
      <ContentEditorForm locale={locale} action={createContent.bind(null, locale)} />
    </WorkspaceShell>
  );
}
