import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { ServerPrincipal } from "@/lib/auth/principal";
import type { Database } from "../../../../supabase/database.types";
import { IntakeRepositoryAccessError } from "./errors";
import {
  createIntakeClaimToken,
  intakeClaimTokenMatches,
  parseIntakeClaimToken,
  SupabaseIntakeClaimBoundary,
} from "./supabase-claims";

const admin: ServerPrincipal = {
  actorId: randomUUID(),
  email: "synthetic@example.test",
  emailVerified: true,
  membershipActive: true,
  mfaVerified: false,
  roles: ["admin"],
};

describe("Supabase intake claim boundary", () => {
  it("creates opaque high-entropy tokens and performs constant-time digest verification", () => {
    const first = createIntakeClaimToken();
    const second = createIntakeClaimToken();
    expect(first.token).toMatch(/^v1\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/);
    expect(first.token).not.toBe(second.token);
    const parsed = parseIntakeClaimToken(first.token);
    expect(parsed.claimId).toBe(first.claimId);
    expect(parsed.tokenDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(intakeClaimTokenMatches(first.token, parsed.tokenDigest)).toBe(true);
    expect(intakeClaimTokenMatches(`${first.token}x`, parsed.tokenDigest)).toBe(false);
  });

  it("sends only token digests to the server-only RPC", async () => {
    const rpc = vi.fn(async () => ({ data: {}, error: null }));
    const boundary = new SupabaseIntakeClaimBoundary(
      { rpc } as unknown as SupabaseClient<Database>,
      admin,
    );
    const capability = await boundary.issue("project", randomUUID(), randomUUID());
    const serialized = JSON.stringify(rpc.mock.calls[0]);
    expect(serialized).toContain("issue_intake_claim");
    expect(serialized).not.toContain(capability.token);
    expect(serialized).toMatch(/[a-f0-9]{64}/);
  });

  it("fails closed before RPC for malformed tokens and disabled actors", async () => {
    const rpc = vi.fn();
    const boundary = new SupabaseIntakeClaimBoundary(
      { rpc } as unknown as SupabaseClient<Database>,
      admin,
    );
    await expect(
      boundary.consume("invalid", "project", randomUUID(), {
        id: randomUUID(),
        emailVerified: true,
        disabled: false,
      }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    const capability = createIntakeClaimToken();
    await expect(
      boundary.consume(capability.token, "project", randomUUID(), {
        id: randomUUID(),
        emailVerified: true,
        disabled: true,
      }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    expect(rpc).not.toHaveBeenCalled();
  });
});
