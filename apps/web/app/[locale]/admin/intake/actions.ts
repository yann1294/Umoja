"use server";

import { revalidatePath } from "next/cache";
import type { PersistedIntakeKind } from "@/lib/intake/contracts";
import { updateSupabaseIntakeReview } from "@/lib/intake/supabase-review-service";
import { requireSupabaseIntakeReviewer } from "@/lib/supabase/intake-auth";

export async function updateReview(
  locale: "en" | "fr",
  kind: PersistedIntakeKind,
  id: string,
  form: FormData,
) {
  await requireSupabaseIntakeReviewer(locale);
  await updateSupabaseIntakeReview(kind, id, {
    status: String(form.get("status") ?? "new"),
    assignedReviewerId: String(form.get("assignedReviewerId") ?? ""),
    note: String(form.get("note") ?? ""),
  });
  revalidatePath(`/${locale}/admin/intake`);
  revalidatePath(`/${locale}/admin/intake/${kind}/${id}`);
}
