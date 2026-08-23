import { NextResponse } from "next/server";
import { signIn } from "@/lib/appwrite/auth";
import { safeRouteError } from "@/lib/appwrite/http";

export async function POST(request: Request) {
  try {
    return NextResponse.json({ user: await signIn(await request.json()) });
  } catch (error) {
    return safeRouteError(error);
  }
}
