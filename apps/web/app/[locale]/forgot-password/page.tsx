import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { RecoveryRequestForm } from "../sign-in/auth-action-forms";
import "../sign-in/workspace-auth.css";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const french = locale === "fr";
  return (
    <section className="auth-page" aria-labelledby="recovery-title">
      <Container size="narrow">
        <div className="auth-card">
          <p className="auth-eyebrow">{french ? "Compte invité" : "Invited account"}</p>
          <h1 id="recovery-title">{french ? "Récupérer l’accès" : "Recover access"}</h1>
          <p>
            {french
              ? "Nous renvoyons toujours la même réponse afin de protéger la confidentialité des comptes."
              : "We always return the same response to protect account privacy."}
          </p>
          <RecoveryRequestForm locale={locale} />
        </div>
      </Container>
    </section>
  );
}
