import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import { parseSupabaseAuthConfirmation } from "@/lib/supabase/redirects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const privateHeaders = {
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function invalidTarget(locale: "en" | "fr", flow: "verification" | "invite" | "recovery") {
  const page =
    flow === "verification"
      ? "verify-email"
      : flow === "invite"
        ? "accept-invite"
        : "recover-password";
  return new URL(`/${locale}/${page}?state=invalid`, getSupabaseEnvironment().APP_URL);
}

export async function GET(request: Request) {
  const parsed = parseSupabaseAuthConfirmation(request.url);
  if (!parsed) {
    return NextResponse.redirect(
      new URL("/en/sign-in?auth=invalid", getSupabaseEnvironment().APP_URL),
      { status: 303, headers: privateHeaders },
    );
  }
  const response = NextResponse.redirect(parsed.target, { status: 303, headers: privateHeaders });
  const client = createSupabaseRouteClient(request, response);
  const { data, error } = await client.auth.verifyOtp({
    token_hash: parsed.tokenHash,
    type: parsed.type as EmailOtpType,
  });
  const bannedUntil = data.user?.banned_until ? new Date(data.user.banned_until) : null;
  if (error || !data.user || (bannedUntil && bannedUntil > new Date())) {
    return NextResponse.redirect(invalidTarget(parsed.locale, parsed.flow), {
      status: 303,
      headers: privateHeaders,
    });
  }
  return response;
}
