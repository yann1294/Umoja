import { NextResponse } from "next/server";
import { signInWithSupabase } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  try {
    return NextResponse.json(await signInWithSupabase(await request.json()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication unavailable." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}
