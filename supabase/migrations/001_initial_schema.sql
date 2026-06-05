-- ============================================================
-- 001_initial_schema.sql
-- Full CRM schema with RLS enabled on every table.
-- Initial policy: authenticated users can read/write all rows.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE CRM
-- ============================================================

CREATE TABLE companies (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  domain      text,
  industry    text,
  qbo_customer_id text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contacts (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          uuid REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to         uuid,  -- FK to public.users added after users table is created
  first_name          text NOT NULL,
  last_name           text NOT NULL,
  email               text NOT NULL,
  phone               text,
  status              text,
  source              text,
  lead_score          int NOT NULL DEFAULT 0,
  email_status        text NOT NULL DEFAULT 'active',
  custom_fields       jsonb,
  stripe_customer_id  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE activities (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  uuid REFERENCES contacts(id) ON DELETE CASCADE,
  user_id     uuid,  -- FK to public.users added after users table is created
  type        text NOT NULL,
  body        text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL UNIQUE,
  color       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contact_tags (
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- ============================================================
-- PIPELINE
-- ============================================================

CREATE TABLE pipeline_stages (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                text NOT NULL,
  position            int NOT NULL,
  color               text,
  default_probability int,
  stale_after_days    int,
  auto_trigger        text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE deals (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id          uuid REFERENCES contacts(id) ON DELETE SET NULL,
  company_id          uuid REFERENCES companies(id) ON DELETE SET NULL,
  stage_id            uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  proposal_id         uuid, -- FK added after proposals table creation below
  title               text NOT NULL,
  value               numeric(12, 2),
  probability         int,
  status              text NOT NULL DEFAULT 'open',
  clickup_folder_id   text,
  clickup_list_id     text,
  stripe_customer_id  text,
  qbo_customer_id     text,
  last_activity_at    timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text,
  email               text NOT NULL,
  role                text NOT NULL DEFAULT 'sales',
  calendar_url        text,
  notification_prefs  jsonb,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- public.users.id mirrors auth.users.id (created on first login). App tables
-- reference public.users so PostgREST can embed the user (e.g. assignee, actor).
ALTER TABLE contacts
  ADD CONSTRAINT contacts_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE activities
  ADD CONSTRAINT activities_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- FORMS
-- ============================================================

CREATE TABLE forms (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  embed_token text NOT NULL UNIQUE,
  fields      jsonb,
  settings    jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE form_submissions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id      uuid REFERENCES forms(id) ON DELETE SET NULL,
  contact_id   uuid REFERENCES contacts(id) ON DELETE SET NULL,
  data         jsonb,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  page_url     text,
  referrer     text,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CATALOG: SERVICES, PACKAGES & PROPOSALS
-- Catalog model ported from the proposal configurator:
--   service → tiered packages → (column add-ons + shared add-ons)
-- ============================================================

-- A service is a top-level offering category (Web Design, Video, Photography…)
CREATE TABLE services (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  emoji       text,
  icon_bg     text,
  icon_color  text,
  sort_order  int NOT NULL DEFAULT 99,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- A package is a priced tier within a service (Option A/B/C, Good/Better/Best…)
CREATE TABLE packages (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id        uuid REFERENCES services(id) ON DELETE CASCADE,
  name              text NOT NULL,
  tier              text,                                   -- e.g. 'Option A', 'Good'
  description       text,
  tagline           text,
  type              text,                                   -- legacy: 'base' | 'addon' (kept for compat)
  base_price        numeric(12, 2),
  price_type        text NOT NULL DEFAULT 'monthly',        -- 'monthly' | 'one_time'
  setup_fee         numeric(12, 2),
  billing_cadence   text,
  video_url         text,
  featured          boolean NOT NULL DEFAULT false,
  stripe_product_id text,
  is_active         boolean NOT NULL DEFAULT true,
  is_popular        boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  is_hidden         boolean NOT NULL DEFAULT false,
  sort_order        int NOT NULL DEFAULT 99,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Deliverables / feature bullets shown on a package card
CREATE TABLE package_line_items (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id  uuid REFERENCES packages(id) ON DELETE CASCADE,
  description text NOT NULL,
  sort_order  int
);

-- Column add-ons: optional extras attached to ONE specific package
CREATE TABLE package_addons (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id  uuid REFERENCES packages(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  price       numeric(12, 2) NOT NULL DEFAULT 0,
  price_type  text NOT NULL DEFAULT 'monthly',             -- 'monthly' | 'one_time'
  sort_order  int NOT NULL DEFAULT 99
);

-- Shared add-ons: extras offered at the SERVICE level (apply to the selected package)
CREATE TABLE service_addons (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id  uuid REFERENCES services(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  price       numeric(12, 2) NOT NULL DEFAULT 0,
  price_type  text NOT NULL DEFAULT 'monthly',             -- 'monthly' | 'one_time'
  sort_order  int NOT NULL DEFAULT 99
);

CREATE TABLE proposals (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id        uuid REFERENCES deals(id) ON DELETE SET NULL,
  contact_id     uuid REFERENCES contacts(id) ON DELETE SET NULL,
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  status         text,
  intro_text     text,
  payment_terms  text,
  discount_pct   numeric(5, 2) NOT NULL DEFAULT 0,
  valid_until    date,
  pdf_url        text,
  sent_at        timestamptz,
  viewed_at      timestamptz,
  signed_at      timestamptz,
  view_count     int NOT NULL DEFAULT 0,
  signer_name    text,
  signer_ip      text,
  version_number int NOT NULL DEFAULT 1
);

CREATE TABLE proposal_packages (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id          uuid REFERENCES proposals(id) ON DELETE CASCADE,
  package_id           uuid REFERENCES packages(id) ON DELETE SET NULL,
  name_snapshot        text,
  description_snapshot text,
  price_type_snapshot  text,                 -- 'monthly' | 'one_time' at time of selection
  price_override       numeric(12, 2),
  addons_snapshot      jsonb,                 -- selected column + shared add-ons (name/price/type)
  sort_order           int
);

-- Now we can add the FK from deals → proposals
ALTER TABLE deals
  ADD CONSTRAINT deals_proposal_id_fkey
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL;

-- ============================================================
-- CONTRACTS
-- ============================================================

CREATE TABLE contracts (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id           uuid REFERENCES proposals(id) ON DELETE SET NULL,
  deal_id               uuid REFERENCES deals(id) ON DELETE SET NULL,
  docusign_envelope_id  text,
  status                text,
  completed_at          timestamptz,
  signed_pdf_url        text,
  declined_reason       text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contract_signers (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id    uuid REFERENCES contracts(id) ON DELETE CASCADE,
  name           text NOT NULL,
  email          text NOT NULL,
  routing_order  int,
  status         text,
  signed_at      timestamptz
);

-- ============================================================
-- BILLING
-- ============================================================

CREATE TABLE invoices (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id           uuid REFERENCES deals(id) ON DELETE SET NULL,
  contact_id        uuid REFERENCES contacts(id) ON DELETE SET NULL,
  stripe_invoice_id text NOT NULL UNIQUE,
  qbo_invoice_id    text,
  status            text,
  amount_due        numeric(12, 2),
  amount_paid       numeric(12, 2),
  paid_at           timestamptz,
  qbo_sync_status   text NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUTOMATION
-- ============================================================

CREATE TABLE sequences (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             text NOT NULL,
  trigger_type     text,
  trigger_config   jsonb,
  exit_conditions  jsonb,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sequence_steps (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id uuid REFERENCES sequences(id) ON DELETE CASCADE,
  position    int NOT NULL,
  type        text NOT NULL,
  config      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contact_sequences (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id   uuid REFERENCES contacts(id) ON DELETE CASCADE,
  sequence_id  uuid REFERENCES sequences(id) ON DELETE CASCADE,
  status       text,
  enrolled_at  timestamptz,
  completed_at timestamptz,
  exit_reason  text
);

-- Partial unique index: only one active enrollment per contact per sequence
CREATE UNIQUE INDEX contact_sequences_active_unique
  ON contact_sequences (contact_id, sequence_id)
  WHERE status = 'active';

CREATE TABLE contact_sequence_steps (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_sequence_id   uuid REFERENCES contact_sequences(id) ON DELETE CASCADE,
  sequence_step_id      uuid REFERENCES sequence_steps(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'pending',
  execute_at            timestamptz,
  executed_at           timestamptz,
  result                jsonb
);

-- ============================================================
-- EMAIL
-- ============================================================

CREATE TABLE email_logs (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id        uuid REFERENCES contacts(id) ON DELETE SET NULL,
  sequence_step_id  uuid REFERENCES sequence_steps(id) ON DELETE SET NULL,
  message_id        text NOT NULL UNIQUE,
  template_id       text,
  subject           text,
  to_email          text NOT NULL,
  status            text,
  sent_at           timestamptz,
  opened_at         timestamptz,
  clicked_at        timestamptz,
  open_count        int NOT NULL DEFAULT 0,
  click_count       int NOT NULL DEFAULT 0
);

-- ============================================================
-- CLICKUP TEMPLATES
-- ============================================================

CREATE TABLE clickup_templates (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  version    int NOT NULL DEFAULT 1,
  phases     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only one active template at a time
CREATE UNIQUE INDEX clickup_templates_active_unique
  ON clickup_templates (is_active)
  WHERE is_active = true;

-- ============================================================
-- CASCADE LOG
-- ============================================================

CREATE TABLE cascade_log (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id       uuid REFERENCES deals(id) ON DELETE SET NULL,
  job_type      text,
  status        text,
  external_id   text,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ATTRACT: PUBLIC SEO AUDITS (lead magnet)
-- A public audit captures a lead (contact + deal) and stores the graded report.
-- ============================================================

CREATE TABLE audits (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    uuid REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id       uuid REFERENCES deals(id) ON DELETE SET NULL,
  email         text NOT NULL,
  name          text,
  url           text NOT NULL,
  domain        text,
  grade         text,
  overall_score int,
  pages_scanned int,
  report_data   jsonb,                       -- full scorer output (categories, findings)
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DELIVER: ONGOING SEO MANAGEMENT
-- Post-sale client work. A managed site belongs to a company (and optionally a deal).
-- ============================================================

CREATE TABLE managed_sites (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid REFERENCES companies(id) ON DELETE SET NULL,
  deal_id       uuid REFERENCES deals(id) ON DELETE SET NULL,
  name          text NOT NULL,
  url           text NOT NULL,
  domain        text,
  gsc_property  text,                        -- Search Console property URL
  settings      jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_pages (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id         uuid REFERENCES managed_sites(id) ON DELETE CASCADE,
  url             text NOT NULL,
  title           text,
  metrics         jsonb,                     -- crawl/page-scorer metrics
  last_audited_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_audits (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id       uuid REFERENCES managed_sites(id) ON DELETE CASCADE,
  overall_score int,
  grade         text,
  report_data   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE keyword_groups (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id     uuid REFERENCES managed_sites(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_keywords (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id       uuid REFERENCES managed_sites(id) ON DELETE CASCADE,
  group_id      uuid REFERENCES keyword_groups(id) ON DELETE SET NULL,
  keyword       text NOT NULL,
  position      numeric(6, 2),
  search_volume int,
  tracked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_drafts (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id        uuid REFERENCES managed_sites(id) ON DELETE CASCADE,
  title          text NOT NULL,
  body           text,
  status         text NOT NULL DEFAULT 'draft',   -- draft | review | published
  target_keyword text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE checklist_items (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id      uuid REFERENCES managed_sites(id) ON DELETE CASCADE,
  label        text NOT NULL,
  category     text,
  is_completed boolean NOT NULL DEFAULT false,
  is_ignored   boolean NOT NULL DEFAULT false,
  sort_order   int NOT NULL DEFAULT 99,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE client_reports (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id      uuid REFERENCES managed_sites(id) ON DELETE CASCADE,
  title        text NOT NULL,
  period_start date,
  period_end   date,
  report_data  jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Google Search Console OAuth tokens per managed site
-- NOTE: tokens stored plaintext here for the build; encrypt at rest before go-live.
CREATE TABLE gsc_connections (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id         uuid REFERENCES managed_sites(id) ON DELETE CASCADE,
  property_url    text,
  access_token    text,
  refresh_token   text,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- UPDATED_AT TRIGGER for contacts
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER content_drafts_updated_at
  BEFORE UPDATE ON content_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on every table; authenticated users can read/write all rows.
-- Tighten by role in a later migration.
-- ============================================================

ALTER TABLE companies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_line_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_addons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_packages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_signers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sequences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clickup_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascade_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_sites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_audits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_keywords          ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_connections        ENABLE ROW LEVEL SECURITY;

-- ─── Policies: authenticated full access ─────────────────────────────────────

CREATE POLICY "authenticated_all" ON companies              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contacts               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON activities             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON tags                   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contact_tags           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON pipeline_stages        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON deals                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON users                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON forms                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON form_submissions       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON services               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON packages               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON package_line_items     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON package_addons         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON service_addons         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON proposals              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON proposal_packages      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contracts              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contract_signers       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON invoices               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON sequences              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON sequence_steps         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contact_sequences      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contact_sequence_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON email_logs             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON clickup_templates      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON cascade_log            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON audits                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON managed_sites          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON site_pages             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON site_audits            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON keyword_groups         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON site_keywords          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON content_drafts         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON checklist_items        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON client_reports         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON gsc_connections        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PUBLIC AUDIT INGEST
-- The public SEO audit tool runs unauthenticated (writes via the service-role
-- key on the server). Allow anonymous INSERT into audits so the lead magnet works
-- even if it ever calls Supabase directly from the edge.
-- ============================================================
CREATE POLICY "anon_insert_audits" ON audits FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- SEED: Default pipeline stages
-- ============================================================

INSERT INTO pipeline_stages (name, position, color, default_probability, stale_after_days) VALUES
  ('New lead',       1, '#888780', 5,  7),
  ('Nurture',        2, '#378ADD', 15, 14),
  ('Qualified',      3, '#7F77DD', 35, 10),
  ('Proposal sent',  4, '#BA7517', 55, 7),
  ('Contract out',   5, '#1D9E75', 80, 5);
