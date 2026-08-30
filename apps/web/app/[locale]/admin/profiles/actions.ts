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
  const expected = state === "revoked" ? "approved" : "submitted";
  const { data, error } = await client.rpc("moderate_profile", {
    profile_user_id: profileId,
    decision: state as "approved" | "changes_requested" | "revoked",
    expected_state: expected,
    feedback,
  });
  if (error) throw error;
  if (!data) throw new Error("Profile review is stale or unavailable");
  revalidatePath(`/${locale}/admin/profiles`);
  revalidatePath(`/${locale}/talent`);
  const slug = data?.public_slug;
  if (slug) revalidatePath(`/${locale}/talent/${slug}`);
  void admin;
}
