import { LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import type { PersistedIntakeKind } from "@/lib/intake/contracts";
import { getSupabaseIntakeForReview } from "@/lib/intake/supabase-review-service";
import { createAuthorizedIntakeStorage } from "@/lib/intake/supabase-file-service";
import { requireSupabaseIntakeReviewer } from "@/lib/supabase/intake-auth";
import { updateReview } from "../../actions";

export const dynamic = "force-dynamic";
export default async function IntakeDetail({
  params,
}: Readonly<{ params: Promise<{ locale: string; kind: string; id: string }> }>) {
  const { locale, kind: rawKind, id } = await params;
  if (!hasLocale(routing.locales, locale) || (rawKind !== "project" && rawKind !== "talent"))
    notFound();
  const kind = rawKind as PersistedIntakeKind;
  const user = await requireSupabaseIntakeReviewer(locale);
  let record;
  let files;
  try {
    record = await getSupabaseIntakeForReview(kind, id);
    files = await createAuthorizedIntakeStorage(user).list(kind, id);
  } catch {
    notFound();
  }
  const french = locale === "fr";
  const statusOptions = ["new", "triage", "in_review", "contacted", "closed", "duplicate"];
  return (
    <WorkspaceShell current="intake" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">{french ? "Demande autorisée" : "Authorized intake"}</p>
          <h1>
            {kind === "project"
              ? french
                ? "Demande de projet"
                : "Project intake"
              : french
                ? "Candidature talent"
                : "Talent intake"}
          </h1>
          <p className="workspace-page-summary">
            {french
              ? "Les données privées ne sont affichées que dans ce contexte d’examen autorisé."
              : "Private data is displayed only in this authorized review context."}
          </p>
        </div>
        <LinkButton href={`/${locale}/admin/intake`} variant="secondary">
          {french ? "Retour à la file" : "Return to queue"}
        </LinkButton>
      </header>
      <div className="workspace-grid workspace-grid-admin">
        <section className="workspace-panel">
          <h2>{french ? "Données de la demande" : "Submission data"}</h2>
          <PrivateFields value={record.payload} />
        </section>
        <section className="workspace-panel">
          <h2>{french ? "Suivi" : "Follow-up"}</h2>
          <form action={updateReview.bind(null, locale, kind, id)} className="cms-editor">
            <label className="cms-field">
              <span>{french ? "État" : "Status"}</span>
              <select name="status" defaultValue={record.summary.status}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="cms-field">
              <span>{french ? "Propriétaire (ID interne)" : "Owner (internal ID)"}</span>
              <input
                name="assignedReviewerId"
                defaultValue={record.summary.assignedReviewerId}
                maxLength={64}
              />
            </label>
            <label className="cms-field">
              <span>{french ? "Note interne" : "Internal note"}</span>
              <textarea name="note" rows={5} maxLength={2000} />
            </label>
            <button className="u-button u-button--highlight u-button--medium">
              {french ? "Enregistrer le suivi" : "Save follow-up"}
            </button>
          </form>
        </section>
      </div>
      <section className="workspace-section">
        <div className="workspace-section-heading">
          <h2>{french ? "Historique interne" : "Internal history"}</h2>
          <p>
            {french
              ? "Notes chiffrées, visibles aux réviseurs autorisés."
              : "Encrypted notes, visible to authorized reviewers."}
          </p>
        </div>
        {record.notes.length ? (
          <ol className="cms-content-list">
            {record.notes.map(
              (note: { actorId: string; createdAt: string; text: string }, index: number) => (
                <li className="cms-content-row" key={`${note.createdAt}-${index}`}>
                  <div className="cms-content-meta">
                    <p>{note.text}</p>
                    <small>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(note.createdAt))}
                    </small>
                  </div>
                </li>
              ),
            )}
          </ol>
        ) : (
          <p>{french ? "Aucune note interne." : "No internal notes."}</p>
        )}
      </section>
      <section className="workspace-section">
        <div className="workspace-section-heading">
          <h2>{french ? "Pièces jointes chiffrées" : "Encrypted attachments"}</h2>
          <p>
            {french
              ? "Les fichiers en quarantaine restent indisponibles jusqu’à une analyse antimalware réelle."
              : "Quarantined files remain unavailable until a real malware scan completes."}
          </p>
        </div>
        {files.length ? (
          <ul className="cms-content-list">
            {files.map((file) => (
              <li className="cms-content-row" key={file.id}>
                <div className="cms-content-meta">
                  <strong>{file.mediaType}</strong>
                  <small>
                    {Math.ceil(file.originalSize / 1024)} KB · {file.scanStatus}
                  </small>
                </div>
                {file.scanStatus === "clean" ? (
                  <LinkButton
                    size="small"
                    variant="secondary"
                    href={`/api/intake/admin/${kind}/${id}/files/${file.id}`}
                  >
                    {french ? "Télécharger" : "Download"}
                  </LinkButton>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>{french ? "Aucune pièce jointe." : "No attachments."}</p>
        )}
      </section>
    </WorkspaceShell>
  );
}

function PrivateFields({ value }: Readonly<{ value: Record<string, unknown> }>) {
  const rows = flatten(value);
  return (
    <dl className="workspace-access-list">
      {rows.map(([label, text]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{text || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
function flatten(value: Record<string, unknown>, prefix = ""): [string, string][] {
  return Object.entries(value).flatMap(([key, current]) => {
    const label = prefix ? `${prefix} · ${key}` : key;
    if (Array.isArray(current))
      return [
        [
          label,
          current
            .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
            .join(", "),
        ],
      ];
    if (current && typeof current === "object")
      return flatten(current as Record<string, unknown>, label);
    return [
      [label, typeof current === "boolean" ? (current ? "Yes" : "No") : String(current ?? "")],
    ];
  });
}
