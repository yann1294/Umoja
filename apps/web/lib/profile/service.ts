import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../../../../supabase/database.types";

type Client = SupabaseClient<Database>;
export const profileInputSchema = z.object({
  professionalName: z.string().trim().min(1).max(120),
  locale: z.enum(["en", "fr"]),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .or(z.literal("")),
  publicBio: z.string().trim().max(2000),
  publicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120)
    .optional()
    .or(z.literal("")),
  visibility: z.enum(["private", "public"]),
  requestReview: z.boolean().default(false),
});
export const availabilityInputSchema = z.object({
  weeklyHours: z.coerce.number().int().min(0).max(80),
  nextAvailableOn: z.string().date().optional().or(z.literal("")),
  workMode: z.enum(["remote", "hybrid", "onsite", "flexible"]),
});

export async function getProfileBundle(client: Client, userId: string) {
  const [profile, skills, languages, portfolio, availability, membership, intake] =
    await Promise.all([
      client.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      client.from("profile_skills").select("*, skills(*)").eq("profile_id", userId),
      client.from("profile_languages").select("*, languages(*)").eq("profile_id", userId),
      client
        .from("portfolio_items")
        .select("*")
        .eq("profile_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false }),
      client
        .from("availability_snapshots")
        .select("*")
        .eq("profile_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("membership_history")
        .select("tier,effective_from,effective_to")
        .eq("user_id", userId)
        .is("effective_to", null)
        .maybeSingle(),
      client
        .from("talent_intakes")
        .select("status,created_at")
        .eq("applicant_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  const error = [profile, skills, languages, portfolio, availability, membership, intake].find(
    (result) => result.error,
  )?.error;
  if (error) throw error;
  return {
    profile: profile.data,
    skills: skills.data ?? [],
    languages: languages.data ?? [],
    portfolio: portfolio.data ?? [],
    availability: availability.data,
    membership: membership.data,
    intake: intake.data,
  };
}

export async function saveProfile(
  client: Client,
  userId: string,
  value: z.input<typeof profileInputSchema>,
) {
  const input = profileInputSchema.parse(value);
  const review =
    input.requestReview && input.visibility === "public"
      ? "submitted"
      : input.visibility === "public"
        ? "draft"
        : "private";
  const { error } = await client.from("profiles").upsert(
    {
      user_id: userId,
      professional_name: input.professionalName,
      locale: input.locale,
      country_code: input.countryCode || null,
      public_bio: input.publicBio || null,
      public_slug: input.publicSlug || null,
      visibility: input.visibility,
      public_consent_at: input.visibility === "public" ? new Date().toISOString() : null,
      consent_version: input.visibility === "public" ? "profile-public-v1" : null,
      publication_state: review,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function saveAvailability(
  client: Client,
  userId: string,
  value: z.input<typeof availabilityInputSchema>,
) {
  const input = availabilityInputSchema.parse(value);
  const now = new Date();
  const { error } = await client.from("availability_snapshots").insert({
    profile_id: userId,
    weekly_hours: input.weeklyHours,
    next_available_on: input.nextAvailableOn || null,
    work_mode: input.workMode,
    confirmed_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
  });
  if (error) throw error;
}

export function availabilityState(expiresAt: string | null | undefined, now = new Date()) {
  if (!expiresAt) return "unknown" as const;
  return new Date(expiresAt) > now ? ("fresh" as const) : ("stale" as const);
}

export function publicProfileSerializer(bundle: Awaited<ReturnType<typeof getProfileBundle>>) {
  const profile = bundle.profile;
  if (
    !profile ||
    profile.publication_state !== "approved" ||
    profile.visibility !== "public" ||
    !profile.public_consent_at ||
    profile.archived_at
  )
    return null;
  return {
    slug: profile.public_slug,
    name: profile.professional_name,
    locale: profile.locale,
    countryCode: profile.country_code,
    biography: profile.public_bio,
    skills: bundle.skills.map((item) => ({ name: item.skills?.canonical_name, level: item.level })),
    languages: bundle.languages
      .filter((item) => item.public_consent_at)
      .map((item) => ({
        code: item.language_code,
        proficiency: item.proficiency,
        label: item.languages?.display_label_en,
      })),
    portfolio: bundle.portfolio
      .filter((item) => item.publication_state === "approved" && item.public_consent_at)
      .map((item) => ({
        title: item.title,
        role: item.role_summary,
        url: item.external_url,
        category: item.category,
      })),
    availability:
      availabilityState(bundle.availability?.expires_at) === "fresh"
        ? {
            workMode: bundle.availability?.work_mode,
            nextAvailableOn: bundle.availability?.next_available_on,
          }
        : { state: "unknown" },
  };
}
