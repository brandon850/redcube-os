# RedCube OS — Deployment & Resend wiring

This activates the pieces that can't run under `vite dev`: **email sending** (Resend) and the
**sequence executor cron**. Order matters — do the accounts first, then deploy.

## 1. Push to GitHub
```bash
cd redcube-os
git init && git add -A && git commit -m "RedCube OS"
gh repo create redcube-os --private --source=. --push   # or create the repo in the UI and push
```

## 2. Apply all migrations to Supabase
In the Supabase SQL editor, run in order if you haven't:
`001` → `002` → `003` → `004` → `005` → `006` → `007` → `008` → `009` → `010` → `011` → `012`.

In **Supabase → Authentication → URL Configuration**, set **Site URL** to your Vercel domain
(e.g. `https://app.redcube.co`) so magic-link / invite emails point at production.

## 3. Resend
1. Create an account at resend.com, add your **sending domain** (e.g. `redcube.co`) and add the
   DNS records it shows (SPF/DKIM) at your registrar. Verification can take up to 48h.
2. Create an **API key** → this is `RESEND_API_KEY`.
3. Until the domain is verified, Resend only sends from `onboarding@resend.dev` (the code falls
   back to this automatically when a brand has no `from_email`). After verification, set each
   brand's **From email** in **Settings → Brands** to an address on the verified domain.
4. Per-brand sending: For Collective should use its own verified domain/address (add it in Resend too).

## 4. Create the Vercel project
- Import the GitHub repo at vercel.com. Framework preset: **Vite** (build `npm run build`, output `dist`).
- `vercel.json` already configures the SPA rewrite (so deep links like `/proposals/view/:token`
  resolve) and the `/api/cron/automation` cron (every 5 min).
- **Cron note:** scheduled crons may require a paid Vercel plan / have minimum intervals on Hobby.
  You can also hit `POST /api/cron/automation` manually (or from an external scheduler) to process due steps.

## 5. Environment variables (Vercel → Settings → Environment Variables)
Required now:
```
VITE_SUPABASE_URL            = https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY       = <anon key>
SUPABASE_URL                 = https://<project>.supabase.co   (same as above)
SUPABASE_SERVICE_ROLE_KEY    = <service role key>   ← secret, server only
RESEND_API_KEY               = <resend key>          (omit to keep emails simulated)
CRON_SECRET                  = <random string>       (optional; protects the cron endpoint)
PUBLIC_RESULTS_BASE_URL      = https://<domain>/audit/report
```
Add the others (DocuSign / Stripe / QBO / ClickUp / Google) as you wire each integration.

## 6. Verify after deploy
- Load the app, sign in (magic link should arrive once Site URL + Resend are set).
- **Email:** create an Active sequence with a "Send email" first step, enroll a contact whose
  email is yours → within ~5 min the cron sends it (check Resend logs + the contact's `email_logs`).
  With no `RESEND_API_KEY` it's logged as `simulated` instead.
- **Public deep links:** open a proposal client link directly — it should load (rewrite working).

## What this turns on
- `sendEmail` (`api/_lib/email.ts`) — renders a branded template and sends via Resend, logging to `email_logs`.
- The executor (`api/cron/automation.ts`) — every 5 min, processes due `contact_sequence_steps`,
  sends sequence emails, and schedules the next step (a "wait" applies its delay to the next step).

## Still simulated until wired (later)
DocuSign contracts, Stripe invoicing, QuickBooks sync, ClickUp project creation, GSC sync.
Each becomes live by adding its credentials + the corresponding serverless calls.
