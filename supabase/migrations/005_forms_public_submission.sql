-- ============================================================
-- 005_forms_public_submission.sql
-- Public lead-capture ingestion.
--   1. Let anonymous visitors READ active forms (to render them).
--   2. A SECURITY DEFINER RPC `submit_form` that dedupes the contact,
--      opens a deal, and records the submission + activity — callable by anon
--      without granting anon direct write access to the tables.
-- ============================================================

-- 1. Anon can read active forms only (needed to render the public form).
DROP POLICY IF EXISTS "anon_read_active_forms" ON forms;
CREATE POLICY "anon_read_active_forms" ON forms
  FOR SELECT TO anon
  USING (is_active = true);

-- 2. Ingestion RPC.
CREATE OR REPLACE FUNCTION submit_form(
  p_token     text,
  p_data      jsonb,
  p_utm       jsonb DEFAULT '{}'::jsonb,
  p_page_url  text DEFAULT NULL,
  p_referrer  text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form        forms%ROWTYPE;
  v_settings    jsonb;
  v_email       text;
  v_name        text;
  v_first       text;
  v_last        text;
  v_phone       text;
  v_contact_id  uuid;
  v_assign      uuid;
  v_stage_id    uuid;
  v_has_deal    boolean;
BEGIN
  SELECT * INTO v_form FROM forms WHERE embed_token = p_token AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Form not found');
  END IF;

  v_settings := COALESCE(v_form.settings, '{}'::jsonb);

  -- Honeypot: pretend success, insert nothing.
  IF COALESCE((v_settings->>'honeypot')::boolean, false)
     AND COALESCE(p_data->>'_hp', '') <> '' THEN
    RETURN jsonb_build_object('ok', true, 'message', COALESCE(v_settings->>'success_message', 'Thanks!'));
  END IF;

  v_email := lower(trim(COALESCE(p_data->>'email', '')));
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email is required');
  END IF;

  v_name  := COALESCE(p_data->>'name', trim(concat_ws(' ', p_data->>'first_name', p_data->>'last_name')));
  v_first := COALESCE(p_data->>'first_name', split_part(v_name, ' ', 1), '');
  v_last  := COALESCE(p_data->>'last_name', NULLIF(trim(substr(v_name, length(split_part(v_name, ' ', 1)) + 1)), ''), '');
  v_phone := NULLIF(trim(COALESCE(p_data->>'phone', '')), '');

  v_assign   := NULLIF(v_settings->>'assign_to', 'round_robin')::uuid; -- round_robin → null for now
  v_stage_id := (v_settings->>'stage_id')::uuid;
  IF v_stage_id IS NULL THEN
    SELECT id INTO v_stage_id FROM pipeline_stages ORDER BY position LIMIT 1;
  END IF;

  -- Dedupe contact by email.
  SELECT id INTO v_contact_id FROM contacts WHERE lower(email) = v_email LIMIT 1;
  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (first_name, last_name, email, phone, status, source, assigned_to)
    VALUES (COALESCE(NULLIF(v_first, ''), 'Lead'), COALESCE(v_last, ''), v_email, v_phone,
            'lead', COALESCE(p_utm->>'utm_source', 'form'), v_assign)
    RETURNING id INTO v_contact_id;
  ELSE
    -- Fill in phone if newly provided; keep original source.
    UPDATE contacts SET phone = COALESCE(phone, v_phone) WHERE id = v_contact_id;
  END IF;

  -- Create a deal if the contact has no open one.
  SELECT EXISTS (SELECT 1 FROM deals WHERE contact_id = v_contact_id AND status = 'open') INTO v_has_deal;
  IF NOT v_has_deal THEN
    INSERT INTO deals (contact_id, stage_id, title, status, last_activity_at)
    VALUES (v_contact_id, v_stage_id, 'Lead — ' || COALESCE(NULLIF(v_name, ''), v_email), 'open', now());
  END IF;

  -- Record the submission and a timeline activity.
  INSERT INTO form_submissions (form_id, contact_id, data, utm_source, utm_medium, utm_campaign, page_url, referrer)
  VALUES (v_form.id, v_contact_id, p_data,
          p_utm->>'utm_source', p_utm->>'utm_medium', p_utm->>'utm_campaign', p_page_url, p_referrer);

  INSERT INTO activities (contact_id, type, body, metadata)
  VALUES (v_contact_id, 'form_submission', 'Submitted form: ' || v_form.name,
          jsonb_build_object('form_id', v_form.id, 'form_name', v_form.name));

  RETURN jsonb_build_object('ok', true, 'message', COALESCE(v_settings->>'success_message', 'Thanks!'));
END;
$$;

-- anon (public visitors) and authenticated users may call the ingestion function.
GRANT EXECUTE ON FUNCTION submit_form(text, jsonb, jsonb, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
