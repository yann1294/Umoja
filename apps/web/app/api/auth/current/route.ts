import { NextResponse } from "next/server";
import { getWorkspaceAccessState } from "@/lib/appwrite/auth";

export async function GET() {
  const state = await getWorkspaceAccessState();
  return NextResponse.json(state, { status: state.reason === "allowed" ? 200 : 401 });
}
