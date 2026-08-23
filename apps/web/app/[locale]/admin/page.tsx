import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { requireWorkspaceCapability } from "@/lib/appwrite/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireWorkspaceCapability("admin.operations", locale);
  const french = locale === "fr";

  return (
    <WorkspaceShell current="admin" locale={locale} user={user}>
      <p className="workspace-eyebrow">
        {french ? "Administration opérationnelle" : "Operations administration"}
      </p>
      <h1>{french ? "Contrôles administratifs Umoja" : "Umoja administrative controls"}</h1>
      <p>
        {french
          ? "Cet espace est limité aux capacités opérationnelles approuvées pour le rôle admin. Les contrôles de gouvernance restent bloqués."
          : "This area is limited to approved operational capabilities for the admin role. Governance controls remain blocked."}
      </p>

      <div className="workspace-status" role="status">
        <strong>{french ? "Statut MFA :" : "MFA status:"}</strong>{" "}
        {user.mfaEnabled
          ? french
            ? "activée sur ce compte."
            : "enabled on this account."
          : french
            ? "non activée — l’accès administratif de production ne doit pas être lancé."
            : "not enabled — production administrative access must not launch."}
      </div>

      <div className="workspace-grid">
        <article className="workspace-panel">
          <h2>{french ? "Accès et invitations" : "Access and invitations"}</h2>
          <p>
            {french
              ? "Invitez des membres avec le rôle minimum, contrôlez leur état et révoquez l’accès dès que nécessaire."
              : "Invite members with the minimum role, review their state, and revoke access when required."}
          </p>
        </article>
        <article className="workspace-panel">
          <h2>{french ? "Opérations auditées" : "Audited operations"}</h2>
          <p>
            {french
              ? "Les changements importants doivent conserver un identifiant d’acteur, une action et un horodatage, sans recopier de données personnelles."
              : "Important changes must retain an actor identifier, action, and timestamp without duplicating personal data."}
          </p>
        </article>
        <article className="workspace-panel">
          <h2>{french ? "Gouvernance indisponible" : "Governance unavailable"}</h2>
          <p>
            {french
              ? "Échec sécurisé : aucune action de gouvernance ou publication d’affirmation juridique n’est disponible tant qu’une politique distincte n’est pas approuvée."
              : "Fail closed: governance actions and publication of legal claims remain unavailable until a distinct policy is approved."}
          </p>
        </article>
      </div>
    </WorkspaceShell>
  );
}
