import { Container } from "@umoja/ui";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { SupabaseCmsSignInForm } from "@/components/auth/supabase-cms-sign-in-form";
import { routing } from "@/i18n/routing";
import { safeCmsReturnPath } from "@/lib/supabase/cms-return-path";
import "../../../sign-in/workspace-auth.css";
export default async function CmsSignIn({ params, searchParams }: { params: Promise<{ locale:string }>; searchParams: Promise<{ next?:string }> }) { const {locale}=await params; if(!hasLocale(routing.locales,locale)) notFound(); const safeLocale=locale as "en"|"fr"; const next=safeCmsReturnPath((await searchParams).next,safeLocale); const fr=safeLocale==="fr"; return <section className="auth-page"><Container size="narrow"><div className="auth-card"><p className="auth-eyebrow">{fr?"Administration · contenu":"Administration · content"}</p><h1>{fr?"Connexion au contenu":"Content sign in"}</h1><p>{fr?"Accédez aux outils éditoriaux invités.":"Access invited editorial tools."}</p><SupabaseCmsSignInForm locale={safeLocale} next={next}/></div></Container></section>; }
