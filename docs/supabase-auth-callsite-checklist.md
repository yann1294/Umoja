# Supabase SSR authentication cutover checklist

Historical cutover note: the listed routes now use the accepted Supabase-only runtime. Appwrite is
retained only as migration and rollback history. No active route may restore an Appwrite identity or
repository dependency.

Normal account onboarding uses the encrypted `account_invitations` model and the server-only
transactional email adapter. Supabase Dashboard invitations and `inviteUserByEmail` are deprecated
for Umoja onboarding. Password recovery continues through Supabase Auth with custom SMTP and the
localized token-hash confirmation route.

| Call site | Current boundary | Target boundary | Status |
| --- | --- | --- | --- |
| `lib/cms/service.ts` public reads | Appwrite runtime | Supabase SSR/public client + Supabase CMS repository | Pending atomic CMS switch |
| `api/cms/media` and `[assetKey]` | Appwrite session/runtime | Supabase SSR principal + Supabase Storage | Pending |
| `admin/content/actions.ts` | Appwrite session/runtime | Supabase SSR principal + Supabase CMS repository | Pending |
| `admin/content/*` pages | Appwrite session/runtime | Supabase SSR principal + Supabase CMS repository | Pending |
| `admin/content/media/*` | Appwrite session/runtime | Supabase SSR principal + Supabase Storage | Pending |

The Supabase routes added in this slice live under `/api/supabase-auth/*` and are not yet called by
the Appwrite-rendered workspace or CMS routes. They therefore form no active split route group.
