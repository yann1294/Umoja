import { describe, expect, it } from "vitest";
import { createIntakeEncryptionKeyring, decryptIntakeFile, decryptIntakeValue } from "./encryption";
import { IntakeRepositoryAccessError } from "./repository";
import { prepareSupabaseApplicantFile } from "./supabase-private-files";

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
});
