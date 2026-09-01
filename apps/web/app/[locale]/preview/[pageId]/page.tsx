import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SupabaseCmsRepository } from "@/lib/cms/supabase-repository";
import { readCmsPreviewCookie, validateCmsPreviewCapability } from "@/lib/cms/supabase-preview";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

/** Capability preview never uses the public query and only renders the page/revision bound to its token. */
export default async function CmsTokenPreview({
  params,
}: Readonly<{ params: Promise<{ locale: string; pageId: string }> }>) {
  const { locale, pageId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const token = await readCmsPreviewCookie(pageId);
  if (!token) notFound();
  const binding = await validateCmsPreviewCapability({ pageId, locale, token });
  if (!binding || binding.pageId !== pageId) notFound();
  const page = await new SupabaseCmsRepository(createSupabaseAdminClient()).getPreviewRevision(
    binding.pageId,
    binding.revisionId,
  );
  if (!page || page.locale !== locale) notFound();
  return (
    <main className="cms-preview" aria-labelledby="cms-preview-title">
      <div className="cms-preview-banner">
        <strong>{locale === "fr" ? "Aperçu non public" : "Non-public preview"}</strong>
        <span>{page.locale.toUpperCase()}</span>
      </div>
      <h1 id="cms-preview-title">{page.title}</h1>
      {page.blocks.map((block, index) =>
        block.type === "heading" ? (
          block.level === 2 ? (
            <h2 key={index}>{block.text}</h2>
          ) : (
            <h3 key={index}>{block.text}</h3>
          )
        ) : block.type === "paragraph" ? (
          <p key={index}>{block.text}</p>
        ) : block.type === "callout" ? (
          <aside key={index}>
            <strong>{block.title}</strong>
            <p>{block.text}</p>
          </aside>
        ) : block.type === "field" ? (
          <div className="cms-preview-field" key={index}>
            <small>{block.label}</small>
            <strong>{block.value}</strong>
          </div>
        ) : block.type === "link" ? (
          <p key={index}>
            <a href={block.href}>{block.label}</a>
          </p>
        ) : null,
      )}
    </main>
  );
}
