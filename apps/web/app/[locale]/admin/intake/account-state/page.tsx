import { Container, LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import "../../../sign-in/workspace-auth.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IntakeAccountState({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const french = locale === "fr";
  const mfa = (await searchParams).reason === "mfa-required";
  return (
    <section className="auth-page">
      <Container size="narrow">
        <div className="auth-card">
          <p className="auth-eyebrow">{french ? "État du compte" : "Account state"}</p>
          <h1>
            {mfa
              ? french
                ? "Vérification renforcée requise"
                : "Additional verification required"
              : french
                ? "Permission refusée"
                : "Permission denied"}
          </h1>
          <p role="alert">
            {mfa
              ? french
                ? "Cette route est prête pour l’exigence MFA, mais l’activation opérationnelle reste en attente."
                : "This route is MFA-ready, but operational enforcement remains pending."
              : french
                ? "Votre compte actif ne possède pas le rôle requis pour examiner les demandes."
                : "Your active account does not have the role required to review intakes."}
          </p>
          <LinkButton href={`/${locale}/admin/intake/sign-in`} variant="secondary">
            {french ? "Retour à la connexion" : "Return to sign in"}
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}
