"use client";

import { Button } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SessionControls({ locale }: Readonly<{ locale: "en" | "fr" }>) {
  const router = useRouter();
  const french = locale === "fr";
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<"refresh" | "sign-out" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function refresh() {
    setPending("refresh");
    setMessage("");
    try {
      const response = await fetch("/api/auth/session/refresh", { method: "POST" });
      if (!response.ok) {
        router.replace(`/${locale}/sign-in?reason=session-expired`);
        router.refresh();
        return;
      }
      setMessage(french ? "Session actualisée." : "Session refreshed.");
      router.refresh();
    } catch {
      setMessage(
        french
          ? "Hors ligne. Votre accès sera revérifié au retour de la connexion."
          : "Offline. Your access will be checked again when the connection returns.",
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
    <div className="workspace-session-controls">
      <span className="workspace-connection" data-online={online}>
        {online ? (french ? "En ligne" : "Online") : french ? "Hors ligne" : "Offline"}
      </span>
      <Button
        variant="ghost"
        size="small"
        onClick={refresh}
        loading={pending === "refresh"}
        loadingLabel={french ? "Actualisation…" : "Refreshing…"}
      >
        {french ? "Actualiser la session" : "Refresh session"}
      </Button>
      <Button
        variant="secondary"
        size="small"
        onClick={signOut}
        loading={pending === "sign-out"}
        loadingLabel={french ? "Déconnexion…" : "Signing out…"}
      >
        {french ? "Se déconnecter" : "Sign out"}
      </Button>
      <span className="workspace-session-message" role="status" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
