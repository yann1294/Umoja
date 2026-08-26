import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAuthCallbackUrl } from "@/lib/supabase/redirects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const locale = (await request.json().catch(() => ({}))).locale === "fr" ? "fr" : "en";
  const client = await createSupabaseServerClient();
  await client.auth.resend({
    type: "signup",
    email: (await client.auth.getUser()).data.user?.email ?? "",
    options: { emailRedirectTo: supabaseAuthCallbackUrl(locale, "verification") },
  });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
