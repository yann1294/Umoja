import { NextResponse } from "next/server";
import { completeSupabasePasswordFlow } from "@/lib/supabase/auth";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import { completeUmojaInvitation } from "@/lib/invitations/service";
import { isCanonicalMutationRequest } from "@/lib/http/same-origin";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "fr" ? "fr" : "en";
  const response = NextResponse.redirect(
    new URL(`/${locale}/account-state`, getSupabaseEnvironment().APP_URL),
    { status: 303, headers: PRIVATE_RESPONSE_HEADERS },
  );
  try {
    if (!isCanonicalMutationRequest(request)) throw new Error("untrusted-origin");
    const input = await request.json();
    const next =
      (await completeUmojaInvitation(request, response, input)) ??
      (await completeSupabasePasswordFlow(request, response, "invite", input, locale));
    response.headers.set("Location", new URL(next, getSupabaseEnvironment().APP_URL).toString());
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invitation unavailable." },
      { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}
