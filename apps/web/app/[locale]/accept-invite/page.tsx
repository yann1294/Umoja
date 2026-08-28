import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { InvitationPasswordForm } from "../sign-in/auth-action-forms";
import "../sign-in/workspace-auth.css";

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ accepted?: string; state?: string }>;
}) {
  const { locale } = await params;
  const { accepted, state } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  const french = locale === "fr";
  return (
    <section className="auth-page" aria-labelledby="invite-title">
      <Container size="narrow">
        <div className="auth-card">
          <h1 id="invite-title">
            {french ? "Accepter l’invitation Umoja" : "Accept the Umoja invitation"}
          </h1>
          <p>
            {french
              ? "Connectez-vous avec l’adresse invitée avant de confirmer l’adhésion."
              : "Sign in with the invited address before confirming membership."}
          </p>
          {accepted === "1" && state !== "invalid" ? (
            <InvitationPasswordForm locale={locale} />
          ) : (
            <div className="auth-error" role="alert">
              {french
                ? "Le lien d’invitation est incomplet."
                : "The invitation link is incomplete."}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
