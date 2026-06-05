-- ============================================================
-- 003_user_fks_to_public_users.sql
-- Re-point user-referencing FKs from auth.users → public.users so PostgREST
-- can embed the related user (assignee / activity actor / proposal creator).
-- public.users.id IS auth.users.id (1:1, created on first login), so this
-- preserves integrity. Safe to run on the existing database.
-- ============================================================

ALTER TABLE contacts  DROP CONSTRAINT IF EXISTS contacts_assigned_to_fkey;
ALTER TABLE contacts
  ADD CONSTRAINT contacts_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_user_id_fkey;
ALTER TABLE activities
  ADD CONSTRAINT activities_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_created_by_fkey;
ALTER TABLE proposals
  ADD CONSTRAINT proposals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Tell PostgREST to refresh its relationship cache immediately.
NOTIFY pgrst, 'reload schema';
