"use server";
import { revalidatePath } from "next/cache";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function moderateProfile(locale: "en" | "fr", form: FormData) {
  const admin = await requireSupabaseWorkspaceCapability("admin.operations", locale);
  const state = String(form.get("state"));
  if (!["approved", "changes_requested", "revoked"].includes(state))
    throw new Error("Invalid moderation state");
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("profiles")
    .update({ publication_state: state as "approved" | "changes_requested" | "revoked" })
    .eq("user_id", String(form.get("userId")))
    .eq("publication_state", "submitted")
    .select("user_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Profile review is stale or unavailable");
  revalidatePath(`/${locale}/admin/profiles`);
  revalidatePath(`/${locale}/talent`);
  revalidatePath(`/${locale}/talent/${String(form.get("slug") ?? "")}`);
  void admin;
}
