import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServerPrincipal } from "@/lib/supabase/auth";
import { createIntakeEncryptionKeyringFromEnvironment } from "./encryption";
import type { IntakeReviewStatus, PersistedIntakeKind } from "./contracts";
import { IntakeRepositoryAccessError } from "./repository";
import { SupabaseEncryptedIntakeRepository } from "./supabase-repository";

const reviewStatuses = new Set<IntakeReviewStatus>([
  "new",
  "triage",
  "in_review",
  "contacted",
  "closed",
  "duplicate",
]);

async function repository() {
  const [client, principal] = await Promise.all([
    createSupabaseServerClient(),
    getSupabaseServerPrincipal(),
  ]);
  if (
    !principal?.membershipActive ||
    (!principal.roles.includes("reviewer") && !principal.roles.includes("admin"))
  )
    throw new IntakeRepositoryAccessError();
  return new SupabaseEncryptedIntakeRepository(
    client,
    createIntakeEncryptionKeyringFromEnvironment(process.env),
    principal,
  );
}

export async function listSupabaseIntakeSummaries(status?: string) {
  const safeStatus =
    status && reviewStatuses.has(status as IntakeReviewStatus)
      ? (status as IntakeReviewStatus)
      : undefined;
  const source = await repository();
  const values = await Promise.all([
    source.list("project", safeStatus),
    source.list("talent", safeStatus),
  ]);
  return values.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getSupabaseIntakeForReview(kind: PersistedIntakeKind, id: string) {
  return (await repository()).getForReview(kind, id);
}

export async function updateSupabaseIntakeReview(
  kind: PersistedIntakeKind,
  id: string,
  input: Readonly<{ status: string; assignedReviewerId?: string; note?: string }>,
) {
  if (!reviewStatuses.has(input.status as IntakeReviewStatus))
    throw new IntakeRepositoryAccessError();
  return (await repository()).updateReview(kind, id, {
    status: input.status as IntakeReviewStatus,
    assignedReviewerId: input.assignedReviewerId || undefined,
    note: input.note,
  });
}
