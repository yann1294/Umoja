"use client";

import { Button } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountActions({
  locale,
  showVerification,
}: Readonly<{ locale: "en" | "fr"; showVerification: boolean }>) {
  const french = locale === "fr";
  const router = useRouter();
  const [pending, setPending] = useState<"verification" | "sign-out" | null>(null);
  const [message, setMessage] = useState("");

  async function sendVerification() {
    setPending("verification");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!response.ok) throw new Error("verification");
      setMessage(
        french
          ? "Si l’adresse est admissible, un lien de vérification a été envoyé."
          : "If the address is eligible, a verification link has been sent.",
      );
    } catch {
      setMessage(
        french
          ? "Le lien n’a pas pu être envoyé. Réessayez ou contactez les opérations Umoja."
          : "The link could not be sent. Try again or contact Umoja operations.",
      );
    } finally {
      setPending(null);
    }
  }

  async function signOut() {
    setPending("sign-out");
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      router.replace(`/${locale}/sign-in`);
      router.refresh();
    }
  }

  return (
    <>
      <div className="auth-actions">
        {showVerification ? (
          <Button
            onClick={sendVerification}
            loading={pending === "verification"}
            loadingLabel={french ? "Envoi…" : "Sending…"}
          >
            {french ? "Envoyer un lien de vérification" : "Send verification link"}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={signOut}
          loading={pending === "sign-out"}
          loadingLabel={french ? "Déconnexion…" : "Signing out…"}
        >
          {french ? "Se déconnecter" : "Sign out"}
        </Button>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </>
  );
}
