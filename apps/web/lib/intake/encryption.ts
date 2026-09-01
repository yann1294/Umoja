import "server-only";

import { getIntakeCryptographyEnvironment } from "@/lib/config/environment";
import { createIntakeEncryptionKeyring, IntakeEncryptionError } from "./encryption-core";

export * from "./encryption-core";

export function createIntakeEncryptionKeyringFromEnvironment(
  source: Readonly<Record<string, string | undefined>>,
) {
  try {
    return createIntakeEncryptionKeyring(getIntakeCryptographyEnvironment(source));
  } catch {
    throw new IntakeEncryptionError();
  }
}
