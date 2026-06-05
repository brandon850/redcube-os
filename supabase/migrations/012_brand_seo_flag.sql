-- ============================================================
-- 012_brand_seo_flag.sql
-- Per-brand capability: SEO (Attract audits + Deliver managed sites/reports).
-- On for RedCube, off for sell-only brands like For Collective.
-- ============================================================

ALTER TABLE brands ADD COLUMN IF NOT EXISTS seo_enabled boolean NOT NULL DEFAULT true;

UPDATE brands SET seo_enabled = false WHERE slug = 'for-collective';

NOTIFY pgrst, 'reload schema';
