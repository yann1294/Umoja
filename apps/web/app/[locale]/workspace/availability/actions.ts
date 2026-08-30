"use server";

import { revalidatePath } from "next/cache";
import { requireSupabaseWorkspaceUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveAvailability } from "@/lib/profile/service";

export async function saveAvailabilityAction(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseWorkspaceUser(locale);
  await saveAvailability(await createSupabaseServerClient(), user.id, {
    weeklyHours: Number(form.get("weeklyHours") ?? 0),
    nextAvailableOn: String(form.get("nextAvailableOn") ?? ""),
    workMode: String(form.get("workMode") ?? "remote") as
      "remote" | "hybrid" | "onsite" | "flexible",
  });
  revalidatePath(`/${locale}/workspace`);
  revalidatePath(`/${locale}/workspace/availability`);
}
