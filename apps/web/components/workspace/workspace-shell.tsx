import type { UmojaCapability } from "@umoja/appwrite";
import type { ReactNode } from "react";

import { canUseWorkspaceCapability, type WorkspaceUser } from "@/lib/appwrite/auth";
import { AuthenticatedShell } from "./authenticated-shell";
import "./workspace-shell.css";

export type WorkspaceNavigationItem = Readonly<{
  href: "/workspace" | "/admin";
  label: string;
  section: "workspace" | "administration";
}>;

type CandidateNavigationItem = WorkspaceNavigationItem & Readonly<{ capability: UmojaCapability }>;

export function getWorkspaceNavigation(
  user: WorkspaceUser,
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
  ];

  return candidates
    .filter((item) => canUseWorkspaceCapability(user, item.capability))
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
  current: "workspace" | "admin";
  locale: "en" | "fr";
  sessionState?: "active" | "stale";
  user: WorkspaceUser;
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
