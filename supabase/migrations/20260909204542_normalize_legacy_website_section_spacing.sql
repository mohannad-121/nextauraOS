-- Older Website Agent drafts used bounded spacing preset names. Keep those
-- persisted presentation tokens valid while retaining strict numeric bounds
-- for current padding values and rejecting arbitrary CSS strings.
CREATE OR REPLACE FUNCTION public.validate_website_agent_edit_section(p_section jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_type text;
  v_key text;
  v_allowed_props text[];
  v_allowed_styles constant text[] := ARRAY[
    'backgroundColor', 'textColor', 'paddingY', 'alignment', 'preset',
    'background', 'cardStyle', 'animation', 'animationDelayPreset'
  ];
  v_items jsonb;
  v_item_limit integer;
BEGIN
  IF pg_catalog.jsonb_typeof(p_section) <> 'object'
    OR NOT (p_section ? 'id' AND p_section ? 'type' AND p_section ? 'props' AND p_section ? 'style')
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_section)) <> 4
    OR COALESCE(p_section->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR pg_catalog.jsonb_typeof(p_section->'props') <> 'object'
    OR pg_catalog.jsonb_typeof(p_section->'style') <> 'object'
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_section->'props')) > 40
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_section->'style')) > 40
    OR pg_catalog.octet_length(p_section::text) > 16384
    OR p_section::text ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe|expression\s*\('
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;

  v_type := p_section->>'type';
  IF NOT (v_type = ANY (ARRAY[
    'hero', 'text', 'image', 'button_group', 'spacer', 'features', 'services',
    'testimonials', 'pricing', 'faq', 'contact', 'gallery', 'stats', 'team'
  ])) THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;

  v_allowed_props := CASE v_type
    WHEN 'hero' THEN ARRAY['eyebrow','heading','subheading','primaryLabel','primaryUrl','secondaryLabel','secondaryUrl','alignment','minHeight','backgroundAssetId','sideAssetId','overlayOpacity','imageFit','imageIntent']
    WHEN 'text' THEN ARRAY['heading','body','alignment','maxWidth']
    WHEN 'image' THEN ARRAY['assetId','url','alt','width','alignment','radius','fit']
    WHEN 'button_group' THEN ARRAY['heading','buttons']
    WHEN 'spacer' THEN ARRAY['desktop','tablet','mobile']
    WHEN 'features' THEN ARRAY['eyebrow','heading','subheading','layout','columns','items']
    WHEN 'services' THEN ARRAY['heading','layout','columns','items']
    WHEN 'testimonials' THEN ARRAY['heading','layout','columns','items']
    WHEN 'pricing' THEN ARRAY['heading','layout','items']
    WHEN 'faq' THEN ARRAY['heading','layout','items']
    WHEN 'contact' THEN ARRAY['heading','text','phone','email','address','mapUrl','showForm']
    WHEN 'gallery' THEN ARRAY['heading','layout','columns','images','items']
    WHEN 'stats' THEN ARRAY['heading','layout','items']
    WHEN 'team' THEN ARRAY['heading','layout','columns','items']
  END;

  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_section->'props') AS key LOOP
    IF NOT (v_key = ANY(v_allowed_props)) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  END LOOP;
  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_section->'style') AS key LOOP
    IF NOT (v_key = ANY(v_allowed_styles)) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  END LOOP;

  IF p_section->'style' ? 'preset' AND NOT (p_section->'style'->>'preset' = ANY (ARRAY['minimal','centered-editorial','split-image','icon-cards','bordered-grid','editorial-list','image-cards','large-quote','inline-strip','featured-grid']))
    OR p_section->'style' ? 'background' AND NOT (p_section->'style'->>'background' = ANY (ARRAY['solid','soft','contrast','accent','gradient','split']))
    OR p_section->'style' ? 'cardStyle' AND NOT (p_section->'style'->>'cardStyle' = ANY (ARRAY['flat','bordered','elevated','glass']))
    OR p_section->'style' ? 'animation' AND NOT (p_section->'style'->>'animation' = ANY (ARRAY['none','fade-up','fade-in','slide-left','slide-right','scale-in']))
    OR p_section->'style' ? 'animationDelayPreset' AND NOT (p_section->'style'->>'animationDelayPreset' = ANY (ARRAY['none','short','medium']))
    OR p_section->'style' ? 'alignment' AND NOT (p_section->'style'->>'alignment' = ANY (ARRAY['left','center','right']))
    OR p_section->'style' ? 'backgroundColor' AND p_section->'style'->>'backgroundColor' !~* '^#[0-9a-f]{6}$'
    OR p_section->'style' ? 'textColor' AND p_section->'style'->>'textColor' !~* '^#[0-9a-f]{6}$'
    OR p_section->'style' ? 'paddingY' AND NOT (
      pg_catalog.jsonb_typeof(p_section->'style'->'paddingY') = 'number'
        AND (p_section->'style'->>'paddingY')::numeric BETWEEN 0 AND 240
      OR pg_catalog.jsonb_typeof(p_section->'style'->'paddingY') = 'string'
        AND p_section->'style'->>'paddingY' = ANY (ARRAY['small','medium','large'])
    )
    OR p_section->'props' ? 'backgroundAssetId' AND p_section->'props'->'backgroundAssetId' <> 'null'::jsonb AND (
      pg_catalog.jsonb_typeof(p_section->'props'->'backgroundAssetId') <> 'string'
      OR p_section->'props'->>'backgroundAssetId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
    OR p_section->'props' ? 'sideAssetId' AND p_section->'props'->'sideAssetId' <> 'null'::jsonb AND (
      pg_catalog.jsonb_typeof(p_section->'props'->'sideAssetId') <> 'string'
      OR p_section->'props'->>'sideAssetId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
    OR p_section->'props' ? 'assetId' AND p_section->'props'->'assetId' <> 'null'::jsonb AND (
      pg_catalog.jsonb_typeof(p_section->'props'->'assetId') <> 'string'
      OR p_section->'props'->>'assetId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;

  v_items := CASE
    WHEN v_type = 'gallery' THEN COALESCE(p_section->'props'->'images', p_section->'props'->'items')
    ELSE p_section->'props'->'items'
  END;
  v_item_limit := CASE v_type WHEN 'features' THEN 12 WHEN 'services' THEN 12 WHEN 'testimonials' THEN 12 WHEN 'pricing' THEN 4 WHEN 'faq' THEN 20 WHEN 'gallery' THEN 24 WHEN 'stats' THEN 8 WHEN 'team' THEN 16 ELSE NULL END;
  IF v_items IS NOT NULL AND (
    pg_catalog.jsonb_typeof(v_items) <> 'array'
    OR (v_item_limit IS NOT NULL AND pg_catalog.jsonb_array_length(v_items) > v_item_limit)
  ) THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_website_agent_edit_section(jsonb)
FROM PUBLIC, anon, authenticated;

-- Global header/footer records from the same generator use the same bounded
-- visual tokens. Preserve those values during copy-only language edits.
CREATE OR REPLACE FUNCTION public.validate_website_agent_global_section(
  p_section jsonb,
  p_expected_type text
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_key text;
  v_allowed_props text[];
  v_allowed_styles constant text[] := ARRAY[
    'backgroundColor','textColor','transparent','variant','paddingY','preset',
    'background','cardStyle','animation','animationDelayPreset'
  ];
  v_logo_id text;
  v_cta_url text;
BEGIN
  IF NOT (p_expected_type = ANY(ARRAY['header','footer']))
    OR pg_catalog.jsonb_typeof(p_section) <> 'object'
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_section)) <> 4
    OR NOT (p_section ? 'id' AND p_section ? 'type' AND p_section ? 'props' AND p_section ? 'style')
    OR p_section->>'type' <> p_expected_type
    OR COALESCE(p_section->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR pg_catalog.jsonb_typeof(p_section->'props') <> 'object'
    OR pg_catalog.jsonb_typeof(p_section->'style') <> 'object'
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_section->'props')) > 10
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_section->'style')) > 10
    OR pg_catalog.octet_length(p_section::text) > 16384
    OR p_section::text ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe|data:text\/html|expression\s*\('
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION';
  END IF;

  v_allowed_props := CASE p_expected_type
    WHEN 'header' THEN ARRAY['siteName','logoAssetId','ctaLabel','ctaUrl','sticky','variant','mobileOpen']
    ELSE ARRAY['siteName','logoAssetId','description','copyright','variant','socialLinks']
  END;
  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_section->'props') AS keys(key) LOOP
    IF NOT (v_key = ANY(v_allowed_props)) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION'; END IF;
  END LOOP;
  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_section->'style') AS keys(key) LOOP
    IF NOT (v_key = ANY(v_allowed_styles)) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION'; END IF;
  END LOOP;

  IF p_section->'props' ? 'siteName' AND (
      pg_catalog.jsonb_typeof(p_section->'props'->'siteName') <> 'string'
      OR pg_catalog.length(pg_catalog.btrim(p_section->'props'->>'siteName')) NOT BETWEEN 1 AND 120
    )
    OR p_section->'props' ? 'logoAssetId' AND p_section->'props'->'logoAssetId' <> 'null'::jsonb
      AND (pg_catalog.jsonb_typeof(p_section->'props'->'logoAssetId') <> 'string'
        OR p_section->'props'->>'logoAssetId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    OR p_section->'style' ? 'backgroundColor' AND (pg_catalog.jsonb_typeof(p_section->'style'->'backgroundColor') <> 'string' OR p_section->'style'->>'backgroundColor' !~* '^#[0-9a-f]{6}$')
    OR p_section->'style' ? 'textColor' AND (pg_catalog.jsonb_typeof(p_section->'style'->'textColor') <> 'string' OR p_section->'style'->>'textColor' !~* '^#[0-9a-f]{6}$')
    OR p_section->'style' ? 'transparent' AND pg_catalog.jsonb_typeof(p_section->'style'->'transparent') <> 'boolean'
    OR p_section->'style' ? 'preset' AND NOT (p_section->'style'->>'preset' = ANY (ARRAY['minimal','centered-editorial','split-image','icon-cards','bordered-grid','editorial-list','image-cards','large-quote','inline-strip','featured-grid']))
    OR p_section->'style' ? 'background' AND NOT (p_section->'style'->>'background' = ANY (ARRAY['solid','soft','contrast','accent','gradient','split']))
    OR p_section->'style' ? 'cardStyle' AND NOT (p_section->'style'->>'cardStyle' = ANY (ARRAY['flat','bordered','elevated','glass']))
    OR p_section->'style' ? 'animation' AND NOT (p_section->'style'->>'animation' = ANY (ARRAY['none','fade-up','fade-in','slide-left','slide-right','scale-in']))
    OR p_section->'style' ? 'animationDelayPreset' AND NOT (p_section->'style'->>'animationDelayPreset' = ANY (ARRAY['none','short','medium']))
    OR p_section->'style' ? 'paddingY' AND NOT (
      pg_catalog.jsonb_typeof(p_section->'style'->'paddingY') = 'number'
        AND (p_section->'style'->>'paddingY')::numeric BETWEEN 0 AND 240
      OR pg_catalog.jsonb_typeof(p_section->'style'->'paddingY') = 'string'
        AND p_section->'style'->>'paddingY' = ANY (ARRAY['small','medium','large'])
    )
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION';
  END IF;

  IF p_expected_type = 'header' THEN
    IF p_section->'props' ? 'ctaLabel' AND (pg_catalog.jsonb_typeof(p_section->'props'->'ctaLabel') <> 'string' OR pg_catalog.length(p_section->'props'->>'ctaLabel') > 80)
      OR p_section->'props' ? 'sticky' AND pg_catalog.jsonb_typeof(p_section->'props'->'sticky') <> 'boolean'
      OR p_section->'props' ? 'mobileOpen' AND pg_catalog.jsonb_typeof(p_section->'props'->'mobileOpen') <> 'boolean'
      OR p_section->'props' ? 'variant' AND p_section->'props'->>'variant' <> 'logo-left'
      OR p_section->'style' ? 'variant' AND p_section->'style'->>'variant' <> 'logo-left'
    THEN RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION'; END IF;
    v_cta_url := p_section->'props'->>'ctaUrl';
    IF v_cta_url IS NOT NULL AND (
      pg_catalog.length(v_cta_url) > 2048
      OR v_cta_url !~* '^(#[^[:space:]]*|/[a-z0-9/_#?&=.%+-]*|https://[^[:space:]]+|mailto:[^[:space:]]+|tel:[+0-9() .-]+)$'
    ) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION'; END IF;
  ELSE
    IF p_section->'props' ? 'description' AND (pg_catalog.jsonb_typeof(p_section->'props'->'description') <> 'string' OR pg_catalog.length(p_section->'props'->>'description') > 1000)
      OR p_section->'props' ? 'copyright' AND (pg_catalog.jsonb_typeof(p_section->'props'->'copyright') <> 'string' OR pg_catalog.length(p_section->'props'->>'copyright') > 200)
      OR p_section->'props' ? 'variant' AND p_section->'props'->>'variant' <> 'columns'
      OR p_section->'style' ? 'variant' AND p_section->'style'->>'variant' <> 'columns'
      OR p_section->'props' ? 'socialLinks' AND (pg_catalog.jsonb_typeof(p_section->'props'->'socialLinks') <> 'array' OR pg_catalog.jsonb_array_length(p_section->'props'->'socialLinks') <> 0)
    THEN RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION'; END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_website_agent_global_section(jsonb, text)
FROM PUBLIC, anon, authenticated;
