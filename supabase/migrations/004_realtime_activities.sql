-- ============================================================
-- 004_realtime_activities.sql
-- Enable Supabase Realtime for the activities table so the contact timeline
-- updates live across clients and when automation inserts activities.
-- Optional now (own-user actions refetch on save); recommended before Phase 4.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE activities;
