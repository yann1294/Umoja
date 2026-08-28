import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { SupabaseCmsSignInForm } from "@/components/auth/supabase-cms-sign-in-form";
import { routing } from "@/i18n/routing";
import { safeIntakeReturnPath } from "@/lib/supabase/intake-return-path";
import "../../../sign-in/workspace-auth.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IntakeSignIn({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const safeLocale = locale as "en" | "fr";
  const next = safeIntakeReturnPath((await searchParams).next, safeLocale);
  const french = safeLocale === "fr";
  return (
    <section className="auth-page">
      <Container size="narrow">
        <div className="auth-card">
          <p className="auth-eyebrow">
            {french ? "Administration · demandes" : "Administration · intakes"}
          </p>
          <h1>{french ? "Connexion aux demandes" : "Intake sign in"}</h1>
          <p>
            {french
              ? "Accédez aux dossiers avec votre compte invité Supabase."
              : "Access intake review with your invited Supabase account."}
          </p>
          <SupabaseCmsSignInForm locale={safeLocale} next={next} />
        </div>
      </Container>
    </section>
  );
}
