import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { safeAuthReturnPath } from "@/lib/supabase/auth-return-path";
import { SignInForm } from "./sign-in-form";
import "./workspace-auth.css";

export default async function SignInPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string; next?: string; password?: string; auth?: string }>;
}>) {
  const { locale } = await params;
  const { reason, next, password, auth } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  const safeLocale = locale as "en" | "fr";
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
          {reason === "session-expired" ? (
            <div className="auth-status" role="status">
              {french
                ? "Votre session a expiré ou a été révoquée. Reconnectez-vous pour continuer."
                : "Your session expired or was revoked. Sign in again to continue."}
            </div>
          ) : null}
          {password === "updated" ? (
            <div className="auth-status" role="status">
              {french
                ? "Votre mot de passe a été mis à jour. Connectez-vous avec votre nouveau mot de passe."
                : "Your password was updated. Sign in with your new password."}
            </div>
          ) : null}
          {auth === "invalid" ? (
            <div className="auth-error" role="alert">
              {french
                ? "Ce lien d’authentification est invalide, expiré ou déjà utilisé. Recommencez la procédure appropriée."
                : "This authentication link is invalid, expired, or already used. Restart the appropriate process."}
            </div>
          ) : null}
          <SignInForm locale={safeLocale} next={safeAuthReturnPath(next, safeLocale)} />
        </div>
      </Container>
    </section>
  );
}
