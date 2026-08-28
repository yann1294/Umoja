import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../../../../supabase/database.types";
import { createIntakeEncryptionKeyring, decryptIntakeFile, decryptIntakeValue } from "./encryption";
import { IntakeRepositoryAccessError } from "./errors";
import {
  intakeFileCanBeDelivered,
  prepareSupabaseApplicantFile,
  SupabaseApplicantPrivateStorage,
} from "./supabase-private-files";

const keyring = createIntakeEncryptionKeyring({
  activeVersion: "v1",
  dataKeys: { v1: new Uint8Array(32).fill(41) },
  fileKeys: { v1: new Uint8Array(32).fill(42) },
  lookupKeys: { v1: new Uint8Array(32).fill(43) },
});

describe("Supabase applicant-private file preparation", () => {
  it("uses neutral paths and independently authenticated data/file envelopes", () => {
    const original = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);
    const prepared = prepareSupabaseApplicantFile(
      { bytes: original, mediaType: "application/pdf", name: "private-name.pdf" },
      "submission-one",
      keyring,
    );
    expect(prepared.objectPath).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.umojaenc$/);
    expect(prepared.objectPath).not.toContain("private-name");
    expect(prepared.bytes).not.toEqual(original);
    const context = `intake:file:submission-one:${prepared.fileId}`;
    expect(decryptIntakeFile(prepared.bytes, context, keyring)).toEqual(original);
    expect(
      JSON.parse(decryptIntakeValue(prepared.encryptedMetadata, `${context}:metadata`, keyring)),
    ).toEqual({ originalName: "private-name.pdf" });
    expect(() => decryptIntakeFile(prepared.bytes, `${context}:wrong`, keyring)).toThrow();
  });

  it("rejects MIME/signature disagreement and files above the ten-megabyte pilot limit", () => {
    expect(() =>
      prepareSupabaseApplicantFile(
        {
          bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          mediaType: "image/png",
          name: "mismatch.pdf",
        },
        "submission-one",
        keyring,
      ),
    ).toThrow(IntakeRepositoryAccessError);
    const oversized = new Uint8Array(10_000_001);
    oversized.set([0x25, 0x50, 0x44, 0x46]);
    expect(() =>
      prepareSupabaseApplicantFile(
        { bytes: oversized, mediaType: "application/pdf", name: "oversized.pdf" },
        "submission-one",
        keyring,
      ),
    ).toThrow(IntakeRepositoryAccessError);
  });

  it("keeps unscanned and rejected uploads unavailable", () => {
    expect(intakeFileCanBeDelivered("quarantined")).toBe(false);
    expect(intakeFileCanBeDelivered("rejected")).toBe(false);
    expect(intakeFileCanBeDelivered("clean")).toBe(true);
  });

  it("removes ciphertext when metadata registration fails", async () => {
    const remove = vi.fn(async () => ({ data: null, error: null }));
    const upload = vi.fn(async () => ({ data: { path: "synthetic" }, error: null }));
    const client = {
      rpc: vi.fn(async () => ({ data: null, error: { code: "synthetic" } })),
      storage: { from: () => ({ remove, upload }) },
    } as unknown as SupabaseClient<Database>;
    const storage = new SupabaseApplicantPrivateStorage(client, keyring, async () => true);
    await expect(
      storage.upload(
        "project",
        { applicantId: null, id: crypto.randomUUID(), submissionId: crypto.randomUUID() },
        {
          bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 1]),
          mediaType: "application/pdf",
          name: "synthetic.pdf",
        },
      ),
    ).rejects.toMatchObject({ code: "synthetic" });
    expect(upload).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });
});
