"use client";

import { Button, TextField } from "@umoja/ui";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Invitation = Readonly<{
  id: string;
  email: string;
  locale: string;
  intended_role: string | null;
  intended_membership_tier: string;
  intended_membership_status: string;
  expires_at: string;
  lifecycle: "pending" | "expired" | "accepted" | "revoked";
  delivery_state: "pending" | "sent" | "failed" | "suppressed";
  resend_count: number;
}>;

type InvitationCreateFailure = Readonly<{ reason?: string }>;
type InvitationActionFailure = Readonly<{ reason?: string }>;

export function InvitationAdmin({
  invitations,
  locale,
}: {
  invitations: readonly Invitation[];
  locale: "en" | "fr";
}) {
  const french = locale === "fr";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [membershipTier, setMembershipTier] = useState<"applicant" | "extended">("applicant");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const intendedRole =
      membershipTier === "applicant" ? null : String(form.get("intendedRole") ?? "") || null;
    try {
      const response = await fetch("/api/supabase-auth/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          locale: form.get("locale"),
          intendedRole,
          membershipTier: form.get("membershipTier"),
          membershipStatus: form.get("membershipStatus"),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as InvitationCreateFailure | null;
        throw new Error(body?.reason ?? "unavailable");
      }
      event.currentTarget.reset();
      setMessage(
        french
          ? "Invitation créée et remise au fournisseur."
          : "Invitation created and handed to the provider.",
      );
      router.refresh();
    } catch (error) {
      setMessage(invitationFailureMessage(french, error));
    } finally {
      setPending(false);
    }
  }

  async function act(id: string, action: "resend" | "revoke") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/supabase-auth/invite/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, locale }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as InvitationActionFailure | null;
        throw new Error(body?.reason ?? "unavailable");
      }
      setMessage(
        action === "resend"
          ? french
            ? "Invitation renvoyée."
            : "Invitation resent."
          : french
            ? "Invitation révoquée."
            : "Invitation revoked.",
      );
      router.refresh();
    } catch (error) {
      setMessage(invitationActionFailureMessage(french, error));
    } finally {
      setPending(false);
    }
  }

  const labels = {
    pending: french ? "En attente" : "Pending",
    expired: french ? "Expirée" : "Expired",
    accepted: french ? "Acceptée" : "Accepted",
    revoked: french ? "Révoquée" : "Revoked",
  } as const;

  return (
    <>
      <section className="workspace-panel" aria-labelledby="new-invitation-title">
        <h2 id="new-invitation-title">{french ? "Nouvelle invitation" : "New invitation"}</h2>
        <form className="workspace-form invitation-form" onSubmit={create}>
          <TextField
            id="invitation-email"
            name="email"
            type="email"
            autoComplete="off"
            required
            label={french ? "Adresse courriel" : "Email address"}
          />
          <label>
            {french ? "Langue de l’invitation" : "Invitation language"}
            <select name="locale" defaultValue={locale}>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <label>
            {french ? "Rôle prévu" : "Intended role"}
            <select name="intendedRole" defaultValue="" disabled={membershipTier === "applicant"}>
              <option value="">{french ? "Candidat — aucun rôle" : "Applicant — no role"}</option>
              <option value="extended">
                {french ? "Contributeur Extended" : "Extended contributor"}
              </option>
              <option value="reviewer">{french ? "Réviseur" : "Reviewer"}</option>
              <option value="cms-editor">{french ? "Éditeur CMS" : "CMS editor"}</option>
              <option value="project-manager">
                {french ? "Responsable de projet" : "Project manager"}
              </option>
            </select>
          </label>
          <label>
            {french ? "Niveau d’adhésion prévu" : "Intended membership level"}
            <select
              name="membershipTier"
              value={membershipTier}
              onChange={(event) =>
                setMembershipTier(
                  event.currentTarget.value === "extended" ? "extended" : "applicant",
                )
              }
            >
              <option value="applicant">Applicant</option>
              <option value="extended">Extended</option>
            </select>
          </label>
          <label>
            {french ? "État d’accès après acceptation" : "Access state after acceptance"}
            <select name="membershipStatus" defaultValue="pending">
              <option value="pending">
                {french ? "En attente d’approbation" : "Pending approval"}
              </option>
              <option value="active">{french ? "Actif" : "Active"}</option>
            </select>
          </label>
          <p className="workspace-help">
            {membershipTier === "applicant"
              ? french
                ? "Les candidats créent un compte sans rôle opérationnel. Leur accès reste soumis à approbation."
                : "Applicants create an account without an operational role. Access remains pending approval."
              : french
                ? "Extended peut recevoir un rôle opérationnel autorisé. Admin, Core et Lead restent exclus de cette invitation."
                : "Extended may receive an allowed operational role. Admin, Core, and Lead remain excluded from this invitation."}
          </p>
          <Button type="submit" loading={pending} loadingLabel={french ? "Envoi…" : "Sending…"}>
            {french ? "Envoyer l’invitation" : "Send invitation"}
          </Button>
        </form>
      </section>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <section className="workspace-section" aria-labelledby="invitation-list-title">
        <div className="workspace-section-heading">
          <h2 id="invitation-list-title">
            {french ? "Invitations récentes" : "Recent invitations"}
          </h2>
          <p>{invitations.length}</p>
        </div>
        {invitations.length ? (
          <ul className="invitation-list">
            {invitations.map((invitation) => (
              <li className="workspace-panel" key={invitation.id}>
                <h3>{invitation.email}</h3>
                <p>
                  <strong>{labels[invitation.lifecycle]}</strong> ·{" "}
                  {invitation.locale.toUpperCase()} · {invitation.intended_role ?? "applicant"} ·{" "}
                  {invitation.intended_membership_tier}/{invitation.intended_membership_status}
                </p>
                <p>
                  {french ? "Remise" : "Delivery"}: {invitation.delivery_state} ·{" "}
                  {french ? "renvois" : "resends"}: {invitation.resend_count}
                </p>
                {invitation.lifecycle === "pending" ? (
                  <div className="invitation-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => act(invitation.id, "resend")}
                    >
                      {french ? "Renvoyer" : "Resend"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => act(invitation.id, "revoke")}
                    >
                      {french ? "Révoquer" : "Revoke"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>{french ? "Aucune invitation." : "No invitations yet."}</p>
        )}
      </section>
    </>
  );
}

function invitationFailureMessage(french: boolean, error: unknown) {
  const reason =
    error instanceof Error && error.message !== "unavailable" ? error.message : "unavailable";
  const messages: Record<string, string> = {
    "account-exists": french
      ? "Un compte existe déjà pour cette adresse. Utilisez la récupération de mot de passe."
      : "An account already exists for that address. Use password recovery instead.",
    "invalid-intent": french
      ? "Cette combinaison d’accès n’est pas autorisée. Admin, Core et Lead ne sont pas attribués par invitation."
      : "That access combination is not allowed. Admin, Core, and Lead are not assigned by invitation.",
    "delivery-unavailable": french
      ? "L’invitation a été préparée, mais le fournisseur courriel ne l’a pas acceptée. Vérifiez Brevo et la liste des invitations récentes."
      : "The invitation was prepared, but the email provider did not accept it. Check Brevo and the recent invitations list.",
    "configuration-unavailable": french
      ? "La configuration serveur d’invitation ou de courriel est incomplète."
      : "The server invitation or email configuration is incomplete.",
    "origin-mismatch": french
      ? "L’origine locale ne correspond pas à APP_URL. Ouvrez l’application avec l’URL configurée puis réessayez."
      : "The local browser origin does not match APP_URL. Open the app with the configured URL and try again.",
    "database-unavailable": french
      ? "La base de données n’a pas pu créer ou mettre à jour l’invitation."
      : "The database could not create or update the invitation.",
  };
  return (
    messages[reason] ??
    (french
      ? "Invitation non créée. Vérifiez les choix; un compte existant doit utiliser la récupération de mot de passe."
      : "Invitation was not created. Check the choices; an existing account must use password recovery.")
  );
}

function invitationActionFailureMessage(french: boolean, error: unknown) {
  const reason =
    error instanceof Error && error.message !== "unavailable" ? error.message : "unavailable";
  const messages: Record<string, string> = {
    "cooldown-or-terminal": french
      ? "Action indisponible. L’invitation peut être acceptée, révoquée, expirée ou encore dans le délai de renvoi."
      : "Action unavailable. The invitation may be accepted, revoked, expired, or still inside the resend cooldown.",
    "delivery-unavailable": french
      ? "Le renvoi a été préparé, mais le fournisseur courriel ne l’a pas accepté."
      : "The resend was prepared, but the email provider did not accept it.",
    "permission-denied": french
      ? "Votre compte n’a pas l’autorisation opérationnelle requise."
      : "Your account does not have the required operations permission.",
    "database-unavailable": french
      ? "La base de données n’a pas pu terminer cette action."
      : "The database could not complete this action.",
  };
  return (
    messages[reason] ??
    (french
      ? "Action indisponible. Rechargez la liste puis réessayez."
      : "Action unavailable. Reload the list and try again.")
  );
}
