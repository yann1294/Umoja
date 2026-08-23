import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { canUseWorkspaceCapability, requireWorkspaceUser } from "@/lib/appwrite/auth";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireWorkspaceUser(locale);
  const french = locale === "fr";

  return (
    <WorkspaceShell current="workspace" locale={locale} user={user}>
      <p className="workspace-eyebrow">{french ? "Espace privé" : "Private workspace"}</p>
      <h1>{french ? `Bienvenue, ${user.name}` : `Welcome, ${user.name}`}</h1>
      <p>
        {french
          ? "Votre accès est revérifié côté serveur à chaque demande selon l’état du compte, de la session et de l’adhésion à l’équipe Umoja."
          : "Your access is rechecked on the server for every request against account, session, and Umoja Team membership state."}
      </p>

      <div className="workspace-status" role="status">
        <strong>{french ? "Accès actif." : "Access active."}</strong>{" "}
        {user.mfaEnabled
          ? french
            ? "L’authentification multifacteur est activée pour ce compte."
            : "Multi-factor authentication is enabled for this account."
          : french
            ? "L’authentification multifacteur n’est pas encore activée. Elle doit être vérifiée avant tout accès administratif en production."
            : "Multi-factor authentication is not enabled yet. It must be verified before production administrative access."}
      </div>

      <div className="workspace-grid">
        {canUseWorkspaceCapability(user, "cms.manage") ? (
          <article className="workspace-panel">
            <h2>{french ? "Contenu bilingue" : "Bilingual content"}</h2>
            <p>
              {french
                ? "Préparez et révisez le contenu CMS selon les permissions de votre rôle."
                : "Prepare and review CMS content within your role permissions."}
            </p>
          </article>
        ) : null}
        {canUseWorkspaceCapability(user, "intake.review") ? (
          <article className="workspace-panel">
            <h2>{french ? "Demandes sécurisées" : "Secure intake"}</h2>
            <p>
              {french
                ? "Examinez les demandes affectées sans exposer les données privées au navigateur sans autorisation."
                : "Review assigned submissions without exposing private data to an unauthorized browser."}
            </p>
          </article>
        ) : null}
        {canUseWorkspaceCapability(user, "projects.manage") ? (
          <article className="workspace-panel">
            <h2>{french ? "Opérations de projet" : "Project operations"}</h2>
            <p>
              {french
                ? "Coordonnez les projets autorisés; l’accès aux dossiers reste contrôlé individuellement."
                : "Coordinate authorized projects; record access remains individually enforced."}
            </p>
          </article>
        ) : null}
        <article className="workspace-panel">
          <h2>{french ? "Gouvernance protégée" : "Governance protected"}</h2>
          <p>
            {french
              ? "Aucun rôle actuel, y compris admin, ne peut publier de décisions ou d’affirmations juridiques de gouvernance."
              : "No current role, including admin, can publish governance decisions or legal claims."}
          </p>
        </article>
      </div>
    </WorkspaceShell>
  );
}
