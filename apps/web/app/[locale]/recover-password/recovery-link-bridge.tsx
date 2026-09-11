"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function RecoveryLinkBridge({ locale }: Readonly<{ locale: "en" | "fr" }>) {
  const router = useRouter();
  const french = locale === "fr";
  const [state, setState] = useState<"idle" | "exchanging" | "failed">("idle");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    if (code) {
      const target = new URL("/api/supabase-auth/callback", window.location.origin);
      target.searchParams.set("locale", locale);
      target.searchParams.set("flow", "recovery");
      target.searchParams.set("code", code);
      window.location.replace(target.toString());
      return;
    }

    const tokenHash = query.get("token_hash");
    const type = query.get("type");
    if (tokenHash && type === "recovery") {
      const target = new URL("/api/supabase-auth/confirm", window.location.origin);
      target.searchParams.set("locale", locale);
      target.searchParams.set("flow", "recovery");
      target.searchParams.set("token_hash", tokenHash);
      target.searchParams.set("type", "recovery");
      window.location.replace(target.toString());
      return;
    }

    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    const fragmentType = fragment.get("type");
    if (!accessToken || !refreshToken || fragmentType !== "recovery") return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setState("exchanging");
    });
    createSupabaseBrowserClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (error) throw error;
        const response = await fetch(`/api/supabase-auth/recovery/session?locale=${locale}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        if (!response.ok) throw new Error("recovery-session-unavailable");
        if (!cancelled) router.replace(`/${locale}/recover-password`);
      })
      .catch(() => {
        if (!cancelled) {
          window.history.replaceState(null, "", `/${locale}/recover-password?state=invalid`);
          setState("failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  if (state === "idle") return null;
  return (
    <p role={state === "failed" ? "alert" : "status"} aria-live="polite">
      {state === "failed"
        ? french
          ? "Le lien de récupération est invalide ou expiré. Demandez un nouveau lien."
          : "The recovery link is invalid or expired. Request a new link."
        : french
          ? "Validation du lien de récupération..."
          : "Checking the recovery link..."}
    </p>
  );
}
