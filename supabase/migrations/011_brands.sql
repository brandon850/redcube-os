-- ============================================================
-- 011_brands.sql
-- Multi-brand: RedCube operates a second entity (For Collective) in the same OS.
-- Shared CRM (contacts/companies/deals/pipeline) — NO brand_id.
-- Per-brand sell/deliver — brand_id on services, proposals, invoices,
-- client_reports, managed_sites, forms, audits. Backfilled to the default (RedCube).
-- ============================================================

CREATE TABLE IF NOT EXISTS brands (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                          text NOT NULL,
  slug                          text NOT NULL UNIQUE,
  brand_color                   text DEFAULT '#E8172B',
  logo_url                      text,
  from_name                     text,
  from_email                    text,
  reply_to                      text,
  website                       text,
  business_address              text,
  default_proposal_validity_days int DEFAULT 30,
  default_payment_terms         text DEFAULT 'Net 30',
  proposal_footer               text,
  is_default                    boolean NOT NULL DEFAULT false,
  sort_order                    int NOT NULL DEFAULT 99,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth        ON brands;
DROP POLICY IF EXISTS write_admin     ON brands;
DROP POLICY IF EXISTS anon_read_brands ON brands;
CREATE POLICY sel_auth        ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY write_admin     ON brands FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY anon_read_brands ON brands FOR SELECT TO anon USING (true); -- public pages render brand

-- Seed RedCube (default, from existing company_settings) + For Collective.
INSERT INTO brands (name, slug, brand_color, from_email, default_payment_terms, is_default, sort_order)
SELECT
  COALESCE((SELECT company_name FROM company_settings WHERE id = 1), 'RedCube Creative'),
  'redcube', '#E8172B',
  COALESCE((SELECT from_email FROM company_settings WHERE id = 1), 'hello@redcube.co'),
  COALESCE((SELECT default_payment_terms FROM company_settings WHERE id = 1), 'Net 30'),
  true, 1
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'redcube');

INSERT INTO brands (name, slug, brand_color, is_default, sort_order)
SELECT 'For Collective', 'for-collective', '#2563EB', false, 2
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'for-collective');

-- Add brand_id to per-brand tables and backfill to the default brand.
DO $$
DECLARE
  rc uuid;
  t  text;
  per_brand text[] := ARRAY['services','proposals','invoices','client_reports','managed_sites','forms','audits'];
BEGIN
  SELECT id INTO rc FROM brands WHERE is_default = true ORDER BY sort_order LIMIT 1;
  FOREACH t IN ARRAY per_brand LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id)', t);
    EXECUTE format('UPDATE %I SET brand_id = $1 WHERE brand_id IS NULL', t) USING rc;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (brand_id)', t || '_brand_id_idx', t);
  END LOOP;
END $$;

-- get_public_proposal: return the proposal's brand (name/color/logo) for client-page theming.
CREATE OR REPLACE FUNCTION get_public_proposal(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prop    proposals%ROWTYPE;
  v_contact contacts%ROWTYPE;
  v_brand   brands%ROWTYPE;
BEGIN
  SELECT * INTO v_prop FROM proposals WHERE view_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Proposal not found'); END IF;

  IF v_prop.viewed_at IS NULL THEN
    UPDATE proposals SET viewed_at = now(), view_count = COALESCE(view_count, 0) + 1,
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END WHERE id = v_prop.id;
    INSERT INTO activities (contact_id, type, body, metadata)
    VALUES (v_prop.contact_id, 'proposal_viewed', 'Opened their proposal', jsonb_build_object('proposal_id', v_prop.id));
  ELSE
    UPDATE proposals SET view_count = COALESCE(view_count, 0) + 1 WHERE id = v_prop.id;
  END IF;

  SELECT * INTO v_contact FROM contacts WHERE id = v_prop.contact_id;
  SELECT * INTO v_brand FROM brands WHERE id = v_prop.brand_id;
  IF NOT FOUND THEN SELECT * INTO v_brand FROM brands WHERE is_default = true LIMIT 1; END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'proposal', jsonb_build_object(
      'id', v_prop.id, 'status', v_prop.status, 'intro_text', v_prop.intro_text,
      'payment_terms', v_prop.payment_terms, 'discount_pct', v_prop.discount_pct,
      'valid_until', v_prop.valid_until, 'signer_name', v_prop.signer_name, 'signed_at', v_prop.signed_at),
    'brand', jsonb_build_object('id', v_brand.id, 'name', v_brand.name, 'color', v_brand.brand_color, 'logo_url', v_brand.logo_url),
    'contact', jsonb_build_object('first_name', v_contact.first_name, 'last_name', v_contact.last_name)
  );
END;
$$;

-- run_onboarding: stamp the invoice with the proposal's brand.
CREATE OR REPLACE FUNCTION run_onboarding(p_deal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal deals%ROWTYPE; v_proposal proposals%ROWTYPE;
  v_amount numeric := 0; v_invoice_id uuid; v_sim_id text; v_brand uuid;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Deal not found'); END IF;
  IF EXISTS (SELECT 1 FROM invoices WHERE deal_id = p_deal_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This deal has already been onboarded.');
  END IF;

  SELECT * INTO v_proposal FROM proposals WHERE deal_id = p_deal_id AND signed_at IS NOT NULL ORDER BY signed_at DESC LIMIT 1;
  IF FOUND THEN
    SELECT COALESCE(SUM(price_override), 0) INTO v_amount FROM proposal_packages WHERE proposal_id = v_proposal.id;
    v_brand := v_proposal.brand_id;
  END IF;
  IF v_amount = 0 THEN v_amount := COALESCE(v_deal.value, 0); END IF;
  IF v_brand IS NULL THEN SELECT id INTO v_brand FROM brands WHERE is_default = true LIMIT 1; END IF;

  v_sim_id := 'sim_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO invoices (deal_id, contact_id, brand_id, stripe_invoice_id, status, amount_due, qbo_sync_status)
  VALUES (p_deal_id, v_deal.contact_id, v_brand, v_sim_id, 'draft', v_amount, 'pending')
  RETURNING id INTO v_invoice_id;

  INSERT INTO cascade_log (deal_id, job_type, status, external_id, error_message) VALUES
    (p_deal_id, 'stripe',  'simulated', v_sim_id, 'Stripe not connected — invoice recorded locally'),
    (p_deal_id, 'qbo',     'simulated', NULL,     'QuickBooks not connected'),
    (p_deal_id, 'clickup', 'simulated', NULL,     'ClickUp not connected — project would be created from active template');

  UPDATE deals SET status = 'won', last_activity_at = now() WHERE id = p_deal_id;
  IF v_deal.contact_id IS NOT NULL THEN
    UPDATE contacts SET status = 'client' WHERE id = v_deal.contact_id;
    INSERT INTO activities (contact_id, type, body, metadata)
    VALUES (v_deal.contact_id, 'onboarding_run', 'Onboarding cascade ran — invoice drafted, project queued (simulated)',
            jsonb_build_object('deal_id', p_deal_id, 'invoice_id', v_invoice_id, 'amount', v_amount));
  END IF;

  RETURN jsonb_build_object('ok', true, 'invoice_id', v_invoice_id, 'amount', v_amount);
END;
$$;

NOTIFY pgrst, 'reload schema';
