import { NextResponse } from "next/server";
import { completeSupabasePasswordFlow } from "@/lib/supabase/auth";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "fr" ? "fr" : "en";
  const response = NextResponse.redirect(
    new URL(`/${locale}/sign-in?password=updated`, getSupabaseEnvironment().APP_URL),
    { status: 303, headers: PRIVATE_RESPONSE_HEADERS },
  );
  try {
    const next = await completeSupabasePasswordFlow(
      request,
      response,
      "recovery",
      await request.json(),
      locale,
    );
    response.headers.set("Location", new URL(next, getSupabaseEnvironment().APP_URL).toString());
    return response;
  } catch {
    return NextResponse.json(
      { error: "Reset unavailable." },
      { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}
