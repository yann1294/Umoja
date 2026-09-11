import { expect, test } from "vitest";
import { safeCmsReturnPath } from "./cms-return-path";
test("allows only locale-scoped CMS/media paths", () => {
  expect(safeCmsReturnPath("/en/admin/content/x/edit", "en")).toBe("/en/admin/content/x/edit");
  expect(safeCmsReturnPath("https://bad.example", "en")).toBe("/en/admin/content");
  expect(safeCmsReturnPath("//bad.example", "en")).toBe("/en/admin/content");
  expect(safeCmsReturnPath("/en/workspace", "en")).toBe("/en/admin/content");
});
