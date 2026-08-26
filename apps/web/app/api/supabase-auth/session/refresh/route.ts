import { NextResponse } from "next/server";
import { getSupabaseWorkspaceUser } from "@/lib/supabase/auth";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST() {
  const user = await getSupabaseWorkspaceUser();
  return NextResponse.json(
    { user },
    { status: user ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}
