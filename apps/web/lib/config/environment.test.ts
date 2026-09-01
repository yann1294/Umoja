import { describe, expect, it } from "vitest";
import {
  ApplicationEnvironmentError,
  getApplicationEnvironment,
  getIntakeCryptographyEnvironment,
} from "./environment";

const key = (byte: number) => Buffer.alloc(32, byte).toString("base64");

describe("provider-neutral application environment", () => {
  it("accepts a valid canonical application origin", () => {
    expect(
      getApplicationEnvironment({
        APP_URL: "https://umoja.example",
        NEXT_REVALIDATION_SECRET: "test-only",
      }),
    ).toMatchObject({ APP_URL: "https://umoja.example", NEXT_REVALIDATION_SECRET: "test-only" });
  });

  it("prefers canonical key names and preserves the Supabase migration alias", () => {
    const canonical = getIntakeCryptographyEnvironment({
      APP_URL: "https://umoja.example",
      UMOJA_ACTIVE_ENCRYPTION_KEY_VERSION: "v1",
      UMOJA_DATA_ENCRYPTION_KEY_V1: key(1),
      UMOJA_FILE_ENCRYPTION_KEY_V1: key(2),
      UMOJA_LOOKUP_HMAC_KEY_V1: key(3),
    });
    const legacy = getIntakeCryptographyEnvironment({
      APP_URL: "https://umoja.example",
      SUPABASE_ACTIVE_ENCRYPTION_KEY_VERSION: "v1",
      SUPABASE_DATA_ENCRYPTION_KEY_V1: key(1),
      SUPABASE_FILE_ENCRYPTION_KEY_V1: key(2),
      SUPABASE_LOOKUP_HMAC_KEY_V1: key(3),
    });
    expect(canonical).toEqual(legacy);
  });

  it("fails closed when APP_URL is missing or invalid", () => {
    expect(() => getApplicationEnvironment({})).toThrow(ApplicationEnvironmentError);
    expect(() => getApplicationEnvironment({ APP_URL: "not-an-origin" })).toThrow(
      ApplicationEnvironmentError,
    );
  });
});
