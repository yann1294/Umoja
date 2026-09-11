import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseApplicant } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileBundle } from "@/lib/profile/service";
import { routing } from "@/i18n/routing";
import { addPortfolio, archivePortfolio } from "./actions";

export const dynamic = "force-dynamic";
export default async function PortfolioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseApplicant(locale);
  const bundle = await getProfileBundle(await createSupabaseServerClient(), user.id);
  const french = locale === "fr";
  return (
    <WorkspaceShell current="portfolio" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">Portfolio</p>
          <h1>{french ? "Votre travail" : "Your work"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Les fichiers restent indisponibles tant qu’un scanner réel n’est pas configuré."
              : "Files remain unavailable until a real malware scanner is configured."}
          </p>
        </div>
      </header>
      <section className="workspace-panel">
        {bundle.portfolio.length ? (
          <ul>
            {bundle.portfolio.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <p>{item.role_summary}</p>
                <span>{item.publication_state}</span>
                <form action={archivePortfolio.bind(null, locale as "en" | "fr")}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit">{french ? "Archiver" : "Archive"}</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {french
              ? "Ajoutez des métadonnées de projet ou des liens externes sûrs."
              : "Add project metadata or safe external links."}
          </p>
        )}
        <p className="workspace-help">
          {french
            ? "Aucun téléchargement ou aperçu de fichier n’est disponible dans ce pilote."
            : "File uploads and previews are unavailable in this pilot."}
        </p>
      </section>
      <form className="workspace-form" action={addPortfolio.bind(null, locale as "en" | "fr")}>
        <section className="workspace-panel">
          <h2>{french ? "Ajouter un projet" : "Add a project"}</h2>
          <label>
            {french ? "Titre" : "Title"}
            <input name="title" required maxLength={200} />
          </label>
          <label>
            {french ? "Votre rôle" : "Your role"}
            <textarea name="roleSummary" required maxLength={2000} rows={4} />
          </label>
          <label>
            {french ? "Lien externe sûr" : "Safe external link"}
            <input name="externalUrl" type="url" placeholder="https://" />
          </label>
          <button className="workspace-primary-action" type="submit">
            {french ? "Enregistrer" : "Save project"}
          </button>
        </section>
      </form>
    </WorkspaceShell>
  );
}
