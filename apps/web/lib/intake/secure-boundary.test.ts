import { describe, expect, it, vi } from "vitest";
import { prepareIntakeSubmission } from "./secure-boundary";

const project = {
  contact: { preferredName: "Synthetic", email: " TEST@EXAMPLE.TEST ", phone: "+254 700 000 000" },
  organization: {
    name: "Synthetic org",
    country: "Kenya",
    website: "https://example.test/#private",
  },
  need: {
    title: "Synthetic brief",
    description: "A synthetic project description long enough for boundary validation.",
    serviceAreas: ["Engineering"],
  },
  budgetBand: "Synthetic",
  timing: { desiredStart: "Soon", targetDate: "2027-01-01" },
  attachments: [],
  projectConsent: true,
};

const allowed = { check: vi.fn(async () => ({ allowed: true })) };
const claimed = {
  claim: vi.fn(async () => "claimed" as const),
  complete: vi.fn(async () => undefined),
  release: vi.fn(async () => undefined),
};

describe("provider-neutral intake submission boundary", () => {
  it("normalizes validated input and creates a non-secret project reference", async () => {
    const result = await prepareIntakeSubmission({
      kind: "project",
      input: project,
      remoteKey: "synthetic-network-key",
      rateLimiter: allowed,
      idempotencyStore: claimed,
      createLookup: () => "v1.synthetic",
      policyVersion: "2026-08",
    });
    expect(result).toMatchObject({
      status: "ready",
      publicReference: expect.stringMatching(/^UP-[A-Z0-9]{12}$/),
    });
    if (result.status === "ready") {
      expect(result.payload.contact.email).toBe("test@example.test");
      expect(result.payload.contact.phone).toBe("+254700000000");
      expect(result.payload.organization.website).toBe("https://example.test/");
    }
  });

  it("fails closed for honeypot, throttled, invalid and duplicate requests", async () => {
    const base = {
      kind: "project" as const,
      input: project,
      remoteKey: "synthetic-network-key",
      rateLimiter: allowed,
      idempotencyStore: claimed,
      createLookup: () => "v1.synthetic",
      policyVersion: "2026-08",
    };
    await expect(prepareIntakeSubmission({ ...base, honeypot: "filled" })).resolves.toEqual({
      status: "rejected",
    });
    await expect(
      prepareIntakeSubmission({
        ...base,
        rateLimiter: { check: async () => ({ allowed: false, retryAfterSeconds: 30 }) },
      }),
    ).resolves.toEqual({ status: "rate_limited", retryAfterSeconds: 30 });
    const invalid = await prepareIntakeSubmission({ ...base, input: {} });
    expect(invalid).toMatchObject({ status: "validation_error" });
    await expect(
      prepareIntakeSubmission({
        ...base,
        idempotencyStore: { ...claimed, claim: async () => "duplicate" },
      }),
    ).resolves.toEqual({ status: "duplicate" });
  });
});
