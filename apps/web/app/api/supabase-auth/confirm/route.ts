import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import {
  parseSupabaseAuthConfirmation,
  resolveSupabaseInviteLocale,
  supabaseAuthFailureTargetFromRequest,
  supabaseAuthFinalTarget,
  supabaseAuthInvalidTarget,
} from "@/lib/supabase/redirects";
import { setSupabaseAuthFlowCookie } from "@/lib/supabase/auth-flow-context";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { logWarn } from "@/lib/observability/structured-log";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const parsed = parseSupabaseAuthConfirmation(request.url);
  if (!parsed) {
    const supplied = new URL(request.url).searchParams;
    logWarn("supabase-auth-confirm-rejected", {
      stage: "request-validation",
      flow: supplied.get("flow") ?? "missing",
      locale: supplied.get("locale") ?? "missing",
      type: supplied.get("type") ?? "missing",
      tokenPresent: Boolean(supplied.get("token_hash")),
      tokenLength: supplied.get("token_hash")?.length ?? 0,
      requestOrigin: new URL(request.url).origin,
    });
    return NextResponse.redirect(supabaseAuthFailureTargetFromRequest(request.url), {
      status: 303,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  }
  const response = NextResponse.redirect(supabaseAuthFinalTarget(parsed.locale, parsed.flow), {
    status: 303,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
  const client = createSupabaseRouteClient(request, response);
  const { data, error } = await client.auth.verifyOtp({
    token_hash: parsed.tokenHash,
    type: parsed.type as EmailOtpType,
  });
  const bannedUntil = data.user?.banned_until ? new Date(data.user.banned_until) : null;
  if (error || !data.user || (bannedUntil && bannedUntil > new Date())) {
    logWarn("supabase-auth-confirm-rejected", {
      flow: parsed.flow,
      locale: parsed.locale,
      errorCode: error?.code ?? "none",
      status: error?.status ?? 0,
      userPresent: Boolean(data.user),
      disabled: Boolean(bannedUntil && bannedUntil > new Date()),
    });
    return NextResponse.redirect(supabaseAuthInvalidTarget(parsed.locale, parsed.flow), {
      status: 303,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  }
  const locale =
    parsed.flow === "invite"
      ? resolveSupabaseInviteLocale(data.user.user_metadata, parsed.locale)
      : parsed.locale;
  response.headers.set("Location", supabaseAuthFinalTarget(locale, parsed.flow).toString());
  if (parsed.flow === "invite" || parsed.flow === "recovery") {
    setSupabaseAuthFlowCookie(response, data.user.id, parsed.flow);
  }
  return response;
}
