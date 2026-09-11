import { NextResponse } from "next/server";
import { requestSupabaseRecovery } from "@/lib/supabase/auth";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { isCanonicalMutationRequest } from "@/lib/http/same-origin";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  const input = await request.json().catch(() => ({}));
  if (isCanonicalMutationRequest(request)) {
    await requestSupabaseRecovery(input.email, input.locale === "fr" ? "fr" : "en").catch(
      () => undefined,
    );
  }
  return NextResponse.json({ success: true }, { headers: PRIVATE_RESPONSE_HEADERS });
}
