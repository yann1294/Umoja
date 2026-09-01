import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { safeIntakeReturnPath } from "@/lib/supabase/intake-return-path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IntakeSignIn({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const safeLocale = locale as "en" | "fr";
  const next = safeIntakeReturnPath((await searchParams).next, safeLocale);
  redirect(`/${safeLocale}/sign-in?next=${encodeURIComponent(next)}`);
}
