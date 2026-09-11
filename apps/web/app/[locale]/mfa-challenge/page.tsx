import { Container, LinkButton } from "@umoja/ui";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { safeAuthReturnPath } from "@/lib/supabase/auth-return-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MfaChallengeForm } from "./mfa-challenge-form";
import "../sign-in/workspace-auth.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MfaChallengePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const safeLocale = locale as "en" | "fr";
  const requestedNext = safeAuthReturnPath((await searchParams).next, safeLocale);
  const client = await createSupabaseServerClient();
  const [{ data: userData }, { data: factors }, { data: assurance }] = await Promise.all([
    client.auth.getUser(),
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!userData.user) redirect(`/${safeLocale}/sign-in?next=${encodeURIComponent(requestedNext)}`);
  if (assurance?.currentLevel === "aal2") redirect(requestedNext);
  const hasTotp = factors?.totp?.some((factor) => factor.status === "verified");
  const french = safeLocale === "fr";

  return (
    <section className="auth-page" aria-labelledby="mfa-title">
      <Container size="narrow">
        <div className="auth-card">
          <p className="auth-eyebrow">{french ? "Accès administrateur" : "Administrator access"}</p>
          <h1 id="mfa-title">
            {french ? "Vérification supplémentaire" : "Additional verification"}
          </h1>
          {hasTotp && assurance?.nextLevel === "aal2" ? (
            <>
              <p>
                {french
                  ? "Saisissez le code actuel de votre application d’authentification."
                  : "Enter the current code from your authenticator app."}
              </p>
              <MfaChallengeForm locale={safeLocale} next={requestedNext} />
            </>
          ) : (
            <>
              <div className="auth-status" role="alert">
                {french
                  ? "Ce compte administrateur n’a pas de facteur MFA vérifié utilisable. Contactez le propriétaire Umoja pour suivre la procédure d’activation approuvée."
                  : "This administrator account has no usable verified MFA factor. Contact the Umoja owner to follow the approved enrollment process."}
              </div>
              <LinkButton href={`/${safeLocale}/account-state?reason=mfa-required`}>
                {french ? "Afficher l’état de l’accès" : "View access status"}
              </LinkButton>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
