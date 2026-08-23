import { Badge, Logo } from "@umoja/ui";
import type { UmojaCapability, UmojaRole } from "@umoja/appwrite";
import type { ReactNode } from "react";
import { canUseWorkspaceCapability, type WorkspaceUser } from "@/lib/appwrite/auth";
import { SessionControls } from "./session-controls";
import "./workspace-shell.css";

type NavigationItem = Readonly<{
  href: "/workspace" | "/admin";
  label: string;
  capability: UmojaCapability;
}>;

const roleLabels: Readonly<Record<UmojaRole, { en: string; fr: string }>> = {
  admin: { en: "Operations administrator", fr: "Administration des opérations" },
  "cms-editor": { en: "CMS editor", fr: "Édition du CMS" },
  reviewer: { en: "Intake reviewer", fr: "Évaluation des demandes" },
  core: { en: "Core network", fr: "Réseau principal" },
  extended: { en: "Extended network", fr: "Réseau étendu" },
  "project-manager": { en: "Project manager", fr: "Gestion de projet" },
};

export function WorkspaceShell({
  children,
  current,
  locale,
  user,
}: Readonly<{
  children: ReactNode;
  current: "workspace" | "admin";
  locale: "en" | "fr";
  user: WorkspaceUser;
}>) {
  const french = locale === "fr";
  const navigation: NavigationItem[] = [
    {
      href: "/workspace",
      label: french ? "Vue d’ensemble" : "Overview",
      capability: "workspace.access",
    },
    {
      href: "/admin",
      label: french ? "Opérations administratives" : "Admin operations",
      capability: "admin.operations",
    },
  ];
  const available = navigation.filter((item) => canUseWorkspaceCapability(user, item.capability));

  const navigationList = (
    <ul className="workspace-nav-list">
      {available.map((item) => (
        <li key={item.href}>
          <a
            href={`/${locale}${item.href}`}
            aria-current={current === item.href.slice(1) ? "page" : undefined}
          >
            {item.label}
          </a>
        </li>
      ))}
      <li className="workspace-nav-locked">
        <span>{french ? "Gouvernance — politique requise" : "Governance — policy required"}</span>
      </li>
    </ul>
  );

  return (
    <div className="workspace-surface">
      <header className="workspace-topbar">
        <a
          href={`/${locale}/workspace`}
          className="workspace-logo-link"
          aria-label="Umoja workspace"
        >
          <Logo size="small" decorative />
        </a>
        <div className="workspace-identity">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
        <SessionControls locale={locale} />
      </header>

      <details className="workspace-mobile-navigation">
        <summary>{french ? "Navigation de l’espace" : "Workspace navigation"}</summary>
        <nav aria-label={french ? "Navigation de l’espace" : "Workspace navigation"}>
          {navigationList}
        </nav>
      </details>

      <div className="workspace-layout">
        <aside className="workspace-rail">
          <p className="workspace-rail-title">{french ? "Espace sécurisé" : "Secure workspace"}</p>
          <nav aria-label={french ? "Navigation de l’espace" : "Workspace navigation"}>
            {navigationList}
          </nav>
          <div
            className="workspace-role-list"
            aria-label={french ? "Rôles actifs" : "Active roles"}
          >
            <span>{french ? "Rôles actifs" : "Active roles"}</span>
            {user.roles.map((role) => (
              <Badge key={role} variant="info">
                {roleLabels[role][locale]}
              </Badge>
            ))}
          </div>
        </aside>
        <section className="workspace-content">{children}</section>
      </div>
    </div>
  );
}
