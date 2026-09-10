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

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const intendedRole = String(form.get("intendedRole") ?? "") || null;
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
      if (!response.ok) throw new Error("unavailable");
      event.currentTarget.reset();
      setMessage(
        french
          ? "Invitation créée et remise au fournisseur."
          : "Invitation created and handed to the provider.",
      );
      router.refresh();
    } catch {
      setMessage(
        french
          ? "Invitation non créée. Vérifiez les choix; un compte existant doit utiliser la récupération de mot de passe."
          : "Invitation was not created. Check the choices; an existing account must use password recovery.",
      );
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
      if (!response.ok) throw new Error("unavailable");
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
    } catch {
      setMessage(
        french
          ? "Action indisponible. Le délai de renvoi peut être actif."
          : "Action unavailable. The resend cooldown may still be active.",
      );
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
            <select name="intendedRole" defaultValue="">
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
            <select name="membershipTier" defaultValue="applicant">
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
            {french
              ? "Les opérations ne peuvent pas attribuer Admin, Core ou Lead ici. Un candidat n’est jamais promu automatiquement."
              : "Operations cannot assign Admin, Core, or Lead here. An applicant is never promoted automatically."}
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
