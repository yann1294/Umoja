import { NextResponse } from "next/server";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { isCanonicalMutationRequest } from "@/lib/http/same-origin";
import { setSupabaseAuthFlowCookie } from "@/lib/supabase/auth-flow-context";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  try {
    if (!isCanonicalMutationRequest(request)) throw new Error("untrusted-origin");
    const { data, error } = await createSupabaseRouteClient(request, response).auth.getUser();
    if (error || !data.user) throw new Error("recovery-session-unavailable");
    setSupabaseAuthFlowCookie(response, data.user.id, "recovery");
    return response;
  } catch {
    return NextResponse.json(
      { error: "Recovery session unavailable." },
      { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}
