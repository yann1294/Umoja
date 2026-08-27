import "server-only";

// The cryptographic envelope predates the provider spike and intentionally remains byte-for-byte
// compatible. These provider-neutral aliases let both adapters use one reviewed AES/HMAC service
// until the final backend cutover removes the Appwrite compatibility name.
export {
  AppwriteEncryptionError as IntakeEncryptionError,
  createAppwriteBlindIndex as createIntakeBlindIndex,
  createAppwriteEncryptionKeyring as createIntakeEncryptionKeyring,
  createAppwriteEncryptionKeyringFromEnvironment as createIntakeEncryptionKeyringFromEnvironment,
  decryptAppwriteFile as decryptIntakeFile,
  decryptAppwriteValue as decryptIntakeValue,
  encryptAppwriteFile as encryptIntakeFile,
  encryptAppwriteValue as encryptIntakeValue,
} from "@/lib/appwrite/encryption";
export type { AppwriteEncryptionKeyring as IntakeEncryptionKeyring } from "@/lib/appwrite/encryption";
