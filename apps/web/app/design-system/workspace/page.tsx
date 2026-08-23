import { notFound } from "next/navigation";
import type { UmojaRole } from "@umoja/appwrite";

import { AdminOverview, WorkspaceOverview } from "@/components/workspace/workspace-overviews";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const dynamic = "force-dynamic";

const validRoles: readonly UmojaRole[] = [
  "admin",
  "cms-editor",
  "reviewer",
  "core",
  "extended",
  "project-manager",
];

export default async function WorkspaceFixturePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    locale?: string;
    mfa?: string;
    role?: string;
    roles?: string;
    session?: string;
    state?: string;
    view?: string;
  }>;
}>) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_SYSTEM_ENABLED !== "true") {
    notFound();
  }
  const query = await searchParams;
  const locale = query.locale === "fr" ? "fr" : "en";
  const admin = query.view === "admin" || query.role === "admin";
  const requestedRoles = (query.roles ?? "")
    .split(",")
    .filter((role): role is UmojaRole => validRoles.includes(role as UmojaRole));
  const roles: UmojaRole[] = requestedRoles.length
    ? requestedRoles
    : admin
      ? ["admin"]
      : ["reviewer", "project-manager"];
  const user = {
    id: "visual-fixture-only",
    name:
      query.state === "missing-name"
        ? ""
        : locale === "fr"
          ? "Nom de démonstration exceptionnellement long pour vérifier l’adaptation"
          : "Exceptionally long demonstration name for wrapping review",
    email: "workspace-visual-fixture-with-an-unbroken-address@example.invalid",
    emailVerified: true,
    mfaEnabled: query.mfa ? query.mfa === "active" : admin,
    roles,
  } as const;

  return (
    <WorkspaceShell
      current={admin ? "admin" : "workspace"}
      locale={locale}
      sessionState={query.session === "stale" ? "stale" : "active"}
      user={user}
    >
      {query.state === "loading" ? (
        <FixtureState locale={locale} state="loading" />
      ) : query.state === "error" ? (
        <FixtureState locale={locale} state="error" />
      ) : query.state === "permission" ? (
        <FixtureState locale={locale} state="permission" />
      ) : admin ? (
        <AdminOverview locale={locale} user={user} />
      ) : (
        <WorkspaceOverview locale={locale} user={user} />
      )}
    </WorkspaceShell>
  );
}

function FixtureState({
  locale,
  state,
}: Readonly<{ locale: "en" | "fr"; state: "loading" | "error" | "permission" }>) {
  const french = locale === "fr";
  const copy = {
    loading: {
      eyebrow: french ? "Chargement" : "Loading",
      title: french ? "Préparation de votre espace" : "Preparing your workspace",
      body: french ? "Nous vérifions vos accès actuels." : "We are checking your current access.",
    },
    error: {
      eyebrow: french ? "Service indisponible" : "Service unavailable",
      title: french ? "Cet espace ne peut pas être chargé" : "This workspace cannot be loaded",
      body: french
        ? "Vos données restent protégées. Réessayez lorsque la connexion est rétablie."
        : "Your data remains protected. Try again when the connection returns.",
    },
    permission: {
      eyebrow: french ? "Accès refusé" : "Permission denied",
      title: french ? "Vous n’avez pas accès à cet espace" : "You do not have access to this area",
      body: french
        ? "Votre session est active, mais votre rôle actuel ne permet pas d’ouvrir cette destination."
        : "Your session is active, but your current role cannot open this destination.",
    },
  }[state];
  return (
    <section
      className="workspace-empty-state"
      aria-live={state === "loading" ? "polite" : undefined}
    >
      <p className="workspace-eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p className="workspace-page-summary">{copy.body}</p>
      {state === "loading" ? (
        <div className="workspace-loading-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <a className="u-button u-button--secondary u-button--medium" href={`/${locale}/workspace`}>
          {french ? "Retour à l’espace" : "Return to workspace"}
        </a>
      )}
    </section>
  );
}
