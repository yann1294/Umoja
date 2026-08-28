"use client";

import { Logo, VisuallyHidden } from "@umoja/ui";
import type { ReactNode, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type { SupabaseWorkspaceUser as WorkspaceUser } from "@/lib/supabase/auth";
import { AccountMenu } from "./session-controls";
import type { WorkspaceNavigationItem } from "./workspace-shell";

type Props = Readonly<{
  children: ReactNode;
  current: "workspace" | "admin" | "content" | "intake";
  locale: "en" | "fr";
  navigation: readonly WorkspaceNavigationItem[];
  sessionState: "active" | "stale";
  user: WorkspaceUser;
}>;

export function AuthenticatedShell({
  children,
  current,
  locale,
  navigation,
  sessionState,
  user,
}: Props) {
  const french = locale === "fr";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const pageLabel =
    current === "intake"
      ? french
        ? "Demandes"
        : "Intakes"
      : current === "content"
        ? french
          ? "Contenu public"
          : "Public content"
        : current === "admin"
          ? french
            ? "Opérations"
            : "Operations"
          : french
            ? "Vue d’ensemble"
            : "Overview";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => drawerCloseRef.current?.focus());
    } else if (!drawerOpen && dialog.open) {
      dialog.close();
    }
  }, [drawerOpen]);

  function closeDrawer(restoreFocus = true) {
    setDrawerOpen(false);
    if (restoreFocus) requestAnimationFrame(() => drawerTriggerRef.current?.focus());
  }

  function trapDrawerFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
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

  return (
    <div className="workspace-surface">
      <a className="workspace-skip-link" href="#workspace-main">
        {french ? "Aller au contenu" : "Skip to content"}
      </a>
      <aside className="workspace-sidebar">
        <a
          className="workspace-brand"
          href={`/${locale}/workspace`}
          aria-label={french ? "Accueil de l’espace Umoja" : "Umoja workspace home"}
        >
          <Logo variant="mono" size="medium" decorative />
        </a>
        <WorkspaceNavigation
          current={current}
          idPrefix="desktop"
          locale={locale}
          navigation={navigation}
        />
        <div className="workspace-sidebar-account">
          <AccountMenu id="desktop" locale={locale} sessionState={sessionState} user={user} />
        </div>
      </aside>

      <div className="workspace-application">
        <header className="workspace-topbar">
          <button
            ref={drawerTriggerRef}
            className="workspace-drawer-trigger"
            type="button"
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
            aria-controls="workspace-mobile-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
            <VisuallyHidden>{french ? "Ouvrir la navigation" : "Open navigation"}</VisuallyHidden>
          </button>
          <a
            className="workspace-mobile-brand"
            href={`/${locale}/workspace`}
            aria-label={french ? "Accueil de l’espace Umoja" : "Umoja workspace home"}
          >
            <Logo variant="mark" size="small" decorative />
          </a>
          <div className="workspace-page-context">
            <span>{french ? "Espace Umoja" : "Umoja workspace"}</span>
            <strong>{pageLabel}</strong>
          </div>
          <div className="workspace-mobile-account">
            <AccountMenu
              compact
              id="mobile"
              locale={locale}
              sessionState={sessionState}
              user={user}
            />
          </div>
        </header>

        <main className="workspace-content" id="workspace-main">
          {children}
        </main>
      </div>

      <dialog
        ref={dialogRef}
        id="workspace-mobile-drawer"
        className="workspace-drawer"
        aria-labelledby="workspace-drawer-title"
        onCancel={(event) => {
          event.preventDefault();
          closeDrawer();
        }}
        onClose={() => {
          setDrawerOpen(false);
          drawerTriggerRef.current?.focus();
        }}
        onKeyDown={trapDrawerFocus}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDrawer();
        }}
      >
        <div className="workspace-drawer-panel">
          <div className="workspace-drawer-header">
            <Logo variant="mono" size="medium" decorative />
            <button
              ref={drawerCloseRef}
              className="workspace-icon-button"
              type="button"
              onClick={() => closeDrawer()}
            >
              <CloseIcon />
              <VisuallyHidden>
                {french ? "Fermer la navigation" : "Close navigation"}
              </VisuallyHidden>
            </button>
          </div>
          <p id="workspace-drawer-title" className="workspace-drawer-title">
            {french ? "Navigation de l’espace" : "Workspace navigation"}
          </p>
          <WorkspaceNavigation
            current={current}
            idPrefix="drawer"
            locale={locale}
            navigation={navigation}
            onNavigate={() => closeDrawer(false)}
          />
        </div>
      </dialog>
    </div>
  );
}

function WorkspaceNavigation({
  current,
  idPrefix,
  locale,
  navigation,
  onNavigate,
}: Readonly<{
  current: "workspace" | "admin" | "content" | "intake";
  idPrefix: string;
  locale: "en" | "fr";
  navigation: readonly WorkspaceNavigationItem[];
  onNavigate?: () => void;
}>) {
  const french = locale === "fr";
  const groups = ["workspace", "administration"] as const;
  return (
    <nav
      className="workspace-navigation"
      aria-label={french ? "Navigation de l’espace" : "Workspace navigation"}
    >
      {groups.map((group) => {
        const items = navigation.filter((item) => item.section === group);
        if (!items.length) return null;
        return (
          <section
            className="workspace-nav-group"
            key={group}
            aria-labelledby={`workspace-nav-${idPrefix}-${group}`}
          >
            <h2 id={`workspace-nav-${idPrefix}-${group}`}>
              {group === "workspace"
                ? french
                  ? "Espace"
                  : "Workspace"
                : french
                  ? "Administration"
                  : "Administration"}
            </h2>
            <ul>
              {items.map((item) => {
                const active =
                  current === "content"
                    ? item.href === "/admin/content"
                    : current === item.href.slice(1);
                return (
                  <li key={item.href}>
                    <a
                      href={`/${locale}${item.href}`}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <span className="workspace-nav-marker" aria-hidden="true" />
                      <span>{item.label}</span>
                      {active ? (
                        <VisuallyHidden>{french ? "Page actuelle" : "Current page"}</VisuallyHidden>
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
