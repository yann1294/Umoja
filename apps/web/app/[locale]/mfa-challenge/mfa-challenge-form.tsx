"use client";

import { Button, TextField } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function MfaChallengeForm({
  locale,
  next,
}: Readonly<{ locale: "en" | "fr"; next: string }>) {
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
      const response = await fetch("/api/supabase-auth/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: data.get("code"), locale, next }),
      });
      if (!response.ok) throw new Error("mfa-rejected");
      router.replace(response.headers.get("X-Umoja-Next") ?? `/${locale}/account-state`);
      router.refresh();
    } catch {
      setError(
        french
          ? "Code non valide ou expiré. Saisissez le code actuel de votre application d’authentification."
          : "The code is invalid or expired. Enter the current code from your authenticator app.",
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
      <TextField
        id="mfa-code"
        name="code"
        label={french ? "Code à six chiffres" : "Six-digit code"}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        required
      />
      <Button
        type="submit"
        loading={pending}
        loadingLabel={french ? "Vérification…" : "Verifying…"}
      >
        {french ? "Vérifier et continuer" : "Verify and continue"}
      </Button>
    </form>
  );
}
