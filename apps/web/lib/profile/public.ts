import "server-only";

import type { Json } from "../../../../supabase/database.types";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type PublicTalentLink = Readonly<{ label: string; url: string }>;
export type PublicTalentProfile = Readonly<{
  userId: string;
  slug: string;
  name: string;
  locale: string;
  countryCode: string | null;
  biography: string;
  headline: string | null;
  avatarUrl: string | null;
  websiteUrl: string | null;
  professionalLinks: readonly PublicTalentLink[];
  skills: readonly Readonly<{ name: string; category: string | null; level: number }>[];
  languages: readonly Readonly<{
    code: string;
    labelEn: string;
    labelFr: string;
    proficiency: string;
  }>[];
  portfolio: readonly Readonly<{
    id: string;
    title: string;
    role: string;
    url: string | null;
    category: string | null;
    startedOn: string | null;
    endedOn: string | null;
    technologies: readonly string[];
  }>[];
  availability: Readonly<{
    workMode: string | null;
    nextAvailableOn: string | null;
    expiresAt: string | null;
  }> | null;
}>;

export function normalizePublicTalentLinks(value: Json | null): readonly PublicTalentLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const url = typeof record.url === "string" ? record.url.trim() : "";
    if (!label || !/^https?:\/\//.test(url)) return [];
    return [{ label, url }];
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function publicTalentInitials(name: string) {
  return initials(name) || "U";
}

export async function listPublicTalentProfiles(): Promise<PublicTalentProfile[]> {
  const client = createSupabasePublicClient({ noStore: true });
  const { data: profiles, error } = await client
    .from("public_profiles")
    .select(
      "user_id,public_slug,professional_name,locale,country_code,public_bio,public_headline,public_avatar_url,public_website_url,public_professional_links",
    )
    .order("professional_name");
  if (isMissingProjectionColumn(error)) return listLegacyPublicProfiles();
  if (error) throw error;
  return hydratePublicProfiles((profiles ?? []).filter((profile) => profile.user_id));
}

export async function getPublicTalentProfile(slug: string): Promise<PublicTalentProfile | null> {
  const client = createSupabasePublicClient({ noStore: true });
  const { data: profile, error } = await client
    .from("public_profiles")
    .select(
      "user_id,public_slug,professional_name,locale,country_code,public_bio,public_headline,public_avatar_url,public_website_url,public_professional_links",
    )
    .eq("public_slug", slug)
    .maybeSingle();
  if (isMissingProjectionColumn(error)) return getLegacyPublicProfile(slug);
  if (error) throw error;
  if (!profile?.user_id) return null;
  return (await hydratePublicProfiles([profile]))[0] ?? null;
}

function isMissingProjectionColumn(error: { code?: string } | null) {
  return error?.code === "42703";
}

async function listLegacyPublicProfiles(): Promise<PublicTalentProfile[]> {
  const client = createSupabasePublicClient({ noStore: true });
  const { data, error } = await client
    .from("public_profiles")
    .select("public_slug,professional_name,locale,country_code,public_bio")
    .order("professional_name");
  if (error) throw error;
  return (data ?? []).flatMap((row) => publicTalentProfileFromLegacyProjection(row));
}

async function getLegacyPublicProfile(slug: string): Promise<PublicTalentProfile | null> {
  const client = createSupabasePublicClient({ noStore: true });
  const { data, error } = await client
    .from("public_profiles")
    .select("public_slug,professional_name,locale,country_code,public_bio")
    .eq("public_slug", slug)
    .maybeSingle();
  if (error) throw error;
  return publicTalentProfileFromLegacyProjection(data)[0] ?? null;
}

export function publicTalentProfileFromLegacyProjection(
  row: {
    public_slug: string | null;
    professional_name: string | null;
    locale: string | null;
    country_code: string | null;
    public_bio: string | null;
  } | null,
): PublicTalentProfile[] {
  if (!row?.public_slug || !row.professional_name) return [];
  return [
    {
      userId: `legacy:${row.public_slug}`,
      slug: row.public_slug,
      name: row.professional_name,
      locale: row.locale ?? "en",
      countryCode: row.country_code,
      biography: row.public_bio ?? "",
      headline: null,
      avatarUrl: null,
      websiteUrl: null,
      professionalLinks: [],
      skills: [],
      languages: [],
      portfolio: [],
      availability: null,
    },
  ];
}

async function hydratePublicProfiles(
  rows: readonly {
    user_id: string | null;
    public_slug: string | null;
    professional_name: string | null;
    locale: string | null;
    country_code: string | null;
    public_bio: string | null;
    public_headline: string | null;
    public_avatar_url: string | null;
    public_website_url: string | null;
    public_professional_links: Json;
  }[],
): Promise<PublicTalentProfile[]> {
  const ids = rows.map((row) => row.user_id).filter((id): id is string => Boolean(id));
  if (!ids.length) return [];
  const client = createSupabasePublicClient({ noStore: true });
  const [skills, languages, portfolio, availability] = await Promise.all([
    client
      .from("profile_skills")
      .select("profile_id,level,skills(canonical_name,category)")
      .in("profile_id", ids),
    client
      .from("profile_languages")
      .select("profile_id,language_code,proficiency,languages(display_label_en,display_label_fr)")
      .in("profile_id", ids),
    client
      .from("portfolio_items")
      .select(
        "id,profile_id,title,role_summary,external_url,category,started_on,ended_on,technologies",
      )
      .in("profile_id", ids)
      .order("updated_at", { ascending: false }),
    client.from("public_profile_availability").select("*").in("profile_id", ids),
  ]);
  const firstError = [skills, languages, portfolio, availability].find((result) => result.error);
  if (firstError?.error) throw firstError.error;
  return rows
    .filter((row) => row.user_id && row.public_slug && row.professional_name)
    .map((row) => ({
      userId: row.user_id!,
      slug: row.public_slug!,
      name: row.professional_name!,
      locale: row.locale ?? "en",
      countryCode: row.country_code,
      biography: row.public_bio ?? "",
      headline: row.public_headline,
      avatarUrl: row.public_avatar_url,
      websiteUrl: row.public_website_url,
      professionalLinks: normalizePublicTalentLinks(row.public_professional_links),
      skills: (skills.data ?? [])
        .filter((item) => item.profile_id === row.user_id && item.skills?.canonical_name)
        .map((item) => ({
          name: item.skills!.canonical_name,
          category: item.skills!.category ?? null,
          level: item.level,
        })),
      languages: (languages.data ?? [])
        .filter((item) => item.profile_id === row.user_id && item.languages?.display_label_en)
        .map((item) => ({
          code: item.language_code,
          labelEn: item.languages!.display_label_en,
          labelFr: item.languages!.display_label_fr,
          proficiency: item.proficiency,
        })),
      portfolio: (portfolio.data ?? [])
        .filter((item) => item.profile_id === row.user_id)
        .map((item) => ({
          id: item.id,
          title: item.title,
          role: item.role_summary,
          url: item.external_url,
          category: item.category,
          startedOn: item.started_on,
          endedOn: item.ended_on,
          technologies: item.technologies,
        })),
      availability: (() => {
        const item = (availability.data ?? []).find((entry) => entry.profile_id === row.user_id);
        return item
          ? {
              workMode: item.work_mode,
              nextAvailableOn: item.next_available_on,
              expiresAt: item.expires_at,
            }
          : null;
      })(),
    }));
}
