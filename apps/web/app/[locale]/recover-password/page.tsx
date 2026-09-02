import { Container, LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { hasValidSupabasePasswordFlow } from "@/lib/supabase/auth";
import { RecoveryConfirmForm } from "../sign-in/auth-action-forms";
import "../sign-in/workspace-auth.css";

export default async function RecoverPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const french = locale === "fr";
  const valid = await hasValidSupabasePasswordFlow("recovery");
  return (
    <section className="auth-page" aria-labelledby="recovery-confirm-title">
      <Container size="narrow">
        <div className="auth-card">
          <h1 id="recovery-confirm-title">
            {french ? "Choisir un nouveau mot de passe" : "Choose a new password"}
          </h1>
          {valid ? (
            <RecoveryConfirmForm locale={locale} />
          ) : (
            <>
              <div className="auth-error" role="alert">
                {french
                  ? "Le lien de récupération est incomplet."
                  : "The recovery link is incomplete."}
              </div>
              <LinkButton href={`/${locale}/forgot-password`}>
                {french ? "Demander un nouveau lien" : "Request a new link"}
              </LinkButton>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
