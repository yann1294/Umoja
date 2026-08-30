import type { ReactNode } from "react";

import { rolesHaveCapability, type UmojaCapability, type UmojaRole } from "@/lib/auth/policy";

import { AuthenticatedShell } from "./authenticated-shell";
import "./workspace-shell.css";

export type WorkspaceNavigationItem = Readonly<{
  href:
    | "/workspace"
    | "/workspace/profile"
    | "/workspace/skills"
    | "/workspace/portfolio"
    | "/workspace/availability"
    | "/admin"
    | "/admin/content"
    | "/admin/intake"
    | "/admin/profiles";
  label: string;
  section: "workspace" | "administration";
}>;

type CandidateNavigationItem = WorkspaceNavigationItem & Readonly<{ capability: UmojaCapability }>;

/** Canonical shell shape shared by protected Umoja route groups. */
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
      href: "/workspace/profile",
      label: french ? "Profil" : "Profile",
      section: "workspace",
      capability: "workspace.access",
    },
    {
      href: "/workspace/skills",
      label: french ? "Compétences" : "Skills",
      section: "workspace",
      capability: "workspace.access",
    },
    {
      href: "/workspace/portfolio",
      label: french ? "Portfolio" : "Portfolio",
      section: "workspace",
      capability: "workspace.access",
    },
    {
      href: "/workspace/availability",
      label: french ? "Disponibilité" : "Availability",
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
      href: "/admin/profiles",
      label: french ? "Profils publics" : "Public profiles",
      section: "administration",
      capability: "admin.operations",
    },
    {
      href: "/admin/content",
      label: french ? "Contenu public" : "Public content",
      section: "administration",
      capability: "cms.manage",
    },
  ];

  return candidates
    .filter(
      (item) => item.section === "workspace" || rolesHaveCapability(user.roles, item.capability),
    )
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
  current:
    | "workspace"
    | "profile"
    | "skills"
    | "portfolio"
    | "availability"
    | "admin"
    | "content"
    | "intake";
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
