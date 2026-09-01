import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { safeCmsReturnPath } from "@/lib/supabase/cms-return-path";

/** Temporary compatibility route; canonical Supabase sign-in owns the rendered lifecycle. */
export default async function CmsSignIn({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const safeLocale = locale as "en" | "fr";
  const next = safeCmsReturnPath((await searchParams).next, safeLocale);
  redirect(`/${safeLocale}/sign-in?next=${encodeURIComponent(next)}`);
}
