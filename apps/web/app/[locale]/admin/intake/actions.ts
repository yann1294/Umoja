"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceCapability } from "@/lib/appwrite/auth";
import { createSessionServices } from "@/lib/appwrite/session";
import { updateIntakeReview, type IntakeReviewKind } from "@/lib/intake/review-service";

export async function updateReview(locale: "en" | "fr", kind: IntakeReviewKind, id: string, form: FormData) {
  const user = await requireWorkspaceCapability("intake.review", locale);
  const services = await createSessionServices();
  if (!services) throw new Error("Session unavailable");
  await updateIntakeReview(services.tables, kind, id, {
    status: String(form.get("status") ?? "new"),
    assignedReviewerId: String(form.get("assignedReviewerId") ?? ""),
    note: String(form.get("note") ?? ""), actorId: user.id,
  });
  revalidatePath(`/${locale}/admin/intake`);
  revalidatePath(`/${locale}/admin/intake/${kind}/${id}`);
}
