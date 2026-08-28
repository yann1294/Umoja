import { describe, expect, it } from "vitest";
import {
  ApplicationEnvironmentError,
  getApplicationEnvironment,
  getIntakeCryptographyEnvironment,
} from "./environment";

const key = (byte: number) => Buffer.alloc(32, byte).toString("base64");

describe("provider-neutral application environment", () => {
  it("reads shared application settings without an Appwrite parser", () => {
    expect(
      getApplicationEnvironment({
        APP_URL: "https://umoja.example",
        NEXT_REVALIDATION_SECRET: "test-only",
      }),
    ).toMatchObject({ APP_URL: "https://umoja.example", NEXT_REVALIDATION_SECRET: "test-only" });
  });

  it("prefers canonical key names and preserves legacy aliases", () => {
    const canonical = getIntakeCryptographyEnvironment({
      APP_URL: "https://umoja.example",
      UMOJA_ACTIVE_ENCRYPTION_KEY_VERSION: "v1",
      UMOJA_DATA_ENCRYPTION_KEY_V1: key(1),
      UMOJA_FILE_ENCRYPTION_KEY_V1: key(2),
      UMOJA_LOOKUP_HMAC_KEY_V1: key(3),
    });
    const legacy = getIntakeCryptographyEnvironment({
      APP_URL: "https://umoja.example",
      APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION: "v1",
      APPWRITE_DATA_ENCRYPTION_KEY_V1: key(1),
      APPWRITE_FILE_ENCRYPTION_KEY_V1: key(2),
      APPWRITE_LOOKUP_HMAC_KEY_V1: key(3),
    });
    expect(canonical).toEqual(legacy);
  });

  it("fails with a neutral error when required configuration is absent", () => {
    expect(() => getApplicationEnvironment({})).toThrow(ApplicationEnvironmentError);
  });
});
