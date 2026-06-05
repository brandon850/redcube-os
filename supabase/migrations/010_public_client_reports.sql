-- ============================================================
-- 010_public_client_reports.sql
-- Client reports are shareable via an unguessable id (like audits/proposals).
-- The report stores a self-contained snapshot in report_data, so the public
-- page needs no other table access.
-- ============================================================

CREATE POLICY "anon_read_client_reports" ON client_reports
  FOR SELECT TO anon
  USING (true);

NOTIFY pgrst, 'reload schema';
