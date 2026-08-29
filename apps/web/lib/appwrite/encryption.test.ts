import { describe, expect, it } from "vitest";
import {
  AppwriteEncryptionError,
  createAppwriteBlindIndex,
  createAppwriteEncryptionKeyring,
  decryptAppwriteFile,
  decryptAppwriteValue,
  encryptAppwriteFile,
  encryptAppwriteValue,
} from "./encryption";

const bytes = (fill: number) => new Uint8Array(32).fill(fill);
const keyring = createAppwriteEncryptionKeyring({
  activeVersion: "v1",
  dataKeys: { v1: bytes(1) },
  fileKeys: { v1: bytes(2) },
  lookupKeys: { v1: bytes(3) },
});

describe("application encryption", () => {
  it("round-trips with random IVs and authenticated context", () => {
    const first = encryptAppwriteValue("private@example.test", "project:one", keyring);
    const second = encryptAppwriteValue("private@example.test", "project:one", keyring);
    expect(first).not.toBe(second);
    expect(decryptAppwriteValue(first, "project:one", keyring)).toBe("private@example.test");
    expect(() => decryptAppwriteValue(first, "project:two", keyring)).toThrow(
      AppwriteEncryptionError,
    );
  });

  it("fails closed for modified envelopes, tags, and wrong keys", () => {
    const envelope = encryptAppwriteValue("sensitive narrative", "project:one", keyring);
    const parts = envelope.split(".");
    const modifiedTag = Buffer.from(parts[2]!, "base64url");
    modifiedTag[0] ^= 1;
    parts[2] = modifiedTag.toString("base64url");
    expect(() => decryptAppwriteValue(parts.join("."), "project:one", keyring)).toThrow(
      AppwriteEncryptionError,
    );
    const wrong = createAppwriteEncryptionKeyring({
      activeVersion: "v1",
      dataKeys: { v1: bytes(4) },
      fileKeys: { v1: bytes(5) },
      lookupKeys: { v1: bytes(6) },
    });
    expect(() => decryptAppwriteValue(envelope, "project:one", wrong)).toThrow(
      AppwriteEncryptionError,
    );
  });

  it("uses the envelope key version for rotation", () => {
    const rotating = createAppwriteEncryptionKeyring({
      activeVersion: "v2",
      dataKeys: { v1: bytes(1), v2: bytes(7) },
      fileKeys: { v1: bytes(2), v2: bytes(8) },
      lookupKeys: { v1: bytes(3), v2: bytes(9) },
    });
    const oldEnvelope = encryptAppwriteValue("old", "rotation", keyring);
    expect(decryptAppwriteValue(oldEnvelope, "rotation", rotating)).toBe("old");
    expect(encryptAppwriteValue("new", "rotation", rotating).startsWith("v2.")).toBe(true);
  });

  it("creates deterministic, key-specific HMAC blind indexes", () => {
    const first = createAppwriteBlindIndex("private@example.test", "email", keyring);
    expect(createAppwriteBlindIndex("private@example.test", "email", keyring)).toBe(first);
    const changed = createAppwriteEncryptionKeyring({
      activeVersion: "v1",
      dataKeys: { v1: bytes(1) },
      fileKeys: { v1: bytes(2) },
      lookupKeys: { v1: bytes(4) },
    });
    expect(createAppwriteBlindIndex("private@example.test", "email", changed)).not.toBe(first);
  });

  it("rejects reused or incorrectly sized keys", () => {
    expect(() =>
      createAppwriteEncryptionKeyring({
        activeVersion: "v1",
        dataKeys: { v1: bytes(1) },
        fileKeys: { v1: bytes(1) },
        lookupKeys: { v1: bytes(3) },
      }),
    ).toThrow(AppwriteEncryptionError);
    expect(() =>
      createAppwriteEncryptionKeyring({
        activeVersion: "v1",
        dataKeys: { v1: new Uint8Array(31) },
        fileKeys: { v1: bytes(2) },
        lookupKeys: { v1: bytes(3) },
      }),
    ).toThrow(AppwriteEncryptionError);
  });

  it("round-trips authenticated private file bytes", () => {
    const plaintext = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);
    const encrypted = encryptAppwriteFile(plaintext, "submission:file", keyring);
    expect(encrypted).not.toEqual(plaintext);
    expect(decryptAppwriteFile(encrypted, "submission:file", keyring)).toEqual(plaintext);
    encrypted[encrypted.length - 1] ^= 1;
    expect(() => decryptAppwriteFile(encrypted, "submission:file", keyring)).toThrow(
      AppwriteEncryptionError,
    );
  });
});
