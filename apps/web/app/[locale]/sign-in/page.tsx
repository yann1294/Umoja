import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { SignInForm } from "./sign-in-form";
import "./workspace-auth.css";

export default async function SignInPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const french = locale === "fr";
  return (
    <section className="auth-page" aria-labelledby="sign-in-title">
      <Container size="narrow">
        <div className="auth-card">
          <p className="auth-eyebrow">{french ? "Espace privé" : "Private workspace"}</p>
          <h1 id="sign-in-title">{french ? "Connexion à Umoja" : "Sign in to Umoja"}</h1>
          <p>
            {french
              ? "Accédez aux outils opérationnels avec votre compte invité."
              : "Use your invited account to access operational tools."}
          </p>
          <SignInForm locale={locale} />
        </div>
      </Container>
    </section>
  );
}
