import { beforeEach, describe, expect, it, vi } from "vitest";

const { persistSupabasePublicIntake, submitMockIntake } = vi.hoisted(() => ({
  persistSupabasePublicIntake: vi.fn(),
  submitMockIntake: vi.fn(),
}));

vi.mock("@/lib/intake/supabase-submission-service", () => ({ persistSupabasePublicIntake }));
vi.mock("@/lib/intake/mock-adapter", () => ({ submitMockIntake }));

import { POST } from "./route";

describe("atomic public intake route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes multipart project data and real bytes only to the Supabase boundary", async () => {
    persistSupabasePublicIntake.mockResolvedValue({
      persisted: true,
      reference: "UP-SYNTHETIC001",
      status: "success",
    });
    const file = {
      name: "proof.pdf",
      type: "application/pdf",
      arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
    };
    const form = {
      get: (name: string) => (name === "payload" ? JSON.stringify({ synthetic: true }) : ""),
      getAll: (name: string) => (name === "files" ? [file] : []),
    };
    const response = await POST(
      {
        formData: async () => form,
        headers: new Headers({
          "content-type": "multipart/form-data; boundary=synthetic",
          "x-umoja-locale": "fr",
        }),
      } as unknown as Request,
      { params: Promise.resolve({ kind: "project" }) },
    );
    expect(response.status).toBe(200);
    expect(persistSupabasePublicIntake).toHaveBeenCalledWith(
      "project",
      { synthetic: true },
      "local",
      "fr",
      "",
      [expect.objectContaining({ name: "proof.pdf", mediaType: "application/pdf" })],
    );
  });

  it("keeps contact explicitly mock-only", async () => {
    submitMockIntake.mockResolvedValue({ persisted: false, reference: "mock", status: "success" });
    const response = await POST(
      new Request("http://localhost/api/intake/contact", {
        method: "POST",
        body: JSON.stringify({ synthetic: true }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ kind: "contact" }) },
    );
    expect(response.status).toBe(200);
    expect(submitMockIntake).toHaveBeenCalledOnce();
    expect(persistSupabasePublicIntake).not.toHaveBeenCalled();
  });

  it("rejects oversized requests before parsing or persistence", async () => {
    const request = {
      headers: new Headers({
        "content-length": "31000001",
        "content-type": "multipart/form-data; boundary=synthetic",
      }),
      formData: vi.fn(),
    } as unknown as Request;
    const response = await POST(request, {
      params: Promise.resolve({ kind: "project" }),
    });
    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(request.formData).not.toHaveBeenCalled();
    expect(persistSupabasePublicIntake).not.toHaveBeenCalled();
  });

  it("marks failure responses private and non-cacheable", async () => {
    const response = await POST(
      {
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => {
          throw new Error("synthetic parse failure");
        },
      } as unknown as Request,
      { params: Promise.resolve({ kind: "talent" }) },
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
