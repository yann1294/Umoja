import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseApplicant } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileBundle } from "@/lib/profile/service";
import { routing } from "@/i18n/routing";
import { addLanguage, addSkill, removeLanguage, removeSkill } from "./actions";

export const dynamic = "force-dynamic";
export default async function SkillsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseApplicant(locale);
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
                {item.skills?.canonical_name} · {item.level}/5{" "}
                <form action={removeSkill.bind(null, locale as "en" | "fr")}>
                  <input type="hidden" name="skillId" value={item.skill_id} />
                  <button type="submit">{french ? "Retirer" : "Remove"}</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {french ? "Aucune compétence enregistrée pour le moment." : "No skills recorded yet."}
          </p>
        )}
        <form action={addSkill.bind(null, locale as "en" | "fr")}>
          <label>
            {french ? "Compétence" : "Skill"}
            <select name="skillId" required>
              {(
                await (
                  await createSupabaseServerClient()
                )
                  .from("skills")
                  .select("id,canonical_name")
                  .is("archived_at", null)
                  .order("canonical_name")
              ).data?.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.canonical_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {french ? "Niveau" : "Level"}
            <input name="level" type="number" min="1" max="5" defaultValue="3" />
          </label>
          <button className="workspace-primary-action" type="submit">
            {french ? "Ajouter" : "Add skill"}
          </button>
        </form>
      </section>
      <section className="workspace-panel">
        <h2>{french ? "Langues" : "Languages"}</h2>
        {bundle.languages.length ? (
          <ul>
            {bundle.languages.map((item) => (
              <li key={item.language_code}>
                {french ? item.languages?.display_label_fr : item.languages?.display_label_en} ·{" "}
                {item.proficiency}{" "}
                <form action={removeLanguage.bind(null, locale as "en" | "fr")}>
                  <input type="hidden" name="code" value={item.language_code} />
                  <button type="submit">{french ? "Retirer" : "Remove"}</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {french ? "Aucune langue enregistrée pour le moment." : "No languages recorded yet."}
          </p>
        )}
        <form action={addLanguage.bind(null, locale as "en" | "fr")}>
          <label>
            {french ? "Code langue" : "Language code"}
            <select name="code" required>
              {(
                await (
                  await createSupabaseServerClient()
                )
                  .from("languages")
                  .select("code,display_label_en,display_label_fr")
                  .order("code")
              ).data?.map((language) => (
                <option key={language.code} value={language.code}>
                  {french ? language.display_label_fr : language.display_label_en}
                </option>
              ))}
            </select>
          </label>
          <label>
            {french ? "Niveau" : "Proficiency"}
            <select name="proficiency">
              <option value="basic">{french ? "Débutant" : "Basic"}</option>
              <option value="conversational">{french ? "Conversation" : "Conversational"}</option>
              <option value="professional">{french ? "Professionnel" : "Professional"}</option>
              <option value="fluent">{french ? "Courant" : "Fluent"}</option>
              <option value="native">{french ? "Langue maternelle" : "Native"}</option>
            </select>
          </label>
          <button className="workspace-primary-action" type="submit">
            {french ? "Ajouter" : "Add language"}
          </button>
        </form>
      </section>
    </WorkspaceShell>
  );
}
