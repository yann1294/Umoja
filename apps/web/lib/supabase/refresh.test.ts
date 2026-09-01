import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUser, createServerClient } = vi.hoisted(() => {
  const getUser = vi.fn();
  return { getUser, createServerClient: vi.fn(() => ({ auth: { getUser } })) };
});

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { refreshSupabaseRequest } from "./refresh";

describe("Supabase SSR refresh boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-key");
    vi.stubEnv("APP_URL", "https://umoja.example.test");
    getUser.mockReset().mockResolvedValue({ data: { user: { id: "actor-1" } } });
  });

  it("uses only publishable configuration and carries a refreshed request principal", async () => {
    const request = new NextRequest("https://umoja.example.test/en/admin/content");
    const result = await refreshSupabaseRequest(request);
    expect(createServerClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable-test-key",
      expect.any(Object),
    );
    expect(getUser).toHaveBeenCalledOnce();
    expect(result.user).toEqual({ id: "actor-1" });
    expect(result.response.status).toBe(200);
  });
});
