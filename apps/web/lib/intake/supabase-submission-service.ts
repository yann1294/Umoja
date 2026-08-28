import "server-only";

import type { IntakeKind, ProjectIntake, TalentIntake } from "@umoja/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createIntakeBlindIndex, createIntakeEncryptionKeyringFromEnvironment } from "./encryption";
import { prepareIntakeSubmission } from "./secure-boundary";
import type { IntakeIdempotencyStore, IntakeRateLimiter } from "./security";
import { SupabaseEncryptedIntakeRepository } from "./supabase-repository";

const POLICY_VERSION = "2026-08";

function durableGuards(client: ReturnType<typeof createSupabaseAdminClient>) {
  const rateLimiter: IntakeRateLimiter = {
    async check(key) {
      const { data, error } = await client.rpc("check_intake_rate_limit", {
        p_key_digest: key,
        p_limit: 8,
        p_window_seconds: 600,
      });
      if (error || !data?.[0]) throw new Error("intake_boundary_unavailable");
      return {
        allowed: data[0].allowed,
        retryAfterSeconds: data[0].retry_after_seconds || undefined,
      };
    },
  };
  const idempotencyStore: IntakeIdempotencyStore = {
    async claim(keyHash, expiresAt) {
      const { data, error } = await client.rpc("claim_intake_idempotency", {
        p_key_hash: keyHash,
        p_expires_at: expiresAt.toISOString(),
      });
      if (error) throw new Error("intake_boundary_unavailable");
      return data ? "claimed" : "duplicate";
    },
    async complete(keyHash, submissionId, publicReference) {
      const { error } = await client.rpc("complete_intake_idempotency", {
        p_key_hash: keyHash,
        p_submission_id: submissionId,
        p_public_reference: publicReference,
      });
      if (error) throw new Error("intake_boundary_unavailable");
    },
    async release(keyHash) {
      const { error } = await client.rpc("release_intake_idempotency", { p_key_hash: keyHash });
      if (error) throw new Error("intake_boundary_unavailable");
    },
  };
  return { idempotencyStore, rateLimiter };
}

/** Trusted anonymous intake boundary. It deliberately never assigns an applicant account. */
export async function persistSupabasePublicIntake(
  kind: Extract<IntakeKind, "project" | "talent">,
  input: unknown,
  remoteKey: string,
  locale: "en" | "fr",
  honeypot?: unknown,
) {
  const client = createSupabaseAdminClient();
  const keyring = createIntakeEncryptionKeyringFromEnvironment(process.env);
  const guards = durableGuards(client);
  const prepared = await prepareIntakeSubmission({
    kind,
    input,
    honeypot,
    remoteKey,
    ...guards,
    createLookup: (value, context) => createIntakeBlindIndex(value, context, keyring),
    policyVersion: POLICY_VERSION,
  });
  if (prepared.status !== "ready") return prepared;
  const repository = new SupabaseEncryptedIntakeRepository(client, keyring, null, true);
  try {
    const result =
      kind === "project"
        ? await repository.createProject(
            { ...prepared, payload: prepared.payload as ProjectIntake },
            locale,
          )
        : await repository.createTalent(
            { ...prepared, payload: prepared.payload as TalentIntake },
            locale,
          );
    if (result.status === "duplicate") {
      await guards.idempotencyStore.release(prepared.keyHash);
      return { status: "duplicate" as const, persisted: true };
    }
    await guards.idempotencyStore.complete(
      prepared.keyHash,
      prepared.submissionId,
      prepared.publicReference,
    );
    return { status: "success" as const, reference: prepared.publicReference, persisted: true };
  } catch {
    await guards.idempotencyStore.release(prepared.keyHash);
    throw new Error("intake_persistence_unavailable");
  }
}
