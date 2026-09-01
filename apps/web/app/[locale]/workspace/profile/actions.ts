"use server";

import { revalidatePath } from "next/cache";
import { requireSupabaseApplicant } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveProfileWithPrivateDetails } from "@/lib/profile/service";

export async function saveProfileAction(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseApplicant(locale);
  const client = await createSupabaseServerClient();
  const { data: before } = await client
    .from("profiles")
    .select("public_slug")
    .eq("user_id", user.id)
    .maybeSingle();
  const nextSlug = String(form.get("publicSlug") ?? "")
    .trim()
    .toLowerCase();
  await saveProfileWithPrivateDetails(
    client,
    user.id,
    {
      professionalName: String(form.get("professionalName") ?? ""),
      locale,
      countryCode: String(form.get("countryCode") ?? ""),
      publicBio: String(form.get("publicBio") ?? ""),
      publicSlug: String(form.get("publicSlug") ?? ""),
      visibility: form.get("visibility") === "public" ? "public" : "private",
      requestReview: form.get("requestReview") === "on",
      expectedUpdatedAt: String(form.get("expectedUpdatedAt") ?? "") || undefined,
    },
    String(form.get("timezone") ?? ""),
  );
  revalidatePath(`/${locale}/workspace`);
  revalidatePath(`/${locale}/workspace/profile`);
  for (const publicLocale of ["en", "fr"] as const) {
    revalidatePath(`/${publicLocale}/talent`);
    revalidatePath(`/${publicLocale}/talent/[profile]`, "page");
    for (const slug of [before?.public_slug, nextSlug].filter(Boolean)) {
      revalidatePath(`/${publicLocale}/talent/${slug}`);
    }
  }
}
