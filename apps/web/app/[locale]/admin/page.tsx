import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { AdminOverview } from "@/components/workspace/workspace-overviews";
import { routing } from "@/i18n/routing";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireSupabaseWorkspaceCapability("admin.operations", locale);
  return (
    <WorkspaceShell current="admin" locale={locale} user={user}>
      <AdminOverview locale={locale} user={user} />
    </WorkspaceShell>
  );
}
