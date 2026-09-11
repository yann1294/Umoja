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
                {item.category ? <small>{item.category}</small> : null}
                {item.technologies.length ? <p>{item.technologies.join(" · ")}</p> : null}
                <span>{item.publication_state}</span>
                <span>
                  {" "}
                  ·{" "}
                  {item.public_consent_at
                    ? french
                      ? "Publication consentie"
                      : "Publication consented"
                    : french
                      ? "Privé"
                      : "Private"}
                </span>
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
            {french ? "Domaine ou type de projet" : "Domain or project type"}
            <input
              name="category"
              maxLength={80}
              placeholder={french ? "Produit, data…" : "Product, data…"}
            />
          </label>
          <label>
            {french ? "Technologies (séparées par des virgules)" : "Technologies (comma-separated)"}
            <input
              name="technologies"
              maxLength={240}
              placeholder={french ? "React, Supabase, PostgreSQL" : "React, Supabase, PostgreSQL"}
            />
          </label>
          <label>
            {french ? "Lien externe sûr" : "Safe external link"}
            <input name="externalUrl" type="url" placeholder="https://" />
          </label>
          <label>
            <input type="checkbox" name="publicConsent" />{" "}
            {french
              ? "Je consens à proposer cet exemple pour publication."
              : "I consent to propose this example for publication."}
          </label>
          <label>
            <input type="checkbox" name="requestReview" />{" "}
            {french
              ? "Soumettre cet exemple à la revue Umoja"
              : "Submit this example for Umoja review"}
          </label>
          <p className="workspace-help">
            {french
              ? "Umoja ne publie que les exemples approuvés avec consentement. N’incluez pas de données client confidentielles."
              : "Umoja publishes only approved examples with consent. Do not include confidential client data."}
          </p>
          <button className="workspace-primary-action" type="submit">
            {french ? "Enregistrer" : "Save project"}
          </button>
        </section>
      </form>
    </WorkspaceShell>
  );
}
