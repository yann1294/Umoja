import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseApplicant } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileBundle } from "@/lib/profile/service";
import { routing } from "@/i18n/routing";
import { saveProfileAction } from "./actions";

export const dynamic = "force-dynamic";
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseApplicant(locale);
  const bundle = await getProfileBundle(await createSupabaseServerClient(), user.id);
  const french = locale === "fr";
  return (
    <WorkspaceShell current="profile" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">
            {french ? "Profil contributeur" : "Contributor profile"}
          </p>
          <h1>{french ? "Votre profil" : "Your profile"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Séparez clairement les informations publiques et opérationnelles."
              : "Keep public identity and operational details clearly separate."}
          </p>
        </div>
      </header>
      <form className="workspace-form" action={saveProfileAction.bind(null, locale as "en" | "fr")}>
        <input type="hidden" name="expectedUpdatedAt" value={bundle.profile?.updated_at ?? ""} />
        <section className="workspace-panel">
          <h2>{french ? "Identité publique" : "Public professional identity"}</h2>
          <label>
            {french ? "Nom professionnel" : "Professional name"}
            <input
              name="professionalName"
              required
              maxLength={120}
              defaultValue={bundle.profile?.professional_name ?? ""}
            />
          </label>
          <label>
            {french ? "Slug public" : "Public slug"}
            <input
              name="publicSlug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              defaultValue={bundle.profile?.public_slug ?? ""}
            />
            <small>
              {french
                ? "Utilisé uniquement après approbation."
                : "Used only after moderation approval."}
            </small>
          </label>
          <label>
            {french ? "Pays ou région" : "Country or region"}
            <input
              name="countryCode"
              maxLength={2}
              defaultValue={bundle.profile?.country_code ?? ""}
            />
          </label>
          <label>
            {french ? "Biographie publique" : "Public biography"}
            <textarea
              name="publicBio"
              maxLength={2000}
              rows={6}
              defaultValue={bundle.profile?.public_bio ?? ""}
            />
          </label>
        </section>
        <section className="workspace-panel">
          <h2>{french ? "Détails opérationnels privés" : "Private operational details"}</h2>
          <label>
            {french ? "Fuseau horaire" : "Timezone"}
            <input name="timezone" placeholder="Africa/Nairobi" />
          </label>
          <p className="workspace-help">
            {french
              ? "Chiffré avant enregistrement et jamais publié."
              : "Encrypted before storage and never published."}
          </p>
        </section>
        <section className="workspace-panel">
          <h2>{french ? "Visibilité" : "Visibility and consent"}</h2>
          <label>
            <input
              type="radio"
              name="visibility"
              value="private"
              defaultChecked={bundle.profile?.visibility !== "public"}
            />{" "}
            {french ? "Brouillon privé" : "Private draft"}
          </label>
          <label>
            <input
              type="radio"
              name="visibility"
              value="public"
              defaultChecked={bundle.profile?.visibility === "public"}
            />{" "}
            {french ? "Je consens à demander une publication" : "I consent to request publication"}
          </label>
          <label>
            <input type="checkbox" name="requestReview" />{" "}
            {french ? "Soumettre pour revue publique" : "Submit for public review"}
          </label>
          <p className="workspace-help">
            {french
              ? "Votre consentement ne publie jamais automatiquement le profil : une approbation Umoja est requise."
              : "Consent never publishes automatically: Umoja moderation approval is required."}
          </p>
          <button className="workspace-primary-action" type="submit">
            {french ? "Enregistrer le profil" : "Save profile"}
          </button>
        </section>
        <section className="workspace-panel">
          <h2>{french ? "État de revue" : "Review status"}</h2>
          <p>
            {bundle.profile?.publication_state ??
              (french ? "Pas encore commencé" : "Not started yet")}
          </p>
          {bundle.feedback.length ? (
            <div aria-live="polite">
              <h3>{french ? "Retour Umoja" : "Umoja feedback"}</h3>
              {bundle.feedback.map((item, index) => (
                <p key={`${item.created_at}-${index}`}>
                  {item.feedback || (french ? "Décision enregistrée." : "Decision recorded.")}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      </form>
    </WorkspaceShell>
  );
}
