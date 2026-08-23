import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizePhone, validateIntakeFile } from "./intake-security";

describe("intake security", () => {
  it("normalizes contact values", () => {
    expect(normalizeEmail(" Person@Example.COM ")).toBe("person@example.com");
    expect(normalizePhone("+221 (77) 123-45-67")).toBe("+221771234567");
  });

  it("checks file signatures instead of trusting extensions", () => {
    expect(
      validateIntakeFile({
        name: "brief.pdf",
        size: 8,
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      }).valid,
    ).toBe(true);
    expect(
      validateIntakeFile({ name: "brief.pdf", size: 8, bytes: new Uint8Array([1, 2, 3, 4]) }),
    ).toMatchObject({ valid: false, reason: "signature" });
  });
});
