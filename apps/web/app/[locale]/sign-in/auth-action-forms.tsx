"use client";

import { Button, TextField } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LocaleProps = Readonly<{ locale: "en" | "fr" }>;

export function RecoveryRequestForm({ locale }: LocaleProps) {
  const french = locale === "fr";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      await fetch("/api/auth/recovery", {
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

export function RecoveryConfirmForm({
  locale,
  secret,
  userId,
}: LocaleProps & Readonly<{ secret: string; userId: string }>) {
  const french = locale === "fr";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const response = await fetch("/api/auth/recovery/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, secret, password }),
      });
      if (!response.ok) throw new Error("recovery");
      router.replace(`/${locale}/sign-in`);
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
      <TextField
        id="new-password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
        label={french ? "Nouveau mot de passe" : "New password"}
        hint={french ? "Au moins 12 caractères." : "At least 12 characters."}
      />
      <Button type="submit" loading={pending} loadingLabel={french ? "Mise à jour…" : "Updating…"}>
        {french ? "Mettre à jour" : "Update password"}
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
