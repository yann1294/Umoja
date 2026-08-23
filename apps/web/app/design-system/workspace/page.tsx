import { notFound } from "next/navigation";
import type { UmojaRole } from "@umoja/appwrite";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const dynamic = "force-dynamic";

export default async function WorkspaceFixturePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ locale?: string; role?: string }> }>) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_SYSTEM_ENABLED !== "true") {
    notFound();
  }
  const query = await searchParams;
  const locale = query.locale === "fr" ? "fr" : "en";
  const admin = query.role === "admin";
  const roles: UmojaRole[] = admin ? ["admin"] : ["reviewer", "project-manager"];
  const french = locale === "fr";
  const user = {
    id: "visual-fixture-only",
    name: french
      ? "Nom de démonstration exceptionnellement long pour vérifier l’adaptation"
      : "Exceptionally long demonstration name for wrapping review",
    email: "workspace-visual-fixture@example.invalid",
    emailVerified: true,
    mfaEnabled: admin,
    roles,
  } as const;

  return (
    <WorkspaceShell current={admin ? "admin" : "workspace"} locale={locale} user={user}>
      <p className="workspace-eyebrow">
        {admin
          ? french
            ? "Administration opérationnelle"
            : "Operations administration"
          : french
            ? "Espace privé"
            : "Private workspace"}
      </p>
      <h1>
        {admin
          ? french
            ? "Contrôles administratifs Umoja"
            : "Umoja administrative controls"
          : french
            ? `Bienvenue, ${user.name}`
            : `Welcome, ${user.name}`}
      </h1>
      <p>
        {french
          ? "Cette fixture locale vérifie les états visuels sans créer de compte, d’adresse administrateur ou d’adhésion dans Appwrite Cloud."
          : "This local fixture verifies visual states without creating an account, administrator address, or membership in Appwrite Cloud."}
      </p>
      <div className="workspace-status" role="status">
        {admin
          ? french
            ? "MFA vérifiée pour la fixture; les actions de gouvernance restent bloquées."
            : "MFA verified for the fixture; governance actions remain blocked."
          : french
            ? "Accès de révision et de gestion de projet actif."
            : "Review and project-management access active."}
      </div>
      <div className="workspace-grid">
        <article className="workspace-panel">
          <h2>{french ? "Travail autorisé" : "Authorized work"}</h2>
          <p>
            {french
              ? "Les capacités visibles correspondent uniquement aux rôles actifs."
              : "Visible capabilities correspond only to active roles."}
          </p>
        </article>
        <article className="workspace-panel">
          <h2>{french ? "Gouvernance protégée" : "Governance protected"}</h2>
          <p>
            {french
              ? "Aucun rôle actuel ne peut publier d’affirmation juridique ou de gouvernance."
              : "No current role can publish a legal or governance claim."}
          </p>
        </article>
      </div>
    </WorkspaceShell>
  );
}
