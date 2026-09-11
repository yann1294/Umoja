import { describe, expect, it } from "vitest";
import {
  ApplicationEnvironmentError,
  getApplicationEnvironment,
  getIntakeCryptographyEnvironment,
  getTransactionalEmailEnvironment,
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
    expect(() => getApplicationEnvironment({ APP_URL: "https://umoja.example/path" })).toThrow(
      ApplicationEnvironmentError,
    );
    expect(() => getApplicationEnvironment({ APP_URL: "javascript:alert(1)" })).toThrow(
      ApplicationEnvironmentError,
    );
  });

  it("normalizes a valid HTTP application origin", () => {
    expect(getApplicationEnvironment({ APP_URL: "http://127.0.0.1:3000/" }).APP_URL).toBe(
      "http://127.0.0.1:3000",
    );
  });

  it("validates the server-only Brevo email contract", () => {
    expect(
      getTransactionalEmailEnvironment({
        NODE_ENV: "production",
        UMOJA_EMAIL_PROVIDER: "brevo",
        UMOJA_EMAIL_FROM: "hello@example.test",
        BREVO_API_KEY: "test-api-key-with-enough-length",
      }),
    ).toMatchObject({ provider: "brevo", from: "hello@example.test" });
    expect(() =>
      getTransactionalEmailEnvironment({
        NODE_ENV: "production",
        UMOJA_EMAIL_FROM: "hello@example.test",
      }),
    ).toThrow(ApplicationEnvironmentError);
    expect(() =>
      getTransactionalEmailEnvironment({
        NODE_ENV: "production",
        UMOJA_EMAIL_PROVIDER: "brevo",
        UMOJA_EMAIL_FROM: "hello@example.test",
      }),
    ).toThrow(ApplicationEnvironmentError);
    expect(() =>
      getTransactionalEmailEnvironment({
        NODE_ENV: "production",
        UMOJA_EMAIL_PROVIDER: "brevo",
        UMOJA_EMAIL_FROM: "Umoja <hello@example.test>",
        BREVO_API_KEY: "test-api-key-with-enough-length",
      }),
    ).toThrow(ApplicationEnvironmentError);
  });
});
