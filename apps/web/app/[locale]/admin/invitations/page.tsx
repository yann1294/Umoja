import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { invitationListUnavailableReason } from "@/lib/invitations/errors";
import { listUmojaInvitations } from "@/lib/invitations/service";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { InvitationAdmin } from "./invitation-admin";
import "./invitations.css";

export const dynamic = "force-dynamic";

export default async function InvitationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const french = locale === "fr";
  const invitationsResult = await listUmojaInvitations(locale)
    .then((invitations) => ({ invitations, error: null }))
    .catch((error: unknown) => ({
      invitations: null,
      error: invitationListUnavailableReason(error),
    }));
  return (
    <WorkspaceShell current="invitations" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">{french ? "Administration" : "Administration"}</p>
          <h1>{french ? "Invitations de compte" : "Account invitations"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Invitez une personne par le parcours Umoja, sans lui accorder automatiquement des privilèges élevés."
              : "Invite someone through the Umoja-owned journey without automatically granting elevated privileges."}
          </p>
        </div>
      </header>
      {invitationsResult.invitations ? (
        <InvitationAdmin invitations={invitationsResult.invitations} locale={locale} />
      ) : (
        <InvitationSetupUnavailable locale={locale} reason={invitationsResult.error} />
      )}
    </WorkspaceShell>
  );
}

function InvitationSetupUnavailable({
  locale,
  reason,
}: Readonly<{
  locale: "en" | "fr";
  reason: "schema-missing" | "permission-denied" | "encryption-unavailable" | "query-unavailable";
}>) {
  const french = locale === "fr";
  const copy = {
    "schema-missing": {
      title: french
        ? "Le modèle d’invitation n’est pas installé"
        : "Invitation schema is not installed",
      body: french
        ? "Appliquez la migration additive account_invitations sur la base Supabase de développement utilisée par cette application, puis rechargez cette page."
        : "Apply the additive account_invitations migration to the Supabase development database used by this app, then reload this page.",
      action: "supabase/migrations/20260910100000_account_invitations.sql",
    },
    "permission-denied": {
      title: french ? "Lecture des invitations refusée" : "Invitation access was denied",
      body: french
        ? "Le compte connecté doit être vérifié, avoir une adhésion active et posséder le rôle administrateur protégé dans les tables relationnelles."
        : "The signed-in account must be verified, have active membership, and hold the protected admin role in relational tables.",
      action: french
        ? "Vérifiez membership_history et user_roles pour cet administrateur."
        : "Verify membership_history and user_roles for this administrator.",
    },
    "encryption-unavailable": {
      title: french
        ? "Configuration de chiffrement indisponible"
        : "Encryption configuration is unavailable",
      body: french
        ? "Les invitations existent, mais le serveur ne peut pas déchiffrer les adresses avec la configuration active."
        : "Invitation rows exist, but the server cannot decrypt addresses with the active configuration.",
      action: french
        ? "Vérifiez les variables UMOJA_* de chiffrement sans changer les clés."
        : "Verify the UMOJA_* encryption variables without changing keys.",
    },
    "query-unavailable": {
      title: french ? "Invitations indisponibles" : "Invitations are unavailable",
      body: french
        ? "La lecture a échoué côté Supabase. Consultez le journal serveur; seuls des codes d’erreur expurgés sont enregistrés."
        : "The Supabase read failed. Check the server log; only redacted error codes are recorded.",
      action: french
        ? "Réessayez après correction de la configuration."
        : "Try again after correcting the configuration.",
    },
  }[reason];

  return (
    <section className="workspace-panel" role="alert" aria-labelledby="invitation-setup-title">
      <p className="workspace-eyebrow">{french ? "Configuration requise" : "Setup required"}</p>
      <h2 id="invitation-setup-title">{copy.title}</h2>
      <p>{copy.body}</p>
      <p>
        <code>{copy.action}</code>
      </p>
    </section>
  );
}
