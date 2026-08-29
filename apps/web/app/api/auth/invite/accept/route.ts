import { NextResponse } from "next/server";
import { acceptWorkspaceInvite } from "@/lib/appwrite/auth";
import { safeRouteError } from "@/lib/appwrite/http";

export async function POST(request: Request) {
  try {
    await acceptWorkspaceInvite(await request.json());
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeRouteError(error);
  }
}
