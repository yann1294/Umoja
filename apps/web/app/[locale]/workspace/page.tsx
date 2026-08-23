import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { requireWorkspaceUser } from "@/lib/appwrite/auth";
import "../sign-in/workspace-auth.css";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireWorkspaceUser(locale);
  return (
    <section className="auth-page" aria-labelledby="workspace-title">
      <Container size="narrow">
        <div className="auth-card">
          <p className="auth-eyebrow">{locale === "fr" ? "Espace privé" : "Private workspace"}</p>
          <h1 id="workspace-title">
            {locale === "fr" ? `Bienvenue, ${user.name}` : `Welcome, ${user.name}`}
          </h1>
          <p>
            {locale === "fr"
              ? "La fondation sécurisée de l’espace de travail est prête."
              : "The secure workspace foundation is ready."}
          </p>
        </div>
      </Container>
    </section>
  );
}
