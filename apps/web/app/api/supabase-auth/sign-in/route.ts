import { NextResponse } from "next/server";
import { supabaseSignInSchema } from "@/lib/supabase/auth";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  // This response object is both the Supabase cookie sink and the final browser response.
  // A body-bearing JSON response avoids intermediaries dropping Set-Cookie on an empty 204 reply.
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  try {
    const values = supabaseSignInSchema.parse(await request.json());
    const client = createSupabaseRouteClient(request, response);
    const { data, error } = await client.auth.signInWithPassword(values);
    if (error || !data.user || data.user.banned_until) throw new Error("sign-in-rejected");
    return response;
  } catch {
    return NextResponse.json(
      { error: "Authentication unavailable." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}
