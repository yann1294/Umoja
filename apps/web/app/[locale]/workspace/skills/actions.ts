"use server";
import { revalidatePath } from "next/cache";
import { requireSupabaseApplicant } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addProfileLanguage,
  addProfileSkill,
  removeProfileLanguage,
  removeProfileSkill,
} from "@/lib/profile/service";
export async function addSkill(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseApplicant(locale);
  await addProfileSkill(
    await createSupabaseServerClient(),
    user.id,
    String(form.get("skillId")),
    Number(form.get("level")),
  );
  revalidatePath(`/${locale}/workspace/skills`);
}
export async function removeSkill(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseApplicant(locale);
  await removeProfileSkill(
    await createSupabaseServerClient(),
    user.id,
    String(form.get("skillId")),
  );
  revalidatePath(`/${locale}/workspace/skills`);
}
export async function addLanguage(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseApplicant(locale);
  await addProfileLanguage(
    await createSupabaseServerClient(),
    user.id,
    String(form.get("code")),
    String(form.get("proficiency")),
  );
  revalidatePath(`/${locale}/workspace/skills`);
}
export async function removeLanguage(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseApplicant(locale);
  await removeProfileLanguage(
    await createSupabaseServerClient(),
    user.id,
    String(form.get("code")),
  );
  revalidatePath(`/${locale}/workspace/skills`);
}
