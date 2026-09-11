import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { moderatePortfolio, moderateProfile } from "./actions";

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
  const { data: submittedProfiles, error } = await client
    .from("profiles")
    .select(
      "user_id,professional_name,public_headline,public_avatar_url,public_website_url,public_professional_links,public_bio,country_code,publication_state,public_consent_at,updated_at",
    )
    .eq("publication_state", "submitted")
    .is("archived_at", null)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  const { data: submittedPortfolio, error: submittedPortfolioError } = await client
    .from("portfolio_items")
    .select(
      "id,profile_id,title,role_summary,external_url,category,technologies,publication_state,public_consent_at",
    )
    .eq("publication_state", "submitted")
    .not("public_consent_at", "is", null)
    .is("archived_at", null)
    .order("updated_at", { ascending: true });
  if (submittedPortfolioError) throw submittedPortfolioError;
  const submittedProfileIds = submittedProfiles?.map((profile) => profile.user_id) ?? [];
  const portfolioProfileIds = (submittedPortfolio ?? []).map((item) => item.profile_id);
  const profileIds = Array.from(new Set([...submittedProfileIds, ...portfolioProfileIds]));
  const missingPortfolioProfileIds = portfolioProfileIds.filter(
    (profileId) => !submittedProfileIds.includes(profileId),
  );
  const { data: portfolioOnlyProfiles, error: portfolioProfileError } =
    missingPortfolioProfileIds.length
      ? await client
          .from("profiles")
          .select(
            "user_id,professional_name,public_headline,public_avatar_url,public_website_url,public_professional_links,public_bio,country_code,publication_state,public_consent_at,updated_at",
          )
          .in("user_id", missingPortfolioProfileIds)
          .is("archived_at", null)
      : { data: [], error: null };
  if (portfolioProfileError) throw portfolioProfileError;
  const data = [...(submittedProfiles ?? []), ...(portfolioOnlyProfiles ?? [])];
  const { data: skills } = profileIds.length
    ? await client
        .from("profile_skills")
        .select("profile_id,level,skills(canonical_name)")
        .in("profile_id", profileIds)
    : { data: [] };
  const { data: languages } = profileIds.length
    ? await client
        .from("profile_languages")
        .select("profile_id,proficiency,languages(display_label_en,display_label_fr)")
        .in("profile_id", profileIds)
    : { data: [] };
  const { data: portfolio } = profileIds.length
    ? await client
        .from("portfolio_items")
        .select(
          "id,profile_id,title,role_summary,external_url,category,technologies,publication_state,public_consent_at",
        )
        .in("profile_id", profileIds)
        .is("archived_at", null)
    : { data: [] };
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
                {profile.public_headline ? <p>{profile.public_headline}</p> : null}
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
                {profile.public_avatar_url ? (
                  <p>{french ? "Avatar/logo proposé" : "Proposed avatar/logo"}: URL</p>
                ) : null}
                {profile.public_website_url ? (
                  <p>
                    {french ? "Site web public proposé" : "Proposed public website"}:{" "}
                    {profile.public_website_url}
                  </p>
                ) : null}
                {(skills ?? []).some((item) => item.profile_id === profile.user_id) ? (
                  <p>
                    {french ? "Compétences" : "Skills"}:{" "}
                    {(skills ?? [])
                      .filter((item) => item.profile_id === profile.user_id)
                      .map((item) => item.skills?.canonical_name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {(languages ?? []).some((item) => item.profile_id === profile.user_id) ? (
                  <p>
                    {french ? "Langues" : "Languages"}:{" "}
                    {(languages ?? [])
                      .filter((item) => item.profile_id === profile.user_id)
                      .map((item) =>
                        french
                          ? item.languages?.display_label_fr
                          : item.languages?.display_label_en,
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {(portfolio ?? []).some((item) => item.profile_id === profile.user_id) ? (
                  <div>
                    <p>{french ? "Portfolio proposé" : "Proposed portfolio"}:</p>
                    <ul>
                      {(portfolio ?? [])
                        .filter((item) => item.profile_id === profile.user_id)
                        .map((item) => (
                          <li key={item.id}>
                            <strong>{item.title}</strong> · {item.publication_state}
                            {item.public_consent_at ? " · consent" : ""}
                            <p>{item.role_summary}</p>
                            {item.technologies.length ? (
                              <small>{item.technologies.join(", ")}</small>
                            ) : null}
                            {item.publication_state === "submitted" && item.public_consent_at ? (
                              <form action={moderatePortfolio.bind(null, locale as "en" | "fr")}>
                                <input type="hidden" name="profileId" value={profile.user_id} />
                                <input type="hidden" name="itemId" value={item.id} />
                                <button name="state" value="approved" type="submit">
                                  {french ? "Approuver l’exemple" : "Approve example"}
                                </button>
                                <button name="state" value="changes_requested" type="submit">
                                  {french ? "Demander des changements" : "Request changes"}
                                </button>
                              </form>
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
                <form action={moderateProfile.bind(null, locale as "en" | "fr")}>
                  <input type="hidden" name="userId" value={profile.user_id} />
                  <input type="hidden" name="expectedUpdatedAt" value={profile.updated_at} />
                  <input type="hidden" name="slug" value={profile.user_id} />
                  <label>
                    {french
                      ? "Retour pour le candidat (facultatif)"
                      : "Applicant feedback (optional)"}
                    <textarea name="feedback" maxLength={2000} rows={3} />
                  </label>
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
            ? "Chaque décision est validée côté serveur et journalisée par empreinte."
            : "Each decision is server-validated and recorded by digest."}
        </p>
      </section>
    </WorkspaceShell>
  );
}
