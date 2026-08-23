import { NextResponse } from "next/server";
import { signOut } from "@/lib/appwrite/auth";

export async function POST() {
  await signOut();
  return NextResponse.json({ success: true });
}
