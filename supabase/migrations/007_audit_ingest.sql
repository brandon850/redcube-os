-- ============================================================
-- 007_audit_ingest.sql
-- Persist a public SEO audit: dedupe the contact, open a deal, store the report.
-- The crawl/score runs server-side (/api/audit); this RPC just records the result,
-- so it's callable by anon with the anon key (SECURITY DEFINER bypasses RLS).
-- Also lets anon READ a stored report (shareable link; id is an unguessable uuid).
-- ============================================================

CREATE POLICY "anon_read_audits" ON audits
  FOR SELECT TO anon
  USING (true);

CREATE OR REPLACE FUNCTION ingest_audit(
  p_email   text,
  p_name    text,
  p_url     text,
  p_result  jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email      text;
  v_first      text;
  v_contact_id uuid;
  v_deal_id    uuid;
  v_audit_id   uuid;
  v_domain     text;
  v_stage_id   uuid;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email is required');
  END IF;

  v_domain := COALESCE(p_result->>'domain', '');
  v_first  := COALESCE(NULLIF(trim(p_name), ''), split_part(v_email, '@', 1));

  SELECT id INTO v_stage_id FROM pipeline_stages ORDER BY position LIMIT 1;

  -- Dedupe contact by email.
  SELECT id INTO v_contact_id FROM contacts WHERE lower(email) = v_email LIMIT 1;
  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (first_name, last_name, email, status, source)
    VALUES (v_first, '', v_email, 'lead', 'SEO Audit')
    RETURNING id INTO v_contact_id;
  END IF;

  -- Reuse an open deal, else create one.
  SELECT id INTO v_deal_id FROM deals WHERE contact_id = v_contact_id AND status = 'open' LIMIT 1;
  IF v_deal_id IS NULL THEN
    INSERT INTO deals (contact_id, stage_id, title, status, last_activity_at)
    VALUES (v_contact_id, v_stage_id, 'SEO Audit — ' || COALESCE(NULLIF(v_domain, ''), v_email), 'open', now())
    RETURNING id INTO v_deal_id;
  END IF;

  INSERT INTO audits (contact_id, deal_id, email, name, url, domain, grade, overall_score, pages_scanned, report_data)
  VALUES (
    v_contact_id, v_deal_id, v_email, NULLIF(trim(p_name), ''), p_url, NULLIF(v_domain, ''),
    p_result->>'grade', (p_result->>'overallScore')::int, (p_result->>'pagesScanned')::int, p_result
  )
  RETURNING id INTO v_audit_id;

  INSERT INTO activities (contact_id, type, body, metadata)
  VALUES (v_contact_id, 'audit_run',
          'Ran SEO audit on ' || COALESCE(NULLIF(v_domain, ''), p_url) || ' — grade ' || COALESCE(p_result->>'grade', '?'),
          jsonb_build_object('audit_id', v_audit_id, 'grade', p_result->>'grade', 'score', p_result->>'overallScore'));

  RETURN jsonb_build_object('ok', true, 'audit_id', v_audit_id);
END;
$$;

GRANT EXECUTE ON FUNCTION ingest_audit(text, text, text, jsonb) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
