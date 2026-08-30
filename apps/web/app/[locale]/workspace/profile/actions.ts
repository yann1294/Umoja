"use server";

import { revalidatePath } from "next/cache";
import { requireSupabaseWorkspaceUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveProfile } from "@/lib/profile/service";

export async function saveProfileAction(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseWorkspaceUser(locale);
  await saveProfile(await createSupabaseServerClient(), user.id, {
    professionalName: String(form.get("professionalName") ?? ""),
    locale,
    countryCode: String(form.get("countryCode") ?? ""),
    publicBio: String(form.get("publicBio") ?? ""),
    publicSlug: String(form.get("publicSlug") ?? ""),
    visibility: form.get("visibility") === "public" ? "public" : "private",
    requestReview: form.get("requestReview") === "on",
  });
  revalidatePath(`/${locale}/workspace`);
  revalidatePath(`/${locale}/workspace/profile`);
}
