import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { moderateProfile } from "./actions";

export const dynamic = "force-dynamic";
export default async function AdminProfilesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("profiles")
    .select(
      "user_id,professional_name,public_bio,country_code,publication_state,public_consent_at,updated_at",
    )
    .eq("publication_state", "submitted")
    .is("archived_at", null)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  const french = locale === "fr";
  return (
    <WorkspaceShell current="admin" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">{french ? "Modération" : "Moderation"}</p>
          <h1>{french ? "Demandes de profil public" : "Public profile requests"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Examinez uniquement les champs publics éligibles."
              : "Review eligible public fields only."}
          </p>
        </div>
      </header>
      <section className="workspace-panel">
        {data?.length ? (
          <ul>
            {data.map((profile) => (
              <li key={profile.user_id}>
                <strong>{profile.professional_name}</strong>
                <p>{profile.public_bio}</p>
                <small>
                  {profile.country_code ?? ""} ·{" "}
                  {profile.public_consent_at
                    ? french
                      ? "Consentement actuel"
                      : "Current consent"
                    : french
                      ? "Consentement manquant"
                      : "Consent missing"}
                </small>
                <form action={moderateProfile.bind(null, locale as "en" | "fr")}>
                  <input type="hidden" name="userId" value={profile.user_id} />
                  <input type="hidden" name="slug" value={profile.user_id} />
                  <button name="state" value="approved" type="submit">
                    {french ? "Approuver" : "Approve"}
                  </button>
                  <button name="state" value="changes_requested" type="submit">
                    {french ? "Demander des changements" : "Request changes"}
                  </button>
                  <button name="state" value="revoked" type="submit">
                    {french ? "Révoquer" : "Revoke"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {french ? "Aucune demande à examiner." : "No profile requests are waiting for review."}
          </p>
        )}
        <p className="workspace-help">
          {french
            ? "Les décisions d’approbation seront ajoutées dans une action serveur auditée."
            : "Approval decisions will be added through an audited server action."}
        </p>
      </section>
    </WorkspaceShell>
  );
}
