-- ============================================================
-- 008_proposals_public.sql
-- Public, client-facing proposal configurator support:
--   • view_token on proposals (shareable link)
--   • anon READ of the active catalog (services/packages/add-ons) to render the picker
--   • get_public_proposal(token)  → proposal + company + contact (logs first view)
--   • accept_proposal(token, …)   → snapshots selections, marks signed, advances deal
-- ============================================================

-- 1. Shareable token on proposals.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS view_token text;
UPDATE proposals SET view_token = replace(uuid_generate_v4()::text, '-', '') WHERE view_token IS NULL;
ALTER TABLE proposals ALTER COLUMN view_token SET DEFAULT replace(uuid_generate_v4()::text, '-', '');
CREATE UNIQUE INDEX IF NOT EXISTS proposals_view_token_idx ON proposals(view_token);

-- 2. Anonymous visitors can read the active catalog (it's RedCube's public service menu).
DROP POLICY IF EXISTS anon_read_services       ON services;
DROP POLICY IF EXISTS anon_read_packages       ON packages;
DROP POLICY IF EXISTS anon_read_line_items      ON package_line_items;
DROP POLICY IF EXISTS anon_read_package_addons  ON package_addons;
DROP POLICY IF EXISTS anon_read_service_addons  ON service_addons;
CREATE POLICY anon_read_services      ON services           FOR SELECT TO anon USING (is_active);
CREATE POLICY anon_read_packages      ON packages           FOR SELECT TO anon USING (is_active);
CREATE POLICY anon_read_line_items    ON package_line_items FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_package_addons ON package_addons    FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_service_addons ON service_addons    FOR SELECT TO anon USING (true);

-- 3. Read a proposal by token (logs the first view). SECURITY DEFINER so anon
--    can't enumerate proposals — they must hold the token.
CREATE OR REPLACE FUNCTION get_public_proposal(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prop    proposals%ROWTYPE;
  v_contact contacts%ROWTYPE;
  v_company company_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_prop FROM proposals WHERE view_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Proposal not found'); END IF;

  -- Track the view.
  IF v_prop.viewed_at IS NULL THEN
    UPDATE proposals SET viewed_at = now(), view_count = COALESCE(view_count, 0) + 1, status =
      CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
      WHERE id = v_prop.id;
    INSERT INTO activities (contact_id, type, body, metadata)
    VALUES (v_prop.contact_id, 'proposal_viewed', 'Opened their proposal',
            jsonb_build_object('proposal_id', v_prop.id));
  ELSE
    UPDATE proposals SET view_count = COALESCE(view_count, 0) + 1 WHERE id = v_prop.id;
  END IF;

  SELECT * INTO v_contact FROM contacts WHERE id = v_prop.contact_id;
  SELECT * INTO v_company FROM company_settings WHERE id = 1;

  RETURN jsonb_build_object(
    'ok', true,
    'proposal', jsonb_build_object(
      'id', v_prop.id, 'status', v_prop.status, 'intro_text', v_prop.intro_text,
      'payment_terms', v_prop.payment_terms, 'discount_pct', v_prop.discount_pct,
      'valid_until', v_prop.valid_until, 'signer_name', v_prop.signer_name, 'signed_at', v_prop.signed_at),
    'company', jsonb_build_object('name', COALESCE(v_company.company_name, 'RedCube Creative')),
    'contact', jsonb_build_object('first_name', v_contact.first_name, 'last_name', v_contact.last_name)
  );
END;
$$;

-- 4. Accept a proposal: snapshot selections, mark signed, advance the deal.
CREATE OR REPLACE FUNCTION accept_proposal(
  p_token       text,
  p_selections  jsonb,
  p_signer_name text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prop      proposals%ROWTYPE;
  v_sel       jsonb;
  v_i         int := 0;
  v_stage_id  uuid;
BEGIN
  SELECT * INTO v_prop FROM proposals WHERE view_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Proposal not found'); END IF;
  IF v_prop.signed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This proposal was already accepted.');
  END IF;

  -- Replace any prior snapshot, then store the client's selections.
  DELETE FROM proposal_packages WHERE proposal_id = v_prop.id;
  FOR v_sel IN SELECT * FROM jsonb_array_elements(COALESCE(p_selections, '[]'::jsonb)) LOOP
    INSERT INTO proposal_packages (
      proposal_id, package_id, name_snapshot, description_snapshot,
      price_type_snapshot, price_override, addons_snapshot, sort_order)
    VALUES (
      v_prop.id, NULLIF(v_sel->>'package_id', '')::uuid, v_sel->>'name_snapshot',
      v_sel->>'description_snapshot', v_sel->>'price_type_snapshot',
      (v_sel->>'price_override')::numeric, v_sel->'addons_snapshot', v_i);
    v_i := v_i + 1;
  END LOOP;

  UPDATE proposals
    SET status = 'signed', signed_at = now(), signer_name = NULLIF(trim(p_signer_name), '')
    WHERE id = v_prop.id;

  -- Advance the deal to "Contract out".
  IF v_prop.deal_id IS NOT NULL THEN
    SELECT id INTO v_stage_id FROM pipeline_stages WHERE name = 'Contract out' LIMIT 1;
    UPDATE deals SET stage_id = COALESCE(v_stage_id, stage_id), last_activity_at = now()
      WHERE id = v_prop.deal_id;
  END IF;

  INSERT INTO activities (contact_id, type, body, metadata)
  VALUES (v_prop.contact_id, 'proposal_signed',
          'Accepted the proposal' || COALESCE(' — signed by ' || NULLIF(trim(p_signer_name), ''), ''),
          jsonb_build_object('proposal_id', v_prop.id));

  -- Contract creation hook (DocuSign wired in P10).
  INSERT INTO activities (contact_id, type, body, metadata)
  VALUES (v_prop.contact_id, 'system', 'Contract generation queued (DocuSign — pending setup)',
          jsonb_build_object('proposal_id', v_prop.id));

  RETURN jsonb_build_object('ok', true, 'deal_id', v_prop.deal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_proposal(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_proposal(text, jsonb, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
