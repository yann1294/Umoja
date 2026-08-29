import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TablesDB } from "node-appwrite";
import type { ProjectIntake, TalentIntake } from "@umoja/validation";
import { createAppwriteEncryptionKeyring } from "@/lib/appwrite/encryption";
import { AppwriteEncryptedIntakeRepository, IntakeRepositoryAccessError } from "./repository";

const key = (fill: number) => new Uint8Array(32).fill(fill);
const keyring = createAppwriteEncryptionKeyring({
  activeVersion: "v1",
  dataKeys: { v1: key(11) },
  fileKeys: { v1: key(12) },
  lookupKeys: { v1: key(13) },
});

const project: ProjectIntake = {
  contact: { preferredName: "Amina Private", email: "amina@example.test", phone: "+254700000000" },
  organization: {
    name: "Confidential Cooperative",
    country: "Kenya",
    website: "https://example.test/",
  },
  need: {
    title: "Private platform renewal",
    description: "A confidential project narrative with enough detail for schema validation.",
    serviceAreas: ["Product engineering"],
  },
  budgetBand: "Private budget",
  timing: { desiredStart: "Soon", targetDate: "2027-01-01" },
  attachments: [],
  projectConsent: true,
};

const talent: TalentIntake = {
  preferredName: "Kofi Private",
  privateContact: { email: "kofi@example.test", phone: "+233200000000" },
  country: "Ghana",
  timezone: "Africa/Accra",
  skillAreas: ["Engineering"],
  experienceBand: "Senior",
  portfolioItems: [{ title: "Private portfolio", url: "https://portfolio.example.test/" }],
  availability: { weeklyCapacity: "20 hours", nextAvailableDate: "2027-02-01", workMode: "Remote" },
  languages: ["English", "French"],
  publicProfileConsent: false,
  applicationConsent: true,
  dataProcessingConsent: true,
};

function tableDouble() {
  let row: Record<string, unknown> | undefined;
  let lastRequest: Record<string, unknown> | undefined;
  return {
    createRow: vi.fn(async (request: { rowId: string; data: Record<string, unknown> }) => {
      const { rowId, data } = request;
      lastRequest = request;
      row = { ...data, $id: rowId };
      return row;
    }),
    getRow: vi.fn(async () => row),
    row: () => row,
    request: () => lastRequest,
  };
}

describe("encrypted intake repository", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = "https://syd.cloud.appwrite.io/v1";
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = "test-project";
  });

  it("writes project applicant data only as ciphertext and decrypts after authorization", async () => {
    const tables = tableDouble();
    const authorize = vi.fn(async () => true);
    const repository = new AppwriteEncryptedIntakeRepository(
      tables as unknown as TablesDB,
      keyring,
      authorize,
    );
    await repository.createProject(
      {
        submissionId: "project-one",
        keyHash: "v1.idempotency",
        payload: project,
        policyVersion: "2026-08",
        claimedAt: "2026-08-23T00:00:00.000Z",
      },
      "en",
    );
    const stored = tables.row();
    const serialized = JSON.stringify(stored);
    for (const plaintext of [
      project.contact.preferredName,
      project.contact.email,
      project.contact.phone,
      project.organization.name,
      project.need.description,
      project.budgetBand,
    ])
      expect(serialized).not.toContain(plaintext);
    expect(String(stored?.encryptedPayload)).toMatch(/^v1\./);
    expect(String(stored?.emailLookup)).toMatch(/^v1\./);
    await expect(repository.getProject("project-one")).resolves.toEqual(project);
    expect(authorize).toHaveBeenCalledOnce();
  });

  it("writes talent identity, contact, portfolio, location and availability as ciphertext", async () => {
    const tables = tableDouble();
    const repository = new AppwriteEncryptedIntakeRepository(
      tables as unknown as TablesDB,
      keyring,
      async () => true,
    );
    await repository.createTalent(
      {
        submissionId: "talent-one",
        keyHash: "v1.idempotency",
        payload: talent,
        policyVersion: "2026-08",
        claimedAt: "2026-08-23T00:00:00.000Z",
      },
      "fr",
    );
    const serialized = JSON.stringify(tables.row());
    for (const plaintext of [
      talent.preferredName,
      talent.privateContact.email,
      talent.country,
      talent.portfolioItems[0]!.url,
      talent.availability.weeklyCapacity,
    ])
      expect(serialized).not.toContain(plaintext);
    await expect(repository.getTalent("talent-one")).resolves.toEqual(talent);
  });

  it("adds per-record owner permissions without granting workspace membership", async () => {
    const tables = tableDouble();
    const repository = new AppwriteEncryptedIntakeRepository(
      tables as unknown as TablesDB,
      keyring,
      async () => true,
    );
    await repository.createProject(
      {
        submissionId: "owned-project",
        keyHash: "v1.idempotency",
        payload: project,
        policyVersion: "2026-08",
        claimedAt: "2026-08-23T00:00:00.000Z",
        ownerUserId: "applicant-one",
      },
      "en",
    );
    const permissions = tables.request()?.permissions as string[];
    expect(permissions.some((permission) => permission.includes("user:applicant-one"))).toBe(true);
    expect(permissions.some((permission) => permission.includes('"any"'))).toBe(false);
  });

  it("does not attempt decryption until the read is authorized", async () => {
    const tables = tableDouble();
    tables.getRow.mockResolvedValue({
      $id: "project-denied",
      submissionId: "project-denied",
      status: "new",
      encryptedPayload: "deliberately-corrupt",
    });
    const authorize = vi.fn(async () => false);
    const repository = new AppwriteEncryptedIntakeRepository(
      tables as unknown as TablesDB,
      keyring,
      authorize,
    );
    await expect(repository.getProject("project-denied")).rejects.toEqual(
      expect.objectContaining({ code: "INTAKE_ACCESS_DENIED" }),
    );
    expect(authorize).toHaveBeenCalledOnce();
  });

  it("returns generic errors without applicant plaintext or key material", () => {
    const error = new IntakeRepositoryAccessError();
    expect(error.message).not.toContain(project.contact.email);
    expect(error.message).not.toContain(Buffer.from(key(11)).toString("base64url"));
  });
});
