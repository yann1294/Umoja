import { Container, LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { TokenActionForm } from "../sign-in/auth-action-forms";
import "../sign-in/workspace-auth.css";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const { locale } = await params;
  const { userId = "", secret = "" } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  const french = locale === "fr";
  return (
    <section className="auth-page" aria-labelledby="verification-title">
      <Container size="narrow">
        <div className="auth-card">
          <h1 id="verification-title">
            {french ? "Vérifier l’adresse courriel" : "Verify email address"}
          </h1>
          {userId && secret ? (
            <TokenActionForm
              endpoint="/api/auth/verification/confirm"
              locale={locale}
              payload={{ userId, secret }}
              submitLabel={french ? "Vérifier et continuer" : "Verify and continue"}
            />
          ) : (
            <>
              <div className="auth-error" role="alert">
                {french
                  ? "Le lien de vérification est incomplet."
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
