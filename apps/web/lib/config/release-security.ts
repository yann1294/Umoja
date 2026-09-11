import type { MetadataRoute } from "next";

type Header = Readonly<{ key: string; value: string }>;

function origin(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function publicIndexingEnabled(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  return source.UMOJA_PUBLIC_INDEXING === "enabled";
}

export function contentSecurityPolicy(options: { development: boolean; supabaseUrl?: string }) {
  const supabaseOrigin = origin(options.supabaseUrl);
  const websocketOrigin = supabaseOrigin?.replace(/^http/, "ws");
  const connectSources = [
    "'self'",
    supabaseOrigin,
    websocketOrigin,
    ...(options.development ? ["http://localhost:*", "ws://localhost:*"] : []),
  ].filter(Boolean);
  const scriptSources = [
    "'self'",
    // Next.js emits inline bootstrap scripts. A per-request nonce can replace this only when every
    // static and dynamic rendering path is migrated together.
    "'unsafe-inline'",
    ...(options.development ? ["'unsafe-eval'"] : []),
  ];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}

export function releaseSecurityHeaders(options: {
  appUrl?: string;
  development: boolean;
  publicIndexing: boolean;
  supabaseUrl?: string;
}): readonly Header[] {
  const headers: Header[] = [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(options),
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ];
  if (!options.publicIndexing) {
    headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" });
  }
  if (origin(options.appUrl)?.startsWith("https://")) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }
  return headers;
}

export function releaseRobots(publicIndexing: boolean): MetadataRoute.Robots {
  if (!publicIndexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/design-system/",
        "/en/admin/",
        "/fr/admin/",
        "/en/preview/",
        "/fr/preview/",
        "/en/workspace/",
        "/fr/workspace/",
      ],
    },
  };
}
