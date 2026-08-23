import "server-only";

import { validateIntakeFile } from "@umoja/appwrite/intake-security";
import {
  decryptAppwriteFile,
  encryptAppwriteFile,
  type AppwriteEncryptionKeyring,
} from "@/lib/appwrite/encryption";
import { IntakeRepositoryAccessError } from "./repository";

export type EncryptedIntakeFileMetadata = Readonly<{
  encryptionKeyVersion: string;
  originalName: string;
  originalSize: number;
  mediaType: string;
}>;

export function prepareEncryptedIntakeFile(
  input: Readonly<{ name: string; mediaType: string; bytes: Uint8Array }>,
  submissionId: string,
  fileId: string,
  keyring: AppwriteEncryptionKeyring,
) {
  const validation = validateIntakeFile({
    name: input.name,
    size: input.bytes.byteLength,
    bytes: input.bytes,
  });
  if (!validation.valid) throw new IntakeRepositoryAccessError();
  const context = `intake:file:${submissionId}:${fileId}`;
  return {
    bytes: encryptAppwriteFile(input.bytes, context, keyring),
    storageName: `${fileId}.umojaenc`,
    metadata: {
      encryptionKeyVersion: keyring.activeVersion,
      originalName: input.name,
      originalSize: input.bytes.byteLength,
      mediaType: input.mediaType,
    } satisfies EncryptedIntakeFileMetadata,
  };
}

export async function decryptAuthorizedIntakeFile(
  encrypted: Uint8Array,
  submissionId: string,
  fileId: string,
  authorize: () => Promise<boolean>,
  keyring: AppwriteEncryptionKeyring,
) {
  if (!(await authorize())) throw new IntakeRepositoryAccessError();
  return decryptAppwriteFile(encrypted, `intake:file:${submissionId}:${fileId}`, keyring);
}
