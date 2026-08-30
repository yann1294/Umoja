import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../../../../supabase/database.types";
import {
  createIntakeEncryptionKeyringFromEnvironment,
  encryptIntakeValue,
} from "@/lib/intake/encryption";

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
  expectedUpdatedAt: z.string().datetime().optional(),
});
export const availabilityInputSchema = z.object({
  weeklyHours: z.coerce.number().int().min(0).max(80),
  nextAvailableOn: z.string().date().optional().or(z.literal("")),
  workMode: z.enum(["remote", "hybrid", "onsite", "flexible"]),
});

export async function getProfileBundle(client: Client, userId: string) {
  const [profile, skills, languages, portfolio, availability, membership, intake, feedback] =
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
      client
        .from("profile_moderation_feedback")
        .select("decision,feedback,created_at")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
  const error = [
    profile,
    skills,
    languages,
    portfolio,
    availability,
    membership,
    intake,
    feedback,
  ].find((result) => result.error)?.error;
  if (error) throw error;
  return {
    profile: profile.data,
    skills: skills.data ?? [],
    languages: languages.data ?? [],
    portfolio: portfolio.data ?? [],
    availability: availability.data,
    membership: membership.data,
    intake: intake.data,
    feedback: feedback.data ?? [],
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
  const { error } = await client.rpc("save_profile_with_audit", {
    profile_user_id: userId,
    professional_name: input.professionalName,
    profile_locale: input.locale,
    profile_country: input.countryCode || "",
    profile_bio: input.publicBio,
    profile_slug: input.publicSlug || "",
    profile_visibility: input.visibility,
    requested_state: review,
    consent_given: input.visibility === "public",
    expected_updated_at: input.expectedUpdatedAt ?? undefined,
  });
  if (error) throw error;
}

export async function saveProfileWithPrivateDetails(
  client: Client,
  userId: string,
  value: z.input<typeof profileInputSchema>,
  timezone: string,
) {
  const input = profileInputSchema.parse(value);
  const parsedTimezone = z.string().trim().max(80).parse(timezone);
  const keyring = createIntakeEncryptionKeyringFromEnvironment(process.env);
  const encrypted = encryptIntakeValue(
    JSON.stringify({ timezone: parsedTimezone || null }),
    `profile:${userId}:private-details`,
    keyring,
  );
  const requestedState =
    input.requestReview && input.visibility === "public"
      ? "submitted"
      : input.visibility === "public"
        ? "draft"
        : "private";
  const { error } = await client.rpc("save_profile_with_audit", {
    profile_user_id: userId,
    professional_name: input.professionalName,
    profile_locale: input.locale,
    profile_country: input.countryCode || "",
    profile_bio: input.publicBio,
    profile_slug: input.publicSlug || "",
    profile_visibility: input.visibility,
    requested_state: requestedState,
    consent_given: input.visibility === "public",
    expected_updated_at: input.expectedUpdatedAt ?? undefined,
    private_envelope: encrypted,
    private_key_version: keyring.activeVersion,
  });
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

export async function addProfileSkill(
  client: Client,
  userId: string,
  skillId: string,
  level: number,
) {
  const parsed = z
    .object({ skillId: z.uuid(), level: z.number().int().min(1).max(5) })
    .parse({ skillId, level });
  const { error } = await client.from("profile_skills").upsert(
    {
      profile_id: userId,
      skill_id: parsed.skillId,
      level: parsed.level,
      verification: "self_reported",
    },
    { onConflict: "profile_id,skill_id" },
  );
  if (error) throw error;
}

export async function removeProfileSkill(client: Client, userId: string, skillId: string) {
  const { error } = await client
    .from("profile_skills")
    .delete()
    .eq("profile_id", userId)
    .eq("skill_id", skillId);
  if (error) throw error;
}

export async function addProfileLanguage(
  client: Client,
  userId: string,
  code: string,
  proficiency: string,
) {
  const parsed = z
    .object({
      code: z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
      proficiency: z.enum(["basic", "conversational", "professional", "fluent", "native"]),
    })
    .parse({ code, proficiency });
  const { error } = await client.from("profile_languages").upsert(
    {
      profile_id: userId,
      language_code: parsed.code,
      proficiency: parsed.proficiency,
      verification: "self_reported",
    },
    { onConflict: "profile_id,language_code" },
  );
  if (error) throw error;
}

export async function removeProfileLanguage(client: Client, userId: string, code: string) {
  const { error } = await client
    .from("profile_languages")
    .delete()
    .eq("profile_id", userId)
    .eq("language_code", code);
  if (error) throw error;
}

export async function savePrivateDetails(client: Client, userId: string, timezone: string) {
  const parsed = z.string().trim().max(80).parse(timezone);
  const keyring = createIntakeEncryptionKeyringFromEnvironment(process.env);
  const encrypted = encryptIntakeValue(
    JSON.stringify({ timezone: parsed || null }),
    `profile:${userId}:private-details`,
    keyring,
  );
  const { error } = await client.from("private_profile_details").upsert(
    {
      user_id: userId,
      encryption_key_version: keyring.activeVersion,
      encrypted_payload: encrypted,
      consent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function createPortfolioItem(
  client: Client,
  userId: string,
  value: { title: string; roleSummary: string; externalUrl?: string },
) {
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(200),
      roleSummary: z.string().trim().min(1).max(2000),
      externalUrl: z
        .string()
        .url()
        .refine((url) => ["https:", "http:"].includes(new URL(url).protocol))
        .optional()
        .or(z.literal("")),
    })
    .parse(value);
  const { error } = await client.from("portfolio_items").insert({
    profile_id: userId,
    title: parsed.title,
    role_summary: parsed.roleSummary,
    external_url: parsed.externalUrl || null,
    publication_state: "private",
  });
  if (error) throw error;
}
export async function archivePortfolioItem(client: Client, userId: string, id: string) {
  const { error } = await client
    .from("portfolio_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", userId);
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
