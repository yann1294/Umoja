import { describe, expect, it } from "vitest";

import {
  contentSecurityPolicy,
  publicIndexingEnabled,
  releaseRobots,
  releaseSecurityHeaders,
} from "./release-security";

describe("release security policy", () => {
  it("keeps indexing disabled unless explicitly enabled", () => {
    expect(publicIndexingEnabled({})).toBe(false);
    expect(publicIndexingEnabled({ UMOJA_PUBLIC_INDEXING: "disabled" })).toBe(false);
    expect(publicIndexingEnabled({ UMOJA_PUBLIC_INDEXING: "enabled" })).toBe(true);
    expect(releaseRobots(false)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(releaseRobots(true).rules).toMatchObject({ allow: "/" });
  });

  it("builds a production CSP for the application and exact Supabase origin", () => {
    const policy = contentSecurityPolicy({
      development: false,
      supabaseUrl: "https://project.supabase.co/path",
    });
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain(
      "connect-src 'self' https://project.supabase.co wss://project.supabase.co",
    );
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("sb_secret");
  });

  it("adds HSTS only for HTTPS and noindex only for private preview", () => {
    const preview = releaseSecurityHeaders({
      appUrl: "https://preview.umoja.test",
      development: false,
      publicIndexing: false,
    });
    expect(preview).toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
    expect(preview).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noarchive",
    });
    const local = releaseSecurityHeaders({
      appUrl: "http://127.0.0.1:4173",
      development: true,
      publicIndexing: true,
    });
    expect(local.some(({ key }) => key === "Strict-Transport-Security")).toBe(false);
    expect(local.some(({ key }) => key === "X-Robots-Tag")).toBe(false);
  });
});
