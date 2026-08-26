import { NextResponse } from "next/server";
import { signOutOfSupabase } from "@/lib/supabase/auth";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST() {
  await signOutOfSupabase();
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
