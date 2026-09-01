import { describe, expect, it, vi } from "vitest";

import { logError, logInfo } from "./structured-log";

describe("structured server logging", () => {
  it("emits one-line JSON with allow-listed operational context", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logInfo("supabase-auth-callback", {
      flow: "verification",
      locale: "fr",
      exchange: "succeeded",
      finalRoute: "/fr/verify-email?verified=1",
    });
    const record = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      level: "info",
      event: "supabase-auth-callback",
      context: { flow: "verification", locale: "fr", exchange: "succeeded" },
    });
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    info.mockRestore();
  });

  it("redacts nested credentials, PII, token-shaped strings and error details", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logError("request-failed", {
      email: "private@example.test",
      nested: {
        authorization: "Bearer credential",
        detail: "contact private@example.test",
        failure: new Error("password=must-not-appear"),
      },
    });
    const output = String(error.mock.calls[0]?.[0]);
    expect(output).not.toContain("private@example.test");
    expect(output).not.toContain("Bearer credential");
    expect(output).not.toContain("must-not-appear");
    expect(JSON.parse(output).context).toEqual({
      email: "[REDACTED]",
      nested: {
        authorization: "[REDACTED]",
        detail: "[REDACTED]",
        failure: { name: "Error" },
      },
    });
    error.mockRestore();
  });
});
