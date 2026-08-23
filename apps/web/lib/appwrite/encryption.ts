import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FILE_MAGIC = Buffer.from("UMOJAF01", "ascii");

export class AppwriteEncryptionError extends Error {
  readonly code = "APPWRITE_ENCRYPTION_UNAVAILABLE";

  constructor() {
    super("Protected application data is unavailable.");
    this.name = "AppwriteEncryptionError";
  }
}

type KeySet = Readonly<Record<string, Uint8Array>>;

export type AppwriteEncryptionKeyring = Readonly<{
  activeVersion: string;
  dataKeys: KeySet;
  fileKeys: KeySet;
  lookupKeys: KeySet;
}>;

type KeyringInput = Readonly<{
  activeVersion: string;
  dataKeys: Readonly<Record<string, string | Uint8Array>>;
  fileKeys: Readonly<Record<string, string | Uint8Array>>;
  lookupKeys: Readonly<Record<string, string | Uint8Array>>;
}>;

function invalid(): never {
  throw new AppwriteEncryptionError();
}

function decodeKey(value: string | Uint8Array) {
  const decoded =
    typeof value === "string"
      ? Buffer.from(value, value.includes("+") || value.includes("/") ? "base64" : "base64url")
      : Buffer.from(value);
  if (decoded.byteLength !== 32) invalid();
  return new Uint8Array(decoded);
}

function decodeKeys(values: KeyringInput["dataKeys"]) {
  return Object.fromEntries(
    Object.entries(values).map(([version, value]) => [version, decodeKey(value)]),
  );
}

function sameKey(left: Uint8Array, right: Uint8Array) {
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function createAppwriteEncryptionKeyring(input: KeyringInput): AppwriteEncryptionKeyring {
  if (!/^v[1-9][0-9]*$/.test(input.activeVersion)) invalid();
  const keyring = {
    activeVersion: input.activeVersion,
    dataKeys: decodeKeys(input.dataKeys),
    fileKeys: decodeKeys(input.fileKeys),
    lookupKeys: decodeKeys(input.lookupKeys),
  } as const;
  const data = keyring.dataKeys[input.activeVersion];
  const file = keyring.fileKeys[input.activeVersion];
  const lookup = keyring.lookupKeys[input.activeVersion];
  if (
    !data ||
    !file ||
    !lookup ||
    sameKey(data, file) ||
    sameKey(data, lookup) ||
    sameKey(file, lookup)
  )
    invalid();
  return keyring;
}

export function createAppwriteEncryptionKeyringFromEnvironment(
  source: Readonly<Record<string, string | undefined>>,
) {
  const activeVersion = source.APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION;
  if (!activeVersion) invalid();
  const suffix = activeVersion.toUpperCase();
  const data = source[`APPWRITE_DATA_ENCRYPTION_KEY_${suffix}`];
  const file = source[`APPWRITE_FILE_ENCRYPTION_KEY_${suffix}`];
  const lookup = source[`APPWRITE_LOOKUP_HMAC_KEY_${suffix}`];
  if (!data || !file || !lookup) invalid();
  return createAppwriteEncryptionKeyring({
    activeVersion,
    dataKeys: { [activeVersion]: data },
    fileKeys: { [activeVersion]: file },
    lookupKeys: { [activeVersion]: lookup },
  });
}

function keyFor(keys: KeySet, version: string) {
  const key = keys[version];
  if (!key) invalid();
  return Buffer.from(key);
}

function aad(purpose: "data" | "file", version: string, context: string) {
  if (!context.trim()) invalid();
  return Buffer.from(`umoja:${purpose}:${version}:${context}`, "utf8");
}

export function encryptAppwriteValue(
  plaintext: string,
  context: string,
  keyring: AppwriteEncryptionKeyring,
) {
  const version = keyring.activeVersion;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyFor(keyring.dataKeys, version), iv);
  cipher.setAAD(aad("data", version, context));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    version,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptAppwriteValue(
  envelope: string,
  context: string,
  keyring: AppwriteEncryptionKeyring,
) {
  try {
    const [version, encodedIv, encodedTag, encodedCiphertext, extra] = envelope.split(".");
    if (!version || !encodedIv || !encodedTag || !encodedCiphertext || extra) invalid();
    const iv = Buffer.from(encodedIv, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    if (iv.byteLength !== IV_BYTES || tag.byteLength !== TAG_BYTES) invalid();
    const decipher = createDecipheriv(ALGORITHM, keyFor(keyring.dataKeys, version), iv);
    decipher.setAAD(aad("data", version, context));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    invalid();
  }
}

export function createAppwriteBlindIndex(
  normalizedValue: string,
  context: string,
  keyring: AppwriteEncryptionKeyring,
) {
  if (!context.trim()) invalid();
  const version = keyring.activeVersion;
  const digest = createHmac("sha256", keyFor(keyring.lookupKeys, version))
    .update(`umoja:lookup:${version}:${context}\0`, "utf8")
    .update(normalizedValue, "utf8")
    .digest("base64url");
  return `${version}.${digest}`;
}

export function encryptAppwriteFile(
  plaintext: Uint8Array,
  context: string,
  keyring: AppwriteEncryptionKeyring,
) {
  const version = keyring.activeVersion;
  const encodedVersion = Buffer.from(version, "utf8");
  if (encodedVersion.byteLength > 32) invalid();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyFor(keyring.fileKeys, version), iv);
  cipher.setAAD(aad("file", version, context));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return new Uint8Array(
    Buffer.concat([
      FILE_MAGIC,
      Buffer.from([encodedVersion.byteLength]),
      encodedVersion,
      iv,
      cipher.getAuthTag(),
      ciphertext,
    ]),
  );
}

export function decryptAppwriteFile(
  envelope: Uint8Array,
  context: string,
  keyring: AppwriteEncryptionKeyring,
) {
  try {
    const value = Buffer.from(envelope);
    if (!value.subarray(0, FILE_MAGIC.byteLength).equals(FILE_MAGIC)) invalid();
    const versionLength = value[FILE_MAGIC.byteLength];
    const versionStart = FILE_MAGIC.byteLength + 1;
    const ivStart = versionStart + versionLength;
    const tagStart = ivStart + IV_BYTES;
    const ciphertextStart = tagStart + TAG_BYTES;
    if (!versionLength || value.byteLength <= ciphertextStart) invalid();
    const version = value.subarray(versionStart, ivStart).toString("utf8");
    const decipher = createDecipheriv(
      ALGORITHM,
      keyFor(keyring.fileKeys, version),
      value.subarray(ivStart, tagStart),
    );
    decipher.setAAD(aad("file", version, context));
    decipher.setAuthTag(value.subarray(tagStart, ciphertextStart));
    return new Uint8Array(
      Buffer.concat([decipher.update(value.subarray(ciphertextStart)), decipher.final()]),
    );
  } catch {
    invalid();
  }
}
