# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**RedCube OS** — a single-tenant internal platform for RedCube that runs the whole agency
lifecycle as four pillars:

1. **Attract** — public SEO audit lead magnet (`features/audit`) → captures leads as contacts + deals
2. **Sell** — CRM, pipeline, proposal configurator, contracts (`features/crm|pipeline|proposals|contracts`)
3. **Onboard** — auto-setup cascade: ClickUp + Stripe + QuickBooks on contract signature
4. **Deliver** — ongoing SEO management: managed sites, keywords, content, checklists, GSC, client reports (`features/delivery`)

Full plan: `../REDCUBE_OS_ROADMAP.md`. Built from three proof-of-concept repos (GHL Replacement
scaffolding, a proposal configurator, an SEO platform) — all greenfield, no data migration.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # Type-check + production build
npm run preview    # Serve the production build locally
npm run lint       # ESLint

npx tsc -p tsconfig.app.json --noEmit   # Type-check only (faster than full build)
```

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in your Supabase project credentials:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Architecture

### Path alias
`@/` maps to `src/`. Use it for all imports (e.g. `@/lib/supabase`, `@/types/database.types`).

### Supabase client
`src/lib/supabase.ts` exports a single typed `supabase` client. Always import from here — never create a second client. The client is typed against `Database` from `src/types/database.types.ts`.

### Database types
`src/types/database.types.ts` contains the hand-authored `Database` interface for every table plus convenience type aliases (`Contact`, `Deal`, `Proposal`, `Service`, `Audit`, `ManagedSite`, etc.). When the schema changes, update both this file **and** the migration — they are kept in sync by hand.

### Folder conventions
| Folder | Purpose |
|--------|---------|
| `src/features/<module>/` | All code for a business domain (components, hooks, API calls). One folder per feature: `crm`, `pipeline`, `proposals`, `contracts`, `billing`, `automation`, `email`, `audit` (Attract), `delivery` (ongoing SEO), `catalog` (services/packages admin) |
| `src/lib/seo/` | Ported SEO engine: crawler + scorer + pagespeed (framework-agnostic TS, used by both the public audit and managed-site audits) |
| `src/components/ui/` | shadcn/ui generated components (do not edit manually — use `npx shadcn add <component>`) |
| `src/components/` | Shared, non-shadcn UI components used across features |
| `src/hooks/` | App-wide custom React hooks |
| `src/lib/` | Third-party client singletons: `supabase.ts`, `utils.ts` (add `resend.ts` here when needed) |
| `src/types/` | TypeScript types — `database.types.ts` plus any domain types |
| `src/api/cron/` | Vercel serverless function handlers (not bundled by Vite) |

### Global providers (src/main.tsx)
- `QueryClientProvider` — TanStack Query, 5-minute stale time, 1 retry
- `BrowserRouter` — React Router v7

### Styling
Tailwind CSS v3 + shadcn/ui with the **neutral** color theme. All shadcn colors are CSS variables defined in `src/index.css`. Dark mode via `.dark` class. Add shadcn components with:
```bash
npx shadcn add <component-name>
```

### Vercel cron jobs
Defined in `vercel.json`:
- `/api/cron/automation` — every 5 minutes; processes pending sequence steps
- `/api/cron/qbo-keepalive` — Mondays at 9 AM UTC; refreshes QBO OAuth token

Handlers live in `src/api/cron/` and use `@vercel/node` types.

### Database migrations
`supabase/migrations/001_initial_schema.sql` is the single authoritative schema: the CRM/pipeline/proposal/contract/billing/automation core, the expanded **catalog** model (`services` → `packages` with tiers/price_type → `package_line_items` + `package_addons` + `service_addons`), the **Attract** `audits` table, and the **Deliver** tables (`managed_sites`, `site_pages`, `site_audits`, `keyword_groups`, `site_keywords`, `content_drafts`, `checklist_items`, `client_reports`, `gsc_connections`). RLS is enabled on every table with a broad `authenticated` policy (plus an `anon` INSERT policy on `audits` for the public lead magnet). A future migration will tighten policies by `users.role`.

`supabase/migrations/002_seed_catalog.sql` seeds RedCube's real service catalog (Web Design, Video Production, Photography) — run after 001.

`supabase/migrations/003_user_fks_to_public_users.sql` re-points user FKs (`contacts.assigned_to`, `activities.user_id`, `proposals.created_by`) from `auth.users` → `public.users` so PostgREST can embed the related user. **Any table that needs to embed a user via PostgREST must FK to `public.users`, not `auth.users`** — `auth` relationships aren't exposed to the API. (001 already reflects this for fresh installs; 003 patches databases created from the original 001.)

Run both against a fresh Supabase project (SQL editor or `supabase db push`). The `deals → proposals` FK is added via `ALTER TABLE` after `proposals` exists to avoid a circular dependency.

The `deals → proposals` FK is added via `ALTER TABLE` after `proposals` is created to avoid a circular dependency.

The `contacts.updated_at` column is maintained automatically by the `contacts_updated_at` trigger.

Two partial unique indexes enforce business rules at the DB level:
- `contact_sequences`: only one `status = 'active'` enrollment per contact per sequence
- `clickup_templates`: only one `is_active = true` template at a time
