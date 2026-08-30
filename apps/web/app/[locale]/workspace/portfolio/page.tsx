import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseWorkspaceUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileBundle } from "@/lib/profile/service";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export default async function PortfolioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceUser(locale);
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
    </WorkspaceShell>
  );
}
