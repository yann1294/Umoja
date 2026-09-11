"use server";
import { revalidatePath } from "next/cache";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function moderateProfile(locale: "en" | "fr", form: FormData) {
  const admin = await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const state = String(form.get("state"));
  const feedback = String(form.get("feedback") ?? "");
  if (!["approved", "changes_requested", "revoked"].includes(state))
    throw new Error("Invalid moderation state");
  const client = await createSupabaseServerClient();
  const profileId = String(form.get("userId"));
  const expectedUpdatedAt = String(form.get("expectedUpdatedAt") ?? "") || undefined;
  const expected = state === "revoked" ? "approved" : "submitted";
  const { data, error } = await client.rpc("moderate_profile", {
    profile_user_id: profileId,
    decision: state as "approved" | "changes_requested" | "revoked",
    expected_state: expected,
    feedback,
    expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw error;
  if (!data) throw new Error("Profile review is stale or unavailable");
  revalidatePath(`/${locale}/admin/profiles`);
  revalidatePath(`/${locale}/talent`);
  const slug = data?.public_slug;
  if (slug) revalidatePath(`/${locale}/talent/${slug}`);
  void admin;
}

export async function moderatePortfolio(locale: "en" | "fr", form: FormData) {
  await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const state = String(form.get("state"));
  if (!["approved", "changes_requested", "revoked"].includes(state))
    throw new Error("Invalid portfolio moderation state");
  const profileId = String(form.get("profileId"));
  const itemId = String(form.get("itemId"));
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("portfolio_items")
    .update({ publication_state: state as "approved" | "changes_requested" | "revoked" })
    .eq("id", itemId)
    .eq("profile_id", profileId)
    .is("archived_at", null)
    .not("public_consent_at", "is", null)
    .select("profile_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Portfolio review is stale or unavailable");
  revalidatePath(`/${locale}/admin/profiles`);
  for (const publicLocale of ["en", "fr"] as const) {
    revalidatePath(`/${publicLocale}/talent`);
    revalidatePath(`/${publicLocale}/talent/[profile]`, "page");
  }
}
