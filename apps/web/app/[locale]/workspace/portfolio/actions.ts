"use server";
import { revalidatePath } from "next/cache";
import { requireSupabaseApplicant } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { archivePortfolioItem, createPortfolioItem } from "@/lib/profile/service";
export async function addPortfolio(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseApplicant(locale);
  await createPortfolioItem(await createSupabaseServerClient(), user.id, {
    title: String(form.get("title")),
    roleSummary: String(form.get("roleSummary")),
    externalUrl: String(form.get("externalUrl") ?? ""),
  });
  revalidatePath(`/${locale}/workspace/portfolio`);
}
export async function archivePortfolio(locale: "en" | "fr", form: FormData) {
  const user = await requireSupabaseApplicant(locale);
  await archivePortfolioItem(await createSupabaseServerClient(), user.id, String(form.get("id")));
  revalidatePath(`/${locale}/workspace/portfolio`);
}
