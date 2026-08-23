import { describe, expect, it } from "vitest";
import { toSafeAppwriteError } from "./errors";

describe("safe Appwrite errors", () => {
  it("maps known status without returning provider messages or stacks", () => {
    const error = toSafeAppwriteError({
      code: 403,
      message: "internal table and user details",
      stack: "secret",
    });
    expect(error).toMatchObject({
      code: "forbidden",
      status: 403,
      message: "You do not have permission to perform this action.",
    });
    expect(JSON.stringify(error)).not.toContain("internal table");
    expect(JSON.stringify(error)).not.toContain("secret");
  });
});
