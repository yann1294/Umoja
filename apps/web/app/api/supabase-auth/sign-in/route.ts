import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { supabaseSignInSchema } from "@/lib/supabase/auth";
import { supabaseServerCookieOptions } from "@/lib/supabase/cookies";
import { getSupabaseEnvironment } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  // This response object is both the Supabase cookie sink and the final browser response.
  // A body-bearing JSON response avoids intermediaries dropping Set-Cookie on an empty 204 reply.
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  try {
    const values = supabaseSignInSchema.parse(await request.json());
    const env = getSupabaseEnvironment();
    const client = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll: () => {
            const cookie = request.headers.get("cookie") ?? "";
            return cookie
              .split(/;\s*/)
              .filter(Boolean)
              .map((value) => {
                const index = value.indexOf("=");
                return { name: value.slice(0, index), value: value.slice(index + 1) };
              });
          },
          setAll: (entries) =>
            entries.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, supabaseServerCookieOptions(options)),
            ),
        },
      },
    );
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
