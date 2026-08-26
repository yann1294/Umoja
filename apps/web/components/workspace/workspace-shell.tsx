import { rolesHaveCapability, type UmojaCapability, type UmojaRole } from "@umoja/appwrite";
import type { ReactNode } from "react";

import { AuthenticatedShell } from "./authenticated-shell";
import "./workspace-shell.css";

export type WorkspaceNavigationItem = Readonly<{
  href: "/workspace" | "/admin" | "/admin/content" | "/admin/intake";
  label: string;
  section: "workspace" | "administration";
}>;

type CandidateNavigationItem = WorkspaceNavigationItem & Readonly<{ capability: UmojaCapability }>;

/** Canonical shell shape shared by the temporary Appwrite and Supabase route groups. */
export type WorkspaceShellUser = Readonly<{
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  roles: readonly UmojaRole[];
}>;

export function getWorkspaceNavigation(
  user: WorkspaceShellUser,
  locale: "en" | "fr",
): readonly WorkspaceNavigationItem[] {
  const french = locale === "fr";
  const candidates: readonly CandidateNavigationItem[] = [
    {
      href: "/workspace",
      label: french ? "Vue d’ensemble" : "Overview",
      section: "workspace",
      capability: "workspace.access",
    },
    {
      href: "/admin",
      label: french ? "Opérations" : "Operations",
      section: "administration",
      capability: "admin.operations",
    },
    {
      href: "/admin/intake",
      label: french ? "Demandes" : "Intakes",
      section: "administration",
      capability: "intake.review",
    },
    {
      href: "/admin/content",
      label: french ? "Contenu public" : "Public content",
      section: "administration",
      capability: "cms.manage",
    },
  ];

  return candidates
    .filter((item) => rolesHaveCapability(user.roles, item.capability))
    .map(({ href, label, section }) => ({ href, label, section }));
}

export function WorkspaceShell({
  children,
  current,
  locale,
  sessionState = "active",
  user,
}: Readonly<{
  children: ReactNode;
  current: "workspace" | "admin" | "content" | "intake";
  locale: "en" | "fr";
  sessionState?: "active" | "stale";
  user: WorkspaceShellUser;
}>) {
  return (
    <AuthenticatedShell
      current={current}
      locale={locale}
      navigation={getWorkspaceNavigation(user, locale)}
      sessionState={sessionState}
      user={user}
    >
      {children}
    </AuthenticatedShell>
  );
}
