import { Container, LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import "../sign-in/workspace-auth.css";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ verified?: string; state?: string }>;
}) {
  const { locale } = await params;
  const { verified, state } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  const french = locale === "fr";
  return (
    <section className="auth-page" aria-labelledby="verification-title">
      <Container size="narrow">
        <div className="auth-card">
          <h1 id="verification-title">
            {french ? "Vérifier l’adresse courriel" : "Verify email address"}
          </h1>
          {verified === "1" ? (
            <>
              <p role="status">
                {french
                  ? "Votre adresse courriel est vérifiée."
                  : "Your email address is verified."}
              </p>
              <LinkButton href={`/${locale}/sign-in`}>
                {french ? "Se connecter" : "Sign in"}
              </LinkButton>
            </>
          ) : (
            <>
              <div className="auth-error" role="alert">
                {french
                  ? state === "invalid"
                    ? "Ce lien est invalide, expiré ou déjà utilisé."
                    : "Le lien de vérification est incomplet."
                  : state === "invalid"
                    ? "This link is invalid, expired, or already used."
                    : "The verification link is incomplete."}
              </div>
              <LinkButton href={`/${locale}/account-state?reason=email-unverified`}>
                {french ? "Retour à l’état du compte" : "Return to account state"}
              </LinkButton>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
