"use client";

import { Button, TextField } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SignInForm({ locale }: Readonly<{ locale: "en" | "fr" }>) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const french = locale === "fr";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      if (!response.ok) throw new Error("sign-in");
      const result = (await response.json()) as { user?: { reason?: string } };
      const reason = result.user?.reason;
      router.replace(
        reason && reason !== "allowed"
          ? `/${locale}/account-state?reason=${encodeURIComponent(reason)}`
          : `/${locale}/workspace`,
      );
      router.refresh();
    } catch {
      setError(
        french
          ? "Connexion impossible. Vérifiez vos informations ou contactez un administrateur Umoja."
          : "Unable to sign in. Check your details or contact an Umoja administrator.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="auth-form"
      onSubmit={submit}
      aria-describedby={error ? "sign-in-error" : undefined}
    >
      {error ? (
        <div className="auth-error" id="sign-in-error" role="alert">
          {error}
        </div>
      ) : null}
      <TextField
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        label={french ? "Adresse courriel" : "Email address"}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={12}
        label={french ? "Mot de passe" : "Password"}
      />
      <Button type="submit" loading={pending} loadingLabel={french ? "Connexion…" : "Signing in…"}>
        {french ? "Se connecter" : "Sign in"}
      </Button>
      <a className="auth-text-link" href={`/${locale}/forgot-password`}>
        {french ? "Mot de passe oublié?" : "Forgot your password?"}
      </a>
      <p className="auth-note">
        {french
          ? "L’espace Umoja est accessible uniquement sur invitation."
          : "The Umoja workspace is available by invitation only."}
      </p>
    </form>
  );
}
