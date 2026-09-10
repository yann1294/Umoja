"use client";

import { Button, LinkButton, TextField } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LocaleProps = Readonly<{ locale: "en" | "fr" }>;

function PasswordField({
  id,
  name,
  label,
  locale,
}: LocaleProps & { id: string; name: string; label: string }) {
  const [visible, setVisible] = useState(false);
  const french = locale === "fr";
  return (
    <div className="auth-password-field">
      <TextField
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        minLength={12}
        maxLength={256}
        pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,256}"
        required
        label={label}
        hint={
          french
            ? "12 caractères minimum, avec minuscule, majuscule et chiffre."
            : "At least 12 characters, including lower case, upper case, and a number."
        }
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => setVisible((value) => !value)}
        aria-controls={id}
        aria-pressed={visible}
      >
        {visible ? (french ? "Masquer" : "Hide") : french ? "Afficher" : "Show"}
      </Button>
    </div>
  );
}

export function RecoveryRequestForm({ locale }: LocaleProps) {
  const french = locale === "fr";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      await fetch("/api/supabase-auth/recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), locale }),
      });
      setMessage(
        french
          ? "Si ce compte existe, un lien de récupération a été envoyé."
          : "If the account exists, a recovery link has been sent.",
      );
    } catch {
      setMessage(
        french
          ? "Impossible de traiter la demande pour le moment."
          : "The request cannot be processed right now.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <TextField
        id="recovery-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        label={french ? "Adresse courriel invitée" : "Invited email address"}
      />
      <Button type="submit" loading={pending} loadingLabel={french ? "Envoi…" : "Sending…"}>
        {french ? "Envoyer le lien" : "Send recovery link"}
      </Button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

export function RecoveryConfirmForm({ locale }: LocaleProps) {
  const french = locale === "fr";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/supabase-auth/recovery/confirm?locale=${locale}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: data.get("password"),
          confirmation: data.get("confirmation"),
        }),
      });
      if (!response.ok) throw new Error("recovery");
      setComplete(true);
    } catch {
      setError(
        french
          ? "Ce lien est invalide ou expiré. Demandez un nouveau lien."
          : "This link is invalid or expired. Request a new link.",
      );
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <div className="auth-form" role="status">
        <div className="auth-status">
          {french
            ? "Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter."
            : "Your password has been updated. You can now sign in."}
        </div>
        <LinkButton href={`/${locale}/sign-in?password=updated`}>
          {french ? "Continuer vers la connexion" : "Continue to sign in"}
        </LinkButton>
      </div>
    );
  }

  return (
    <form
      className="auth-form"
      onSubmit={submit}
      aria-describedby={error ? "recovery-error" : undefined}
    >
      {error ? (
        <div id="recovery-error" className="auth-error" role="alert">
          {error}
        </div>
      ) : null}
      <PasswordField
        id="new-password"
        name="password"
        locale={locale}
        label={french ? "Nouveau mot de passe" : "New password"}
      />
      <PasswordField
        id="confirm-new-password"
        name="confirmation"
        locale={locale}
        label={french ? "Confirmer le nouveau mot de passe" : "Confirm new password"}
      />
      <Button type="submit" loading={pending} loadingLabel={french ? "Mise à jour…" : "Updating…"}>
        {french ? "Mettre à jour" : "Update password"}
      </Button>
    </form>
  );
}

export function InvitationPasswordForm({ locale }: LocaleProps) {
  const french = locale === "fr";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/supabase-auth/invite/accept?locale=${locale}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: data.get("password"),
          confirmation: data.get("confirmation"),
        }),
      });
      if (!response.ok) throw new Error("invite");
      const destination = new URL(response.url);
      router.replace(`${destination.pathname}${destination.search}`);
      router.refresh();
    } catch {
      setError(
        french
          ? "Cette invitation est invalide, expirée ou déjà utilisée. Si le compte existe déjà, utilisez la récupération de mot de passe."
          : "This invitation is invalid, expired, or already used. If the account already exists, use password recovery.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      {error ? (
        <div className="auth-error" role="alert">
          {error}
        </div>
      ) : null}
      <PasswordField
        id="invite-password"
        name="password"
        locale={locale}
        label={french ? "Choisir un mot de passe" : "Choose a password"}
      />
      <PasswordField
        id="confirm-invite-password"
        name="confirmation"
        locale={locale}
        label={french ? "Confirmer le mot de passe" : "Confirm password"}
      />
      <Button type="submit" loading={pending} loadingLabel={french ? "Activation…" : "Activating…"}>
        {french ? "Activer le compte" : "Activate account"}
      </Button>
    </form>
  );
}

export function TokenActionForm({
  endpoint,
  locale,
  payload,
  submitLabel,
}: LocaleProps &
  Readonly<{
    endpoint: string;
    payload: Record<string, string>;
    submitLabel: string;
  }>) {
  const french = locale === "fr";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("token");
      router.replace(`/${locale}/workspace`);
      router.refresh();
    } catch {
      setError(
        french
          ? "Ce lien est invalide, expiré ou ne correspond pas à la session active."
          : "This link is invalid, expired, or does not match the active session.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-form">
      {error ? (
        <div className="auth-error" role="alert">
          {error}
        </div>
      ) : null}
      <Button
        onClick={submit}
        loading={pending}
        loadingLabel={french ? "Vérification…" : "Verifying…"}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
