import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { listUmojaInvitations } from "@/lib/invitations/service";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { InvitationAdmin } from "./invitation-admin";
import "./invitations.css";

export const dynamic = "force-dynamic";

export default async function InvitationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const invitations = await listUmojaInvitations(locale);
  const french = locale === "fr";
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
      <InvitationAdmin invitations={invitations} locale={locale} />
    </WorkspaceShell>
  );
}
