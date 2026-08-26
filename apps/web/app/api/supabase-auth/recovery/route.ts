import { NextResponse } from "next/server";
import { requestSupabaseRecovery } from "@/lib/supabase/auth";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  const input = await request.json().catch(() => ({}));
  await requestSupabaseRecovery(input.email, input.locale === "fr" ? "fr" : "en");
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
