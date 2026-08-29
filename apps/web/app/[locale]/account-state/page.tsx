import { Container, LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import type { WorkspaceAccessReason } from "@umoja/appwrite";
import { routing } from "@/i18n/routing";
import { getWorkspaceAccessState } from "@/lib/appwrite/auth";
import { AccountActions } from "./account-actions";
import "../sign-in/workspace-auth.css";

const visibleReasons = new Set<WorkspaceAccessReason>([
  "account-disabled",
  "email-unverified",
  "membership-required",
  "invite-pending",
  "forbidden",
  "governance-policy-required",
]);

const copy: Record<
  Exclude<WorkspaceAccessReason, "allowed" | "sign-in" | "session-expired">,
  { en: [string, string]; fr: [string, string] }
> = {
  "account-disabled": {
    en: [
      "Account disabled",
      "This account is inactive. Contact Umoja operations; signing in again will not restore access.",
    ],
    fr: [
      "Compte désactivé",
      "Ce compte est inactif. Contactez les opérations Umoja; une nouvelle connexion ne rétablira pas l’accès.",
    ],
  },
  "email-unverified": {
    en: [
      "Verify your email",
      "Verify the invited email address before entering the private workspace.",
    ],
    fr: [
      "Vérifiez votre adresse courriel",
      "Vérifiez l’adresse invitée avant d’accéder à l’espace privé.",
    ],
  },
  "membership-required": {
    en: [
      "Team membership required",
      "This account does not have a current Umoja operations membership. Applicants do not receive workspace access automatically.",
    ],
    fr: [
      "Adhésion à l’équipe requise",
      "Ce compte n’a pas d’adhésion active aux opérations Umoja. Une candidature ne donne pas automatiquement accès à l’espace.",
    ],
  },
  "invite-pending": {
    en: [
      "Invitation not accepted",
      "Accept the current Umoja Team invitation before entering the workspace.",
    ],
    fr: [
      "Invitation non acceptée",
      "Acceptez l’invitation actuelle à l’équipe Umoja avant d’ouvrir l’espace.",
    ],
  },
  forbidden: {
    en: [
      "Permission denied",
      "Your account is active, but your current Umoja role does not authorize this area.",
    ],
    fr: [
      "Permission refusée",
      "Votre compte est actif, mais votre rôle Umoja actuel n’autorise pas cet espace.",
    ],
  },
  "governance-policy-required": {
    en: [
      "Governance action blocked",
      "No current Umoja role—including admin—authorizes governance-only actions or publication of legal governance claims.",
    ],
    fr: [
      "Action de gouvernance bloquée",
      "Aucun rôle Umoja actuel, y compris admin, n’autorise les actions réservées à la gouvernance ni la publication d’affirmations juridiques.",
    ],
  },
};

export const dynamic = "force-dynamic";

export default async function AccountStatePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}>) {
  const { locale } = await params;
  const query = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  const actual = await getWorkspaceAccessState();
  const requested = visibleReasons.has(query.reason as WorkspaceAccessReason)
    ? (query.reason as WorkspaceAccessReason)
    : null;
  const reason = actual.reason === "allowed" && requested ? requested : actual.reason;
  const french = locale === "fr";

  if (reason === "allowed") {
    return (
      <section className="auth-page" aria-labelledby="account-state-title">
        <Container size="narrow">
          <div className="auth-card">
            <h1 id="account-state-title">{french ? "Accès actif" : "Access active"}</h1>
            <LinkButton href={`/${locale}/workspace`}>
              {french ? "Ouvrir l’espace" : "Open workspace"}
            </LinkButton>
          </div>
        </Container>
      </section>
    );
  }

  if (reason === "sign-in" || reason === "session-expired") {
    return (
      <section className="auth-page" aria-labelledby="account-state-title">
        <Container size="narrow">
          <div className="auth-card">
            <h1 id="account-state-title">{french ? "Connexion requise" : "Sign-in required"}</h1>
            <p>
              {french
                ? "Votre session est absente, expirée ou révoquée."
                : "Your session is missing, expired, or revoked."}
            </p>
            <LinkButton href={`/${locale}/sign-in`}>
              {french ? "Se connecter" : "Sign in"}
            </LinkButton>
          </div>
        </Container>
      </section>
    );
  }

  const [title, description] = copy[reason][locale];
  return (
    <section className="auth-page" aria-labelledby="account-state-title">
      <Container size="narrow">
        <div className="auth-card">
          <p className="auth-eyebrow">{french ? "État du compte" : "Account state"}</p>
          <h1 id="account-state-title">{title}</h1>
          <div className="auth-status" role="alert">
            {description}
          </div>
          <AccountActions locale={locale} showVerification={reason === "email-unverified"} />
          {reason === "forbidden" || reason === "governance-policy-required" ? (
            <LinkButton variant="secondary" href={`/${locale}/workspace`}>
              {french ? "Retour à l’espace" : "Return to workspace"}
            </LinkButton>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
