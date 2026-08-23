import { describe, expect, it } from "vitest";
import { AppwriteEnvironmentError, parseAppwriteEnvironment, redactEnvironment } from "./env";

const valid = {
  NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://example.cloud.appwrite.io/v1",
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: "development-project",
};

describe("Appwrite environment", () => {
  it("uses safe non-secret resource defaults", () => {
    const env = parseAppwriteEnvironment(valid);
    expect(env.APPWRITE_DATABASE_ID).toBe("umoja");
    expect(env.APPWRITE_INTAKE_FILES_BUCKET_ID).toBe("cms_media");
    expect(env.APPWRITE_SERVER_API_KEY).toBeUndefined();
  });

  it("fails without leaking invalid values", () => {
    expect(() =>
      parseAppwriteEnvironment({ ...valid, NEXT_PUBLIC_APPWRITE_ENDPOINT: "private-value" }),
    ).toThrow(new AppwriteEnvironmentError());
  });

  it("redacts every secret-bearing name", () => {
    expect(
      redactEnvironment({
        APPWRITE_SERVER_API_KEY: "sensitive",
        SESSION_SECRET: "session",
        APP_URL: "http://localhost:3000",
      }),
    ).toEqual({
      APPWRITE_SERVER_API_KEY: "[REDACTED]",
      SESSION_SECRET: "[REDACTED]",
      APP_URL: "http://localhost:3000",
    });
  });
});
