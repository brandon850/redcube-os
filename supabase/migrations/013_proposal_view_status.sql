-- ============================================================
-- 013_proposal_view_status.sql
-- Lifecycle fix: if a proposal is opened by the client but was never manually
-- "marked as sent", advance it from draft → viewed (previously only sent → viewed).
-- Signing already sets 'signed' unconditionally in accept_proposal, so this just
-- keeps the in-between status honest when the send step is skipped.
-- ============================================================

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
      status = CASE WHEN status IN ('draft', 'sent') THEN 'viewed' ELSE status END
      WHERE id = v_prop.id;
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

NOTIFY pgrst, 'reload schema';
