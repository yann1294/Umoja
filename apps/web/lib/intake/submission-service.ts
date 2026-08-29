import "server-only";

import { createHash } from "node:crypto";
import { ID } from "node-appwrite";
import {
  createAppwriteBlindIndex,
  createAppwriteEncryptionKeyringFromEnvironment,
} from "@/lib/appwrite/encryption";
import { createRuntimeServices } from "@/lib/appwrite/admin";
import { getAppwriteConfig } from "@/lib/appwrite/config";
import { AppwriteEncryptedIntakeRepository } from "./repository";
import { prepareIntakeSubmission } from "./secure-boundary";
import type { IntakeKind, ProjectIntake, TalentIntake } from "@umoja/validation";

const claims = new Map<string, { expires: number; submissionId?: string }>();
const attempts = new Map<string, { count: number; reset: number }>();
const POLICY_VERSION = "2026-08";

function prune() {
  const now = Date.now();
  for (const [key, value] of claims) if (value.expires <= now) claims.delete(key);
  for (const [key, value] of attempts) if (value.reset <= now) attempts.delete(key);
}

const rateLimiter = {
  async check(key: string) {
    prune();
    const now = Date.now();
    const value = attempts.get(key) ?? { count: 0, reset: now + 10 * 60 * 1000 };
    value.count += 1;
    attempts.set(key, value);
    return value.count <= 8
      ? { allowed: true }
      : { allowed: false, retryAfterSeconds: Math.ceil((value.reset - now) / 1000) };
  },
};

const idempotencyStore = {
  async claim(keyHash: string, expiresAt: Date) {
    prune();
    if (claims.has(keyHash)) return "duplicate" as const;
    claims.set(keyHash, { expires: expiresAt.getTime() });
    return "claimed" as const;
  },
  async complete(keyHash: string, submissionId: string) {
    const value = claims.get(keyHash);
    if (value) value.submissionId = submissionId;
  },
  async release(keyHash: string) {
    claims.delete(keyHash);
  },
};

function auditDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Public boundary: no plaintext is retained beyond this request. */
export async function persistPublicIntake(
  kind: Extract<IntakeKind, "project" | "talent">,
  input: unknown,
  remoteKey: string,
  locale: "en" | "fr",
) {
  const keyring = createAppwriteEncryptionKeyringFromEnvironment(process.env);
  const prepared = await prepareIntakeSubmission({
    kind,
    input,
    remoteKey,
    rateLimiter,
    idempotencyStore,
    createLookup: (value, context) => createAppwriteBlindIndex(value, context, keyring),
    policyVersion: POLICY_VERSION,
  });
  if (prepared.status !== "ready") return prepared;
  const services = createRuntimeServices();
  const repository = new AppwriteEncryptedIntakeRepository(services.tables, keyring, async () => false);
  try {
    if (kind === "project")
      await repository.createProject({ ...prepared, payload: prepared.payload as ProjectIntake }, locale);
    else
      await repository.createTalent({ ...prepared, payload: prepared.payload as TalentIntake }, locale);
    await services.tables.createRow({
      databaseId: getAppwriteConfig().databaseId,
      tableId: getAppwriteConfig().tables.auditLogs,
      rowId: ID.unique(),
      data: {
        actorId: "public-submission",
        action: `intake.${kind}.created`,
        targetType: `${kind}_intake`,
        targetId: prepared.submissionId,
        requestId: null,
        beforeDigest: null,
        afterDigest: auditDigest({ kind, submissionId: prepared.submissionId, keyHash: prepared.keyHash }),
        metadata: JSON.stringify({ policyVersion: prepared.policyVersion }),
        createdAt: prepared.claimedAt,
      },
    });
    await idempotencyStore.complete(prepared.keyHash, prepared.submissionId);
    return { status: "success" as const, reference: prepared.submissionId, persisted: true };
  } catch (error) {
    await idempotencyStore.release(prepared.keyHash);
    // The unique database index is the durable duplicate guard across processes/restarts.
    if (typeof error === "object" && error && "code" in error && (error as { code: number }).code === 409)
      return { status: "duplicate" as const, persisted: true };
    throw error;
  }
}
