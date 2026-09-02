import { NextResponse } from "next/server";
import {
  getSupabasePostAuthenticationContinuation,
  supabaseSignInSchema,
} from "@/lib/supabase/auth";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/http/private-response";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  // This response object is both the Supabase cookie sink and the final browser response.
  // A body-bearing JSON response avoids intermediaries dropping Set-Cookie on an empty 204 reply.
  const response = NextResponse.json({ ok: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  try {
    const input = await request.json();
    const values = supabaseSignInSchema.parse(input);
    const client = createSupabaseRouteClient(request, response);
    const { data, error } = await client.auth.signInWithPassword(values);
    const bannedUntil = data.user?.banned_until ? new Date(data.user.banned_until) : null;
    if (error || !data.user || (bannedUntil && bannedUntil > new Date())) {
      throw new Error("sign-in-rejected");
    }
    const locale = input.locale === "fr" ? "fr" : "en";
    const next = await getSupabasePostAuthenticationContinuation(
      client,
      data.user,
      locale,
      input.next,
    );
    response.headers.set("X-Umoja-Next", next);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Authentication unavailable." },
      { status: 401, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}
