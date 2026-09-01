"use client";

import { Button, TextField } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SupabaseCmsSignInForm({ locale, next }: { locale: "en" | "fr"; next: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const fr = locale === "fr";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/supabase-auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      if (!response.ok) throw new Error();
      router.replace(next);
      router.refresh();
    } catch {
      setError(
        fr
          ? "Connexion impossible. Vérifiez vos informations."
          : "Unable to sign in. Check your details.",
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
        label={fr ? "Adresse courriel" : "Email address"}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={12}
        label={fr ? "Mot de passe" : "Password"}
      />
      <Button type="submit" loading={pending} loadingLabel={fr ? "Connexion…" : "Signing in…"}>
        {fr ? "Se connecter" : "Sign in"}
      </Button>
    </form>
  );
}
