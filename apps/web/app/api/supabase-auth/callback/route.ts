import { NextResponse } from "next/server";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { setSupabaseAuthFlowCookie } from "@/lib/supabase/auth-flow-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  logSupabaseAuthCallbackOutcome,
  parseSupabaseAuthCallback,
  supabaseAuthFailureTargetFromRequest,
  supabaseAuthInvalidTarget,
} from "@/lib/supabase/redirects";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(request: Request) {
  const callback = parseSupabaseAuthCallback(request.url);
  const code = new URL(request.url).searchParams.get("code");
  if (!callback || !code) {
    logSupabaseAuthCallbackOutcome({
      flow: callback?.flow ?? "invalid",
      locale: callback?.locale ?? "invalid",
      codePresent: Boolean(code),
      exchange: "not-attempted",
      finalRoute: "none",
    });
    return NextResponse.redirect(supabaseAuthFailureTargetFromRequest(request.url), {
      status: 303,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  }
  const { data, error } = await (
    await createSupabaseServerClient()
  ).auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    const target = supabaseAuthInvalidTarget(callback.locale, callback.flow);
    logSupabaseAuthCallbackOutcome({
      flow: callback.flow,
      locale: callback.locale,
      codePresent: true,
      exchange: "failed",
      finalRoute: `${target.pathname}${target.search}`,
    });
    return NextResponse.redirect(target, {
      status: 303,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  }
  logSupabaseAuthCallbackOutcome({
    flow: callback.flow,
    locale: callback.locale,
    codePresent: true,
    exchange: "succeeded",
    finalRoute: `${callback.target.pathname}${callback.target.search}`,
  });
  const response = NextResponse.redirect(callback.target, {
    status: 303,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
  if (callback.flow === "invite" || callback.flow === "recovery") {
    setSupabaseAuthFlowCookie(response, data.user.id, callback.flow);
  }
  return response;
}
