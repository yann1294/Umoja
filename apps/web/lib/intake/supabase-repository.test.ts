import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { ProjectIntake } from "@umoja/validation";
import type { Database } from "../../../../supabase/database.types";
import { createIntakeBlindIndex, createIntakeEncryptionKeyring } from "./encryption";
import { IntakeRepositoryAccessError } from "./errors";
import { SupabaseEncryptedIntakeRepository } from "./supabase-repository";

const keyring = createIntakeEncryptionKeyring({
  activeVersion: "v1",
  dataKeys: { v1: new Uint8Array(32).fill(51) },
  fileKeys: { v1: new Uint8Array(32).fill(52) },
  lookupKeys: { v1: new Uint8Array(32).fill(53) },
});
const project: ProjectIntake = {
  contact: { preferredName: "Private", email: "private@example.test", phone: "+254700000000" },
  organization: { name: "Private organization", country: "Kenya", website: "" },
  need: {
    title: "Private brief",
    description: "A private project description with enough detail to validate correctly.",
    serviceAreas: ["Engineering"],
  },
  budgetBand: "Private",
  timing: { desiredStart: "Soon", targetDate: "2027-01-01" },
  attachments: [],
  projectConsent: true,
};

describe("Supabase encrypted intake repository", () => {
  it("encrypts and blind-indexes before calling the service-only creation RPC", async () => {
    const rpc = vi.fn(async () => ({ data: { id: randomUUID() }, error: null }));
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const submissionId = randomUUID();
    const repository = new SupabaseEncryptedIntakeRepository(client, keyring, null, true);
    await expect(
      repository.createProject(
        {
          claimedAt: "2026-08-28T00:00:00.000Z",
          keyHash: createIntakeBlindIndex(
            project.contact.email,
            "intake:project:idempotency",
            keyring,
          ),
          payload: project,
          policyVersion: "2026-08",
          submissionId,
        },
        "en",
      ),
    ).resolves.toMatchObject({ status: "created" });
    const serialized = JSON.stringify(rpc.mock.calls[0]);
    expect(serialized).not.toContain(project.contact.email);
    expect(serialized).not.toContain(project.contact.preferredName);
    expect(serialized).not.toContain(project.organization.name);
    expect(serialized).toContain("create_encrypted_project_intake");
    expect(serialized).toContain("v1.");
  });

  it("fails before persistence when a non-privileged adapter attempts creation", async () => {
    const rpc = vi.fn();
    const repository = new SupabaseEncryptedIntakeRepository(
      { rpc } as unknown as SupabaseClient<Database>,
      keyring,
      null,
    );
    await expect(
      repository.createProject(
        {
          claimedAt: "2026-08-28T00:00:00.000Z",
          keyHash: "v1.synthetic",
          payload: project,
          policyVersion: "2026-08",
          submissionId: randomUUID(),
        },
        "en",
      ),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps the unique idempotency guard to a duplicate result", async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: null, error: { code: "23505" } })),
    } as unknown as SupabaseClient<Database>;
    const result = await new SupabaseEncryptedIntakeRepository(
      client,
      keyring,
      null,
      true,
    ).createProject(
      {
        claimedAt: "2026-08-28T00:00:00.000Z",
        keyHash: "v1.synthetic",
        payload: project,
        policyVersion: "2026-08",
        submissionId: randomUUID(),
      },
      "en",
    );
    expect(result).toEqual({ status: "duplicate" });
  });

  it("reserves accepted for a future governance boundary", async () => {
    const rpc = vi.fn();
    const repository = new SupabaseEncryptedIntakeRepository(
      { rpc } as unknown as SupabaseClient<Database>,
      keyring,
      {
        actorId: randomUUID(),
        email: "synthetic@example.test",
        emailVerified: true,
        membershipActive: true,
        mfaVerified: false,
        roles: ["admin"],
      },
    );
    await expect(
      repository.updateReview("project", randomUUID(), { status: "accepted" }),
    ).rejects.toBeInstanceOf(IntakeRepositoryAccessError);
    expect(rpc).not.toHaveBeenCalled();
  });
});
