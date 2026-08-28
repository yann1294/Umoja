import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath, revalidateTag }));
vi.mock("@/lib/config/environment", () => ({
  getApplicationEnvironment: () => ({
    APP_URL: "http://localhost",
    NEXT_REVALIDATION_SECRET: "test-only-revalidation-secret",
  }),
}));

import { POST } from "./route";

describe("CMS revalidation boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a missing or incorrect secret without revalidating", async () => {
    const response = await POST(
      new Request("http://localhost/api/cms/revalidate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidation-secret": "wrong" },
        body: JSON.stringify({ locale: "en", slug: "home" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates only a validated locale and route", async () => {
    const response = await POST(
      new Request("http://localhost/api/cms/revalidate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revalidation-secret": "test-only-revalidation-secret",
        },
        body: JSON.stringify({ locale: "fr", slug: "home" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("cms:fr:home", { expire: 0 });
    expect(revalidatePath).toHaveBeenCalledWith("/fr");
  });

  it("rejects path traversal", async () => {
    const response = await POST(
      new Request("http://localhost/api/cms/revalidate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revalidation-secret": "test-only-revalidation-secret",
        },
        body: JSON.stringify({ locale: "en", slug: "../private" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
