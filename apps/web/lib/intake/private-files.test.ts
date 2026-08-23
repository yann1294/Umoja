import { describe, expect, it, vi } from "vitest";
import { createAppwriteEncryptionKeyring } from "@/lib/appwrite/encryption";
import { decryptAuthorizedIntakeFile, prepareEncryptedIntakeFile } from "./private-files";

const keyring = createAppwriteEncryptionKeyring({
  activeVersion: "v1",
  dataKeys: { v1: new Uint8Array(32).fill(21) },
  fileKeys: { v1: new Uint8Array(32).fill(22) },
  lookupKeys: { v1: new Uint8Array(32).fill(23) },
});

describe("private intake file boundary", () => {
  it("validates before encryption and decrypts only after authorization", async () => {
    const original = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);
    const prepared = prepareEncryptedIntakeFile(
      { name: "brief.pdf", mediaType: "application/pdf", bytes: original },
      "submission-one",
      "file-one",
      keyring,
    );
    expect(prepared.bytes).not.toEqual(original);
    expect(prepared.storageName).toBe("file-one.umojaenc");
    expect(prepared.metadata.encryptionKeyVersion).toBe("v1");
    const authorize = vi.fn(async () => true);
    await expect(
      decryptAuthorizedIntakeFile(prepared.bytes, "submission-one", "file-one", authorize, keyring),
    ).resolves.toEqual(original);
    expect(authorize).toHaveBeenCalledOnce();
  });

  it("denies access before attempting to decrypt private bytes", async () => {
    const authorize = vi.fn(async () => false);
    await expect(
      decryptAuthorizedIntakeFile(
        new Uint8Array([1, 2, 3]),
        "submission-one",
        "file-one",
        authorize,
        keyring,
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "INTAKE_ACCESS_DENIED" }));
  });
});
