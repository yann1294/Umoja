import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import {
  InvitationPasswordForm,
  RecoveryConfirmForm,
} from "../../[locale]/sign-in/auth-action-forms";
import { MfaChallengeForm } from "../../[locale]/mfa-challenge/mfa-challenge-form";
import "../../[locale]/sign-in/workspace-auth.css";

export const dynamic = "force-dynamic";

export default async function AuthFixturePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ locale?: string; state?: string }>;
}>) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_SYSTEM_ENABLED !== "true") {
    notFound();
  }
  const query = await searchParams;
  const locale = query.locale === "fr" ? "fr" : "en";
  const french = locale === "fr";
  const state = ["invite", "recovery", "mfa"].includes(query.state ?? "") ? query.state : "invite";
  const title =
    state === "recovery"
      ? french
        ? "Choisir un nouveau mot de passe"
        : "Choose a new password"
      : state === "mfa"
        ? french
          ? "Vérification supplémentaire"
          : "Additional verification"
        : french
          ? "Accepter l’invitation Umoja"
          : "Accept the Umoja invitation";
  return (
    <section className="auth-page" aria-labelledby="auth-fixture-title">
      <Container size="narrow">
        <div className="auth-card">
          <p className="auth-eyebrow">{french ? "Parcours de compte" : "Account journey"}</p>
          <h1 id="auth-fixture-title">{title}</h1>
          {state === "recovery" ? (
            <RecoveryConfirmForm locale={locale} />
          ) : state === "mfa" ? (
            <MfaChallengeForm locale={locale} next={`/${locale}/admin`} />
          ) : (
            <InvitationPasswordForm locale={locale} />
          )}
        </div>
      </Container>
    </section>
  );
}
