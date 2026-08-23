import "server-only";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getServerAppwriteEnvironment } from "@/lib/appwrite/env";

const requestSchema = z.object({
  locale: z.enum(["en", "fr"]),
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9\/-]*$/)
    .max(512),
});

function matchesSecret(candidate: string | null, expected: string) {
  if (!candidate) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidation-secret");
  const expected = getServerAppwriteEnvironment().NEXT_REVALIDATION_SECRET;
  if (!expected || !matchesSecret(secret, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = requestSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { locale, slug } = result.data;
  revalidateTag(`cms:${locale}:${slug}`, { expire: 0 });
  revalidatePath(slug === "home" ? `/${locale}` : `/${locale}/${slug}`);
  return Response.json({ revalidated: true });
}
