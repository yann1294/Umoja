import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseWorkspaceUser } from "@/lib/supabase/auth";
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
  const user = await requireSupabaseWorkspaceUser(locale);
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
          <button className="workspace-primary-action" type="submit">
            {french ? "Confirmer ma disponibilité" : "Confirm availability"}
          </button>
        </section>
      </form>
    </WorkspaceShell>
  );
}
