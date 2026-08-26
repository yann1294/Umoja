import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code) await (await createSupabaseServerClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/en/workspace", request.url), {
    headers: { "Cache-Control": "no-store" },
  });
}
