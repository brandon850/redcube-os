-- ============================================================
-- 006_rbac_and_settings.sql
-- Role-based access control (admin | sales | viewer) + company_settings.
--
-- Model (kept deliberately simple & safe):
--   • Every authenticated user may READ all tables (the UI hides admin areas
--     from non-admins; read-open avoids accidental lockouts).
--   • WRITES:
--       - config/admin tables  → admin only
--       - operational tables   → admin or sales (viewer = read-only)
--       - users                → own row, or admin
--   • SECURITY DEFINER RPCs (e.g. submit_form) and the anon audit/form policies
--     are unaffected.
--
-- IMPORTANT: make sure your own account is 'admin' BEFORE running this, or you'll
-- drop yourself to limited access:
--   update public.users set role='admin' where email='you@example.com';
-- ============================================================

-- ─── Role helpers (SECURITY DEFINER → read role without RLS recursion) ───────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role FROM public.users WHERE id = auth.uid()), '') = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('admin', 'sales')
$$;

-- ─── Single-row company settings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_settings (
  id                            int PRIMARY KEY DEFAULT 1,
  company_name                  text,
  website                       text,
  from_name                     text,
  from_email                    text,
  reply_to                      text,
  business_address              text,
  default_proposal_validity_days int DEFAULT 30,
  default_payment_terms         text,
  require_approval              boolean NOT NULL DEFAULT false,
  brand_color                   text,
  proposal_footer               text,
  logo_url                      text,
  email_settings                jsonb,
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_settings_single_row CHECK (id = 1)
);
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO company_settings (id, company_name, from_email)
VALUES (1, 'RedCube Creative', 'hello@redcube.co')
ON CONFLICT (id) DO NOTHING;

-- ─── Apply role-based policies to every table ────────────────────────────────────
DO $$
DECLARE
  t text;
  -- config/admin-write tables
  admin_tables text[] := ARRAY[
    'services','packages','package_line_items','package_addons','service_addons',
    'pipeline_stages','sequences','sequence_steps','forms','clickup_templates','company_settings'
  ];
  -- operational tables: admin or sales may write; viewer read-only
  staff_tables text[] := ARRAY[
    'companies','contacts','activities','tags','contact_tags','deals',
    'form_submissions','proposals','proposal_packages','contracts','contract_signers',
    'invoices','contact_sequences','contact_sequence_steps','email_logs','cascade_log',
    'audits','managed_sites','site_pages','site_audits','keyword_groups','site_keywords',
    'content_drafts','checklist_items','client_reports','gsc_connections'
  ];
BEGIN
  -- Read-open + write rules for config + operational tables.
  FOREACH t IN ARRAY admin_tables || staff_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS authenticated_all ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS sel_auth ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS write_admin ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS write_staff ON %I', t);
    EXECUTE format('CREATE POLICY sel_auth ON %I FOR SELECT TO authenticated USING (true)', t);
  END LOOP;

  FOREACH t IN ARRAY admin_tables LOOP
    EXECUTE format(
      'CREATE POLICY write_admin ON %I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
  END LOOP;

  FOREACH t IN ARRAY staff_tables LOOP
    EXECUTE format(
      'CREATE POLICY write_staff ON %I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())', t);
  END LOOP;
END $$;

-- ─── users table: own row, or admin ──────────────────────────────────────────────
DROP POLICY IF EXISTS authenticated_all ON users;
DROP POLICY IF EXISTS users_select       ON users;
DROP POLICY IF EXISTS users_insert_self   ON users;
DROP POLICY IF EXISTS users_update_self_or_admin ON users;
DROP POLICY IF EXISTS users_delete_admin  ON users;

CREATE POLICY users_select ON users
  FOR SELECT TO authenticated USING (true);
CREATE POLICY users_insert_self ON users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY users_update_self_or_admin ON users
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY users_delete_admin ON users
  FOR DELETE TO authenticated USING (public.is_admin());

NOTIFY pgrst, 'reload schema';
