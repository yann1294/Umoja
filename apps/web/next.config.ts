import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { publicIndexingEnabled, releaseSecurityHeaders } from "./lib/config/release-security";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@umoja/ui"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...releaseSecurityHeaders({
            appUrl: process.env.APP_URL,
            development: process.env.NODE_ENV !== "production",
            publicIndexing: publicIndexingEnabled(),
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          }),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
