import { describe, expect, it } from "vitest";
import { safeIntakeReturnPath } from "./intake-return-path";

describe("intake scoped return paths", () => {
  it("allows only locale-matched intake administration paths", () => {
    expect(safeIntakeReturnPath("/en/admin/intake/project/abc", "en")).toBe(
      "/en/admin/intake/project/abc",
    );
    for (const unsafe of [
      "https://bad.example/en/admin/intake",
      "//bad.example/en/admin/intake",
      "/fr/admin/intake",
      "/en/admin/content",
      "/en/workspace",
      "/en/admin/intake/sign-in",
    ]) {
      expect(safeIntakeReturnPath(unsafe, "en")).toBe("/en/admin/intake");
    }
  });
});
