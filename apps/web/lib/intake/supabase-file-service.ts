import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseWorkspaceUser } from "@/lib/supabase/auth";
import { createIntakeEncryptionKeyringFromEnvironment } from "./encryption";
import type { PersistedIntakeKind } from "./contracts";
import { SupabaseApplicantPrivateStorage } from "./supabase-private-files";

async function assignedReviewer(kind: PersistedIntakeKind, intakeId: string, actorId: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from(kind === "project" ? "project_intakes" : "talent_intakes")
    .select("assigned_reviewer_id")
    .eq("id", intakeId)
    .is("archived_at", null)
    .maybeSingle();
  return !error && data?.assigned_reviewer_id === actorId;
}

export function createAuthorizedIntakeStorage(user: SupabaseWorkspaceUser) {
  const client = createSupabaseAdminClient();
  return new SupabaseApplicantPrivateStorage(
    client,
    createIntakeEncryptionKeyringFromEnvironment(process.env),
    async ({ kind, intakeId }) =>
      user.roles.includes("admin") ||
      (user.roles.includes("reviewer") && assignedReviewer(kind, intakeId, user.id)),
  );
}
