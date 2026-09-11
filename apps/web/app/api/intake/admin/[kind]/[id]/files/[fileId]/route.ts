import { z } from "zod";
import { createAuthorizedIntakeStorage } from "@/lib/intake/supabase-file-service";
import { requireSupabaseIntakeReviewer } from "@/lib/supabase/intake-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const paramsSchema = z.object({
  kind: z.enum(["project", "talent"]),
  id: z.uuid(),
  fileId: z.uuid(),
});

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ kind: string; id: string; fileId: string }> }>,
) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return new Response(null, { status: 404 });
  try {
    const user = await requireSupabaseIntakeReviewer("en");
    const file = await createAuthorizedIntakeStorage(user).download(parsed.data.fileId, {
      kind: parsed.data.kind,
      intakeId: parsed.data.id,
    });
    return new Response(file.bytes, {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Content-Type": file.mediaType,
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(
  _request: Request,
  context: Readonly<{ params: Promise<{ kind: string; id: string; fileId: string }> }>,
) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return new Response(null, { status: 404 });
  try {
    const user = await requireSupabaseIntakeReviewer("en");
    await createAuthorizedIntakeStorage(user).remove(parsed.data.fileId, {
      kind: parsed.data.kind,
      intakeId: parsed.data.id,
    });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
