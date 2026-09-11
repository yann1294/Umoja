import { LinkButton } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { routing } from "@/i18n/routing";
import { listSupabaseIntakeSummaries } from "@/lib/intake/supabase-review-service";
import { requireSupabaseIntakeReviewer } from "@/lib/supabase/intake-auth";

export const dynamic = "force-dynamic";
export default async function IntakeQueue({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ locale: string }>; searchParams: Promise<{ state?: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseIntakeReviewer(locale);
  const query = await searchParams;
  const items = await listSupabaseIntakeSummaries(query.state);
  const french = locale === "fr";
  return (
    <WorkspaceShell current="intake" locale={locale} user={user}>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">
            {french ? "Administration · demandes" : "Administration · intakes"}
          </p>
          <h1>{french ? "Demandes à examiner" : "Intakes to review"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Les listes minimisent les données personnelles. Ouvrez un dossier seulement lorsque nécessaire."
              : "Lists minimize personal data. Open a record only when needed."}
          </p>
        </div>
      </header>
      <form className="cms-toolbar" role="search">
        <label>
          <span>{french ? "État" : "Status"}</span>
          <select name="state" defaultValue={query.state ?? ""}>
            <option value="">{french ? "Tous" : "All"}</option>
            <option value="new">New</option>
            <option value="triage">Triage</option>
            <option value="in_review">In review</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
            <option value="duplicate">Duplicate</option>
          </select>
        </label>
        <button className="u-button u-button--secondary u-button--medium">
          {french ? "Filtrer" : "Filter"}
        </button>
      </form>
      {items.length ? (
        <div
          className="workspace-table-scroll"
          tabIndex={0}
          aria-label={french ? "Liste des demandes" : "Intake list"}
        >
          <table className="workspace-table">
            <thead>
              <tr>
                <th>{french ? "Type" : "Type"}</th>
                <th>{french ? "Domaines" : "Areas"}</th>
                <th>{french ? "État" : "Status"}</th>
                <th>{french ? "Reçu" : "Received"}</th>
                <th>
                  <span className="u-visually-hidden">{french ? "Ouvrir" : "Open"}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.kind}-${item.id}`}>
                  <td>
                    {item.kind === "project"
                      ? french
                        ? "Projet"
                        : "Project"
                      : french
                        ? "Talent"
                        : "Talent"}
                  </td>
                  <td>{item.categories.join(", ")}</td>
                  <td>{item.status.replaceAll("_", " ")}</td>
                  <td>
                    <time dateTime={item.createdAt}>
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                        new Date(item.createdAt),
                      )}
                    </time>
                  </td>
                  <td>
                    <LinkButton
                      size="small"
                      variant="secondary"
                      href={`/${locale}/admin/intake/${item.kind}/${item.id}`}
                    >
                      {french ? "Examiner" : "Review"}
                    </LinkButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="cms-empty">
          <p className="workspace-eyebrow">{french ? "Aucune demande" : "No intakes"}</p>
          <h2>{french ? "La file est vide" : "The queue is clear"}</h2>
          <p>
            {french
              ? "Les nouveaux dossiers validés apparaîtront ici."
              : "Validated new submissions will appear here."}
          </p>
        </section>
      )}
    </WorkspaceShell>
  );
}
