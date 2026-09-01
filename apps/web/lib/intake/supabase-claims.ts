import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServerPrincipal } from "@/lib/auth/principal";
import type { Database } from "../../../../supabase/database.types";
import type { PersistedIntakeKind } from "./contracts";
import { IntakeRepositoryAccessError } from "./errors";

type Client = SupabaseClient<Database>;

export type IntakeClaimCapability = Readonly<{
  claimId: string;
  token: string;
  expiresAt: string;
}>;

const tokenPattern = /^v1\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function auditDigest(value: unknown) {
  return sha256(JSON.stringify(value));
}

export function createIntakeClaimToken(): IntakeClaimCapability {
  const claimId = randomUUID();
  const token = `v1.${claimId}.${randomBytes(32).toString("base64url")}`;
  return { claimId, token, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() };
}

export function parseIntakeClaimToken(token: string) {
  const match = tokenPattern.exec(token);
  if (!match) throw new IntakeRepositoryAccessError();
  return { claimId: match[1], tokenDigest: sha256(token) };
}

export function intakeClaimTokenMatches(token: string, expectedDigest: string) {
  try {
    const actual = Buffer.from(sha256(token), "hex");
    const expected = Buffer.from(expectedDigest, "hex");
    return actual.byteLength === expected.byteLength && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Dormant trusted-server capability boundary. No rendered application route constructs this
 * service while the verification/invitation/recovery lifecycle remains deferred.
 */
export class SupabaseIntakeClaimBoundary {
  constructor(
    private readonly client: Client,
    private readonly issuer: ServerPrincipal,
  ) {}

  async issue(
    kind: PersistedIntakeKind,
    intakeId: string,
    intendedUserId: string,
    expiresAt = new Date(Date.now() + 30 * 60 * 1000),
  ) {
    if (
      !this.issuer.membershipActive ||
      !this.issuer.emailVerified ||
      !this.issuer.roles.includes("admin") ||
      expiresAt.getTime() <= Date.now()
    )
      throw new IntakeRepositoryAccessError();
    const capability = createIntakeClaimToken();
    const { error } = await this.client.rpc("issue_intake_claim", {
      p_after_digest: auditDigest({
        action: "issued",
        claimId: capability.claimId,
        intakeId,
        intendedUserId,
        kind,
      }),
      p_claim_id: capability.claimId,
      p_created_by: this.issuer.actorId,
      p_expires_at: expiresAt.toISOString(),
      p_intake_id: intakeId,
      p_intended_user_id: intendedUserId,
      p_kind: kind,
      p_token_digest: sha256(capability.token),
    });
    if (error) throw new IntakeRepositoryAccessError();
    return { ...capability, expiresAt: expiresAt.toISOString() };
  }

  async consume(
    token: string,
    kind: PersistedIntakeKind,
    intakeId: string,
    actor: Readonly<{ id: string; emailVerified: boolean; disabled: boolean }>,
  ) {
    if (!actor.emailVerified || actor.disabled) throw new IntakeRepositoryAccessError();
    const parsed = parseIntakeClaimToken(token);
    const { error } = await this.client.rpc("consume_intake_claim", {
      p_actor_id: actor.id,
      p_after_digest: auditDigest({
        action: "consumed",
        actorId: actor.id,
        claimId: parsed.claimId,
        intakeId,
        kind,
      }),
      p_claim_id: parsed.claimId,
      p_intake_id: intakeId,
      p_kind: kind,
      p_token_digest: parsed.tokenDigest,
    });
    if (error) throw new IntakeRepositoryAccessError();
  }

  async revoke(claimId: string) {
    if (!this.issuer.membershipActive || !this.issuer.roles.includes("admin"))
      throw new IntakeRepositoryAccessError();
    const { error } = await this.client.rpc("revoke_intake_claim", {
      p_actor_id: this.issuer.actorId,
      p_after_digest: auditDigest({ action: "revoked", claimId }),
      p_claim_id: claimId,
    });
    if (error) throw new IntakeRepositoryAccessError();
  }
}
