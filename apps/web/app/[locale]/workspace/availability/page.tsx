import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseApplicant } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { availabilityState, getProfileBundle } from "@/lib/profile/service";
import { routing } from "@/i18n/routing";
import { saveAvailabilityAction } from "./actions";

export const dynamic = "force-dynamic";
export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseApplicant(locale);
  const bundle = await getProfileBundle(await createSupabaseServerClient(), user.id);
  const french = locale === "fr";
  const state = availabilityState(bundle.availability?.expires_at);
  return (
    <WorkspaceShell current="availability" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">{french ? "Disponibilité" : "Availability"}</p>
          <h1>{french ? "Quand pouvez-vous contribuer ?" : "When can you contribute?"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Cette confirmation expire après 30 jours."
              : "This confirmation expires after 30 days."}
          </p>
        </div>
      </header>
      <form
        className="workspace-form"
        action={saveAvailabilityAction.bind(null, locale as "en" | "fr")}
      >
        <section className="workspace-panel">
          <h2>{french ? "Confirmation actuelle" : "Current confirmation"}</h2>
          <p role="status">
            {state === "fresh"
              ? french
                ? "À jour"
                : "Fresh"
              : state === "stale"
                ? french
                  ? "À actualiser"
                  : "Stale"
                : french
                  ? "Inconnue"
                  : "Unknown"}
          </p>
          <p className="workspace-muted">
            {bundle.availability?.public_consent_at
              ? french
                ? "Vous avez accepté de proposer ce statut de disponibilité pour votre profil public après modération."
                : "You consented to propose this availability status for your public profile after moderation."
              : french
                ? "Votre disponibilité reste privée sauf si vous consentez explicitement à la proposer pour votre profil public."
                : "Your availability stays private unless you explicitly consent to propose it for your public profile."}
          </p>
          <label>
            {french ? "Heures hebdomadaires" : "Weekly available hours"}
            <input
              name="weeklyHours"
              type="number"
              min="0"
              max="80"
              required
              defaultValue={bundle.availability?.weekly_hours ?? 0}
            />
          </label>
          <label>
            {french ? "Prochaine date disponible" : "Next available date"}
            <input
              name="nextAvailableOn"
              type="date"
              defaultValue={bundle.availability?.next_available_on ?? ""}
            />
          </label>
          <label>
            {french ? "Mode de travail" : "Work mode"}
            <select name="workMode" defaultValue={bundle.availability?.work_mode ?? "remote"}>
              <option value="remote">{french ? "À distance" : "Remote"}</option>
              <option value="hybrid">{french ? "Hybride" : "Hybrid"}</option>
              <option value="onsite">{french ? "Sur site" : "On-site"}</option>
              <option value="flexible">{french ? "Flexible" : "Flexible"}</option>
            </select>
          </label>
          <label>
            <input
              name="publicConsent"
              type="checkbox"
              defaultChecked={Boolean(bundle.availability?.public_consent_at)}
            />
            {french
              ? "Proposer ce statut de disponibilité pour mon profil public approuvé."
              : "Propose this availability status for my approved public profile."}
          </label>
          <button className="workspace-primary-action" type="submit">
            {french ? "Confirmer ma disponibilité" : "Confirm availability"}
          </button>
        </section>
      </form>
    </WorkspaceShell>
  );
}
