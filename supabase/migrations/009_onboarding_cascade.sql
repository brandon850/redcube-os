-- ============================================================
-- 009_onboarding_cascade.sql
-- Onboarding cascade (Phase 4). The DB-side orchestration is real; the external
-- jobs (Stripe / QBO / ClickUp) are logged as 'simulated' until credentials +
-- serverless are wired. Triggered manually from a signed proposal for now
-- (DocuSign's completed webhook will call the same RPC later).
-- ============================================================

-- 1. Default onboarding task template (one active row enforced by the partial index).
INSERT INTO clickup_templates (name, is_active, version, phases)
SELECT 'Standard onboarding', true, 1, $json$[
  { "name": "Kickoff", "tasks": [
    { "name": "Send welcome email & introductions", "role": "account_manager", "due_day_offset": 0, "priority": 2 },
    { "name": "Schedule kickoff call", "role": "account_manager", "due_day_offset": 1, "priority": 2 },
    { "name": "Collect brand assets & logins", "role": "client", "due_day_offset": 3, "priority": 2 }
  ]},
  { "name": "Setup", "tasks": [
    { "name": "Technical SEO audit", "role": "tech_lead", "due_day_offset": 4, "priority": 1 },
    { "name": "Keyword research & targets", "role": "tech_lead", "due_day_offset": 6, "priority": 2 },
    { "name": "Analytics & Search Console access", "role": "client", "due_day_offset": 5, "priority": 2 }
  ]},
  { "name": "Launch", "tasks": [
    { "name": "Deliver 30-day plan", "role": "account_manager", "due_day_offset": 7, "priority": 2 },
    { "name": "First optimizations live", "role": "tech_lead", "due_day_offset": 14, "priority": 3 }
  ]}
]$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM clickup_templates WHERE is_active = true);

-- 2. Cascade orchestration. Real DB work; external jobs simulated for now.
CREATE OR REPLACE FUNCTION run_onboarding(p_deal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal       deals%ROWTYPE;
  v_proposal   proposals%ROWTYPE;
  v_amount     numeric := 0;
  v_invoice_id uuid;
  v_sim_id     text;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Deal not found'); END IF;

  -- Don't double-onboard.
  IF EXISTS (SELECT 1 FROM invoices WHERE deal_id = p_deal_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This deal has already been onboarded.');
  END IF;

  -- Find the signed proposal + its total (base package prices).
  SELECT * INTO v_proposal FROM proposals
    WHERE deal_id = p_deal_id AND signed_at IS NOT NULL
    ORDER BY signed_at DESC LIMIT 1;
  IF FOUND THEN
    SELECT COALESCE(SUM(price_override), 0) INTO v_amount
      FROM proposal_packages WHERE proposal_id = v_proposal.id;
  END IF;
  IF v_amount = 0 THEN v_amount := COALESCE(v_deal.value, 0); END IF;

  -- (Simulated) Stripe invoice. gen_random_uuid() is core (no extension/schema dependency).
  v_sim_id := 'sim_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO invoices (deal_id, contact_id, stripe_invoice_id, status, amount_due, qbo_sync_status)
  VALUES (p_deal_id, v_deal.contact_id, v_sim_id, 'draft', v_amount, 'pending')
  RETURNING id INTO v_invoice_id;

  -- Log each cascade job (simulated until integrations are live).
  INSERT INTO cascade_log (deal_id, job_type, status, external_id, error_message) VALUES
    (p_deal_id, 'stripe',  'simulated', v_sim_id, 'Stripe not connected — invoice recorded locally'),
    (p_deal_id, 'qbo',     'simulated', NULL,     'QuickBooks not connected'),
    (p_deal_id, 'clickup', 'simulated', NULL,     'ClickUp not connected — project would be created from active template');

  -- Real status transitions.
  UPDATE deals SET status = 'won', last_activity_at = now() WHERE id = p_deal_id;
  IF v_deal.contact_id IS NOT NULL THEN
    UPDATE contacts SET status = 'client' WHERE id = v_deal.contact_id;
    INSERT INTO activities (contact_id, type, body, metadata)
    VALUES (v_deal.contact_id, 'onboarding_run',
            'Onboarding cascade ran — invoice drafted, project queued (simulated)',
            jsonb_build_object('deal_id', p_deal_id, 'invoice_id', v_invoice_id, 'amount', v_amount));
  END IF;

  RETURN jsonb_build_object('ok', true, 'invoice_id', v_invoice_id, 'amount', v_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION run_onboarding(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
