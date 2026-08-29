import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkspaceOverview } from "@/components/workspace/workspace-overviews";
import { routing } from "@/i18n/routing";
import { requireWorkspaceUser } from "@/lib/appwrite/auth";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireWorkspaceUser(locale);
  return (
    <WorkspaceShell current="workspace" locale={locale} user={user}>
      <WorkspaceOverview locale={locale} user={user} />
    </WorkspaceShell>
  );
}
