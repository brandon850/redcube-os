-- ============================================================
-- 002_seed_catalog.sql
-- Seeds RedCube's real service catalog (services → packages →
-- line items + column add-ons, and service-level shared add-ons).
-- Ported from the proposal configurator's fallback catalog.
-- Idempotent-ish: safe to run once on a fresh database.
-- ============================================================

DO $$
DECLARE
  svc_web   uuid;
  svc_video uuid;
  svc_photo uuid;
  pkg       uuid;
BEGIN

  -- ─── SERVICE: WEB DESIGN ──────────────────────────────────────────────────
  INSERT INTO services (name, emoji, icon_bg, icon_color, sort_order)
  VALUES ('Web Design', '🌐', '#1a2535', '#6aabea', 1)
  RETURNING id INTO svc_web;

  -- Option A — Standard Website
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, sort_order)
  VALUES (svc_web, 'Standard Website', 'Option A', 'Everything you need to get online and growing.', 295, 'monthly', false, 1)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    'Full website rebuild (up to 12 pages)',
    'Mobile-first responsive design',
    'Core SEO foundation + Analytics',
    'Managed hosting, SSL, CDN',
    'Security monitoring + backups',
    '1 content update/month'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order)
  VALUES (pkg, 'Extra update/month', 100, 'monthly', 1);

  -- Option B — Premium w/ Local SEO
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, sort_order)
  VALUES (svc_web, 'Premium w/ Local SEO', 'Option B', 'Dominate local search results in your city.', 795, 'monthly', false, 2)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    'Everything in Standard Website',
    'Local SEO strategy + city pages',
    'Google Business Profile setup',
    'Keyword strategy + rank tracking',
    'Monthly SEO report',
    'Unlimited content updates'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order)
  VALUES (pkg, 'Blog content (2 posts/mo)', 200, 'monthly', 1);

  -- Option C — Premium w/ Regional SEO (featured)
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, is_popular, sort_order)
  VALUES (svc_web, 'Premium w/ Regional SEO', 'Option C', 'Multi-city reach with a full content engine.', 1195, 'monthly', true, true, 3)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    'Everything in Local SEO',
    'Multi-city regional targeting',
    'Content strategy + 3 blog posts/mo',
    'Backlink outreach (10 links/mo)',
    'Unlimited content updates'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order)
  VALUES (pkg, 'Extra blog content (2 posts/mo)', 300, 'monthly', 1);

  -- Web shared add-ons
  INSERT INTO service_addons (service_id, name, description, price, price_type, sort_order) VALUES
    (svc_web, 'E-commerce store',      'Full WooCommerce or Shopify storefront integration.', 150, 'monthly',  1),
    (svc_web, 'Booking system',        'Online appointment scheduling with calendar sync.',    75, 'monthly',  2),
    (svc_web, 'Copywriting (per page)','Professional on-brand copy written for you.',          400, 'one_time', 3),
    (svc_web, 'Logo refresh',          'Refined logomark and brand colour palette update.',    200, 'one_time', 4);

  -- ─── SERVICE: VIDEO PRODUCTION ────────────────────────────────────────────
  INSERT INTO services (name, emoji, icon_bg, icon_color, sort_order)
  VALUES ('Video Production', '🎬', '#1e1a30', '#9d98e8', 2)
  RETURNING id INTO svc_video;

  -- Good — Essential
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, sort_order)
  VALUES (svc_video, 'Essential', 'Good', 'A polished brand story to kick off your video presence.', 2500, 'one_time', false, 1)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    '1 brand video (up to 90 sec)',
    '2 rounds of revisions',
    'Raw footage delivery',
    '1 social media cut (vertical)'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order) VALUES
    (pkg, 'Extra revision round', 250, 'one_time', 1),
    (pkg, '2 extra social cuts',  300, 'one_time', 2);

  -- Better — Professional
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, sort_order)
  VALUES (svc_video, 'Professional', 'Better', 'Multi-video storytelling with motion graphics and music.', 5500, 'one_time', false, 2)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    '2 brand videos (up to 90 sec ea.)',
    'Motion graphics / lower thirds',
    '3 rounds of revisions',
    '3 social media cuts',
    'Music licensing included'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order) VALUES
    (pkg, 'Behind-the-scenes reel', 400, 'one_time', 1),
    (pkg, 'Extra social cut',       150, 'one_time', 2);

  -- Best — Premium (featured)
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, is_popular, sort_order)
  VALUES (svc_video, 'Premium', 'Best', 'The full cinematic treatment with unlimited revisions.', 9500, 'one_time', true, true, 3)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    '3 brand videos (up to 90 sec ea.)',
    'Full motion graphics package',
    'Unlimited revisions (in scope)',
    '6 social media cuts + 1 filming day'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order) VALUES
    (pkg, 'Additional filming day', 800, 'one_time', 1),
    (pkg, 'Drone footage',          600, 'one_time', 2);

  -- Video shared add-ons
  INSERT INTO service_addons (service_id, name, description, price, price_type, sort_order) VALUES
    (svc_video, 'Testimonial video edit',  'Edit client testimonial footage into a polished 60-sec video.', 400, 'one_time', 1),
    (svc_video, 'Event recap video',       'Highlight reel from your event, up to 2 minutes.',              500, 'one_time', 2),
    (svc_video, 'Product demo video',      'Clean walkthrough of a product or service.',                    350, 'one_time', 3),
    (svc_video, 'Instagram Reel pack (5)', '5 short-form vertical reels optimised for Instagram/TikTok.',    300, 'one_time', 4);

  -- ─── SERVICE: PHOTOGRAPHY ─────────────────────────────────────────────────
  INSERT INTO services (name, emoji, icon_bg, icon_color, sort_order)
  VALUES ('Photography', '📷', '#1a2520', '#5dca8a', 3)
  RETURNING id INTO svc_photo;

  -- Good — Half-Day Session
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, sort_order)
  VALUES (svc_photo, 'Half-Day Session', 'Good', 'Essential imagery for your brand, delivered fast.', 800, 'one_time', false, 1)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    'Up to 3 hrs on-site',
    '40 edited images delivered',
    'Online gallery + download',
    '7-day turnaround'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order) VALUES
    (pkg, 'Rush 48-hr delivery',     150, 'one_time', 1),
    (pkg, '20 extra edited images',  100, 'one_time', 2);

  -- Better — Full-Day Session
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, sort_order)
  VALUES (svc_photo, 'Full-Day Session', 'Better', 'A full day of shooting across multiple looks and locations.', 1500, 'one_time', false, 2)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    'Up to 6 hrs on-site',
    '80 edited images delivered',
    'Multiple locations/setups',
    'Online gallery + download',
    '7-day turnaround'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order) VALUES
    (pkg, 'Rush 48-hr delivery',     150, 'one_time', 1),
    (pkg, '20 extra edited images',  100, 'one_time', 2);

  -- Best — Brand Photography Suite (featured)
  INSERT INTO packages (service_id, name, tier, tagline, base_price, price_type, featured, is_popular, sort_order)
  VALUES (svc_photo, 'Brand Photography Suite', 'Best', 'Two days. 150+ images. Your brand, fully captured.', 2800, 'one_time', true, true, 3)
  RETURNING id INTO pkg;
  INSERT INTO package_line_items (package_id, description, sort_order)
  SELECT pkg, d, ord FROM unnest(ARRAY[
    '2-day shoot (up to 10 hrs)',
    '150+ edited images delivered',
    'Headshots + team + product',
    'Lifestyle / behind-the-scenes',
    'Online gallery + download'
  ]) WITH ORDINALITY AS t(d, ord);
  INSERT INTO package_addons (package_id, name, price, price_type, sort_order) VALUES
    (pkg, 'Aerial/drone photos',      300, 'one_time', 1),
    (pkg, 'Additional team member',   200, 'one_time', 2);

  -- Photography shared add-ons
  INSERT INTO service_addons (service_id, name, description, price, price_type, sort_order) VALUES
    (svc_photo, 'Executive headshots',      'Individual session with 10 edited headshot deliverables.', 250, 'one_time', 1),
    (svc_photo, 'Product photography',      'Studio or lifestyle product shots (up to 10 SKUs).',       450, 'one_time', 2),
    (svc_photo, 'Real estate photography',  'Interior + exterior shoot with HDR editing.',              350, 'one_time', 3),
    (svc_photo, 'Social media sizing pack', 'All images exported and sized for every major platform.',  180, 'one_time', 4);

END $$;
