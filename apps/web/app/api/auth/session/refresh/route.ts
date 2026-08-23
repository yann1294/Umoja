import { NextResponse } from "next/server";
import { refreshWorkspaceSession } from "@/lib/appwrite/auth";
import { safeRouteError } from "@/lib/appwrite/http";

export async function POST() {
  try {
    const state = await refreshWorkspaceSession();
    return NextResponse.json({ user: state.user, reason: state.reason });
  } catch (error) {
    return safeRouteError(error);
  }
}
