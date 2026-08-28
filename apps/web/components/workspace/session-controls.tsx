"use client";

import { Button } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { SupabaseWorkspaceUser as WorkspaceUser } from "@/lib/supabase/auth";
import { displayName, initialsFor, roleLabels } from "./workspace-copy";

export function AccountMenu({
  compact = false,
  id,
  locale,
  sessionState,
  user,
}: Readonly<{
  compact?: boolean;
  id: string;
  locale: "en" | "fr";
  sessionState: "active" | "stale";
  user: WorkspaceUser;
}>) {
  const router = useRouter();
  const french = locale === "fr";
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<"refresh" | "sign-out" | null>(null);
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const name = displayName(user.name, locale);
  const primaryRole = user.roles[0]
    ? roleLabels[user.roles[0]][locale]
    : french
      ? "Membre"
      : "Member";

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => firstItemRef.current?.focus());
  }, [open]);

  function closeMenu() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
    );
    const first = controls.at(0);
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function refresh() {
    setPending("refresh");
    setMessage("");
    try {
      const response = await fetch("/api/supabase-auth/session/refresh", { method: "POST" });
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
          ? "Connexion indisponible. Réessayez lorsque vous serez en ligne."
          : "Connection unavailable. Try again when you are online.",
      );
    } finally {
      setPending(null);
    }
  }

  async function signOut() {
    setPending("sign-out");
    try {
      await fetch("/api/supabase-auth/sign-out", { method: "POST" });
    } finally {
      router.replace(`/${locale}/sign-in`);
      router.refresh();
    }
  }

  return (
    <div ref={rootRef} className="workspace-account" data-compact={compact} onKeyDown={handleKeys}>
      <button
        ref={triggerRef}
        className="workspace-account-trigger"
        type="button"
        aria-label={french ? "Ouvrir le menu du compte" : "Open account menu"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`workspace-account-menu-${id}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="workspace-avatar" aria-hidden="true">
          {initialsFor(name, user.email)}
        </span>
        <span className="workspace-account-summary">
          <strong>{name}</strong>
          <span>
            {primaryRole}
            {user.roles.length > 1 ? ` +${user.roles.length - 1}` : ""}
          </span>
        </span>
        <ChevronIcon />
      </button>

      {open ? (
        <div
          id={`workspace-account-menu-${id}`}
          className="workspace-account-menu"
          role="dialog"
          aria-label={french ? "Compte et session" : "Account and session"}
        >
          <div className="workspace-account-details">
            <p>
              <strong>{name}</strong>
            </p>
            <p className="workspace-account-email">{user.email}</p>
          </div>
          <div className="workspace-account-state">
            <span className="workspace-connection" data-online={online}>
              {online ? (french ? "Connecté" : "Connected") : french ? "Hors ligne" : "Offline"}
            </span>
            <span>
              {user.mfaEnabled
                ? french
                  ? "MFA activée"
                  : "MFA enabled"
                : french
                  ? "MFA à configurer"
                  : "MFA needs setup"}
            </span>
          </div>
          <div className="workspace-account-roles">
            <span>{french ? "Accès actif" : "Active access"}</span>
            <ul>
              {user.roles.map((role) => (
                <li key={role}>{roleLabels[role][locale]}</li>
              ))}
            </ul>
          </div>
          {sessionState === "stale" ? (
            <div className="workspace-stale-session" role="status">
              <p>
                {french
                  ? "Votre session doit être revérifiée avant de continuer."
                  : "Your session needs to be checked before you continue."}
              </p>
              <Button
                ref={firstItemRef}
                variant="secondary"
                size="small"
                onClick={refresh}
                loading={pending === "refresh"}
                loadingLabel={french ? "Vérification…" : "Checking…"}
              >
                {french ? "Vérifier la session" : "Check session"}
              </Button>
            </div>
          ) : null}
          <Button
            ref={sessionState === "active" ? firstItemRef : undefined}
            variant="ghost"
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
      ) : null}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="workspace-account-chevron"
      viewBox="0 0 20 20"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="m6 8 4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
