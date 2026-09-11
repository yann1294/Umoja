import { beforeEach, describe, expect, it, vi } from "vitest";
import { isCanonicalMutationRequest } from "./same-origin";

describe("canonical mutation origin", () => {
  beforeEach(() => vi.stubEnv("APP_URL", "https://umoja.example.test"));

  it("accepts only the canonical browser origin", () => {
    expect(
      isCanonicalMutationRequest(
        new Request("http://internal:3000/api", {
          headers: { origin: "https://umoja.example.test" },
        }),
      ),
    ).toBe(true);
    expect(isCanonicalMutationRequest(new Request("https://umoja.example.test/api"))).toBe(false);
    expect(
      isCanonicalMutationRequest(
        new Request("https://umoja.example.test/api", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
  });
});
