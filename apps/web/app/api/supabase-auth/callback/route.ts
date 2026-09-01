import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  logSupabaseAuthCallbackOutcome,
  parseSupabaseAuthCallback,
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
    return NextResponse.json(
      { error: "Invalid authentication callback." },
      { status: 400, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
    );
  }
  const { error } = await (await createSupabaseServerClient()).auth.exchangeCodeForSession(code);
  if (error) {
    const target = new URL(`/${callback.locale}/sign-in?auth=expired`, callback.target);
    logSupabaseAuthCallbackOutcome({
      flow: callback.flow,
      locale: callback.locale,
      codePresent: true,
      exchange: "failed",
      finalRoute: `${target.pathname}${target.search}`,
    });
    return NextResponse.redirect(target, {
      status: 303,
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }
  logSupabaseAuthCallbackOutcome({
    flow: callback.flow,
    locale: callback.locale,
    codePresent: true,
    exchange: "succeeded",
    finalRoute: `${callback.target.pathname}${callback.target.search}`,
  });
  return NextResponse.redirect(callback.target, {
    status: 303,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
