import { NextResponse } from "next/server";
import { getCurrentWorkspaceUser } from "@/lib/appwrite/auth";

export async function GET() {
  const user = await getCurrentWorkspaceUser();
  return NextResponse.json({ user }, { status: user ? 200 : 401 });
}
