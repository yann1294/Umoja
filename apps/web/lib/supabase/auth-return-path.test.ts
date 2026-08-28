import { describe, expect, it } from "vitest";
import { safeAuthReturnPath } from "./auth-return-path";

describe("canonical Supabase return paths", () => {
  it("allows only locale-matched protected Umoja routes", () => {
    expect(safeAuthReturnPath("/en/workspace", "en")).toBe("/en/workspace");
    expect(safeAuthReturnPath("/fr/admin/content/example/edit", "fr")).toBe(
      "/fr/admin/content/example/edit",
    );
    expect(safeAuthReturnPath("/en/admin/intake/project/example", "en")).toBe(
      "/en/admin/intake/project/example",
    );
  });

  it.each([
    "https://attacker.example/en/admin",
    "//attacker.example/en/admin",
    "/fr/workspace",
    "/en/contact",
    "/en/admin/finance",
    "/en/sign-in?next=/en/admin",
  ])("rejects unsafe return path %s", (value) => {
    expect(safeAuthReturnPath(value, "en")).toBe("/en/workspace");
  });
});
