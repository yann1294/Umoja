import { IntakeKindSchema } from "@umoja/validation";
import { randomBytes } from "node:crypto";

import { submitMockIntake } from "@/lib/intake/mock-adapter";
import { persistSupabasePublicIntake } from "@/lib/intake/supabase-submission-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ kind: string }> }>,
) {
  const { kind: rawKind } = await context.params;
  const kind = IntakeKindSchema.safeParse(rawKind);
  if (!kind.success) return Response.json({ error: "unknown_intake_kind" }, { status: 404 });

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const form = contentType.startsWith("multipart/form-data") ? await request.formData() : null;
    const payload = form ? JSON.parse(String(form.get("payload") ?? "{}")) : await request.json();
    const files = form
      ? await Promise.all(
          form
            .getAll("files")
            .filter(
              (value): value is File =>
                typeof value !== "string" &&
                typeof value.name === "string" &&
                typeof value.arrayBuffer === "function",
            )
            .map(async (file) => ({
              name: file.name,
              mediaType: file.type,
              bytes: new Uint8Array(await file.arrayBuffer()),
            })),
        )
      : [];
    const locale = request.headers.get("x-umoja-locale") === "fr" ? "fr" : "en";
    const result =
      kind.data === "contact"
        ? await submitMockIntake(kind.data, payload)
        : await persistSupabasePublicIntake(
            kind.data,
            payload,
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local",
            locale,
            form?.get("website"),
            files,
          );
    if (result.status === "rejected") {
      const prefix = kind.data === "project" ? "UP" : "UT";
      return Response.json(
        {
          status: "success",
          persisted: false,
          reference: `${prefix}-${randomBytes(9).toString("hex").slice(0, 12).toUpperCase()}`,
        },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }
    const status =
      result.status === "validation_error"
        ? 400
        : result.status === "duplicate"
          ? 409
          : result.status === "rate_limited"
            ? 429
            : 200;
    return Response.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ status: "network_error", persisted: false }, { status: 503 });
  }
}
