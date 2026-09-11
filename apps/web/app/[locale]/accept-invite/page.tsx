import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { hasValidSupabasePasswordFlow } from "@/lib/supabase/auth";
import { hasValidUmojaInvitation } from "@/lib/invitations/service";
import { InvitationPasswordForm } from "../sign-in/auth-action-forms";
import "../sign-in/workspace-auth.css";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const french = locale === "fr";
  const valid = (await hasValidUmojaInvitation()) || (await hasValidSupabasePasswordFlow("invite"));
  return (
    <section className="auth-page" aria-labelledby="invite-title">
      <Container size="narrow">
        <div className="auth-card">
          <h1 id="invite-title">
            {french ? "Accepter l’invitation Umoja" : "Accept the Umoja invitation"}
          </h1>
          <p>
            {french
              ? "Créez le premier mot de passe de ce compte invité. Aucun mot de passe existant n’est requis."
              : "Create the first password for this invited account. No existing password is required."}
          </p>
          {valid ? (
            <InvitationPasswordForm locale={locale} />
          ) : (
            <>
              <div className="auth-error" role="alert">
                {french
                  ? "Cette invitation est invalide, expirée ou déjà utilisée. Demandez à un administrateur Umoja de recommencer l’invitation."
                  : "This invitation is invalid, expired, or already used. Ask an Umoja administrator to restart the invitation."}
              </div>
              <a className="auth-text-link" href={`/${locale}/sign-in`}>
                {french ? "Retour à la connexion" : "Back to sign in"}
              </a>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
