import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseWorkspaceUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileBundle } from "@/lib/profile/service";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export default async function SkillsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceUser(locale);
  const bundle = await getProfileBundle(await createSupabaseServerClient(), user.id);
  const french = locale === "fr";
  return (
    <WorkspaceShell current="skills" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">
            {french ? "Compétences et langues" : "Skills and languages"}
          </p>
          <h1>{french ? "Ce que vous apportez" : "What you bring"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Les vérifications sont réservées à Umoja."
              : "Verification is reserved for Umoja reviewers."}
          </p>
        </div>
      </header>
      <section className="workspace-panel">
        <h2>{french ? "Compétences" : "Skills"}</h2>
        {bundle.skills.length ? (
          <ul>
            {bundle.skills.map((item) => (
              <li key={item.skill_id}>
                {item.skills?.canonical_name} · {item.level}/5
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {french ? "Aucune compétence enregistrée pour le moment." : "No skills recorded yet."}
          </p>
        )}
      </section>
      <section className="workspace-panel">
        <h2>{french ? "Langues" : "Languages"}</h2>
        {bundle.languages.length ? (
          <ul>
            {bundle.languages.map((item) => (
              <li key={item.language_code}>
                {item.languages?.display_label_en} · {item.proficiency}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {french ? "Aucune langue enregistrée pour le moment." : "No languages recorded yet."}
          </p>
        )}
      </section>
    </WorkspaceShell>
  );
}
