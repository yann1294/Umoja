# Supabase SSR authentication cutover checklist

Until the CMS atomic switch, every listed route remains **Appwrite identity + Appwrite CMS/media**.
No active route may pair an Appwrite session with a Supabase repository or authorization decision.

| Call site | Current boundary | Target boundary | Status |
| --- | --- | --- | --- |
| `lib/cms/service.ts` public reads | Appwrite runtime | Supabase SSR/public client + Supabase CMS repository | Pending atomic CMS switch |
| `api/cms/media` and `[assetKey]` | Appwrite session/runtime | Supabase SSR principal + Supabase Storage | Pending |
| `admin/content/actions.ts` | Appwrite session/runtime | Supabase SSR principal + Supabase CMS repository | Pending |
| `admin/content/*` pages | Appwrite session/runtime | Supabase SSR principal + Supabase CMS repository | Pending |
| `admin/content/media/*` | Appwrite session/runtime | Supabase SSR principal + Supabase Storage | Pending |

The Supabase routes added in this slice live under `/api/supabase-auth/*` and are not yet called by
the Appwrite-rendered workspace or CMS routes. They therefore form no active split route group.
