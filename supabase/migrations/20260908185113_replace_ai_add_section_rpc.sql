CREATE OR REPLACE FUNCTION public.apply_website_agent_edit_plan(
  p_plan_id uuid,
  p_organization_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan public.website_agent_edit_plans;
  v_site public.website_sites;
  v_page public.website_pages;
  v_operation jsonb;
  v_section jsonb;
  v_document jsonb;
  v_sections jsonb;
  v_section_count integer;
  v_insert_index integer;
  v_next_version integer;
  v_section_id uuid;
  v_allowed_props text[];
  v_allowed_styles constant text[] := ARRAY[
    'backgroundColor', 'textColor', 'paddingY', 'alignment', 'preset',
    'background', 'cardStyle', 'animation', 'animationDelayPreset'
  ];
  v_key text;
BEGIN
  SELECT *
  INTO v_plan
  FROM public.website_agent_edit_plans
  WHERE id = p_plan_id
    AND organization_id = p_organization_id
    AND created_by = p_actor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND';
  END IF;
  IF v_plan.status = 'applied' THEN
    RAISE EXCEPTION 'AI_EDIT_ALREADY_APPLIED';
  END IF;
  IF v_plan.status <> 'generated' THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;
  IF v_plan.expires_at <= pg_catalog.now() THEN
    UPDATE public.website_agent_edit_plans
    SET status = 'expired'
    WHERE id = v_plan.id;
    RAISE EXCEPTION 'AI_EDIT_EXPIRED';
  END IF;

  SELECT *
  INTO v_site
  FROM public.website_sites
  WHERE id = v_plan.site_id
    AND organization_id = p_organization_id
    AND archived_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_actor_id
      AND status = 'Active'
      AND role IN ('Owner', 'Admin')
  ) THEN
    RAISE EXCEPTION 'AI_EDIT_CROSS_TENANT';
  END IF;

  IF pg_catalog.jsonb_typeof(v_plan.plan_json) <> 'object'
    OR v_plan.plan_json->>'version' <> '1'
    OR pg_catalog.jsonb_typeof(v_plan.plan_json->'operations') <> 'array'
    OR pg_catalog.jsonb_array_length(v_plan.plan_json->'operations') <> 1
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_object_keys(v_plan.plan_json) AS key
      WHERE key NOT IN ('version', 'summary', 'operations')
    )
    OR pg_catalog.length(pg_catalog.btrim(COALESCE(v_plan.plan_json->>'summary', ''))) NOT BETWEEN 1 AND 500
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;

  v_operation := v_plan.plan_json->'operations'->0;
  IF pg_catalog.jsonb_typeof(v_operation) <> 'object'
    OR v_operation->>'op' <> 'add_section'
  THEN
    RAISE EXCEPTION 'AI_EDIT_UNSUPPORTED_OPERATION';
  END IF;
  IF NOT (v_operation ? 'pageId' AND v_operation ? 'index' AND v_operation ? 'section')
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4
    OR COALESCE(v_operation->>'pageId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;

  SELECT *
  INTO v_page
  FROM public.website_pages
  WHERE id = (v_operation->>'pageId')::uuid
    AND site_id = v_site.id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND';
  END IF;
  IF (v_plan.base_versions->'pages'->>v_page.id::text) IS DISTINCT FROM v_page.draft_version::text
    OR (
      v_plan.base_versions ? 'global_version'
      AND (v_plan.base_versions->>'global_version')::integer <> v_site.global_version
    )
  THEN
    RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL';
  END IF;

  v_section := v_operation->'section';
  IF pg_catalog.jsonb_typeof(v_section) <> 'object'
    OR v_section ? 'id'
    OR NOT (v_section ? 'type' AND v_section ? 'props' AND v_section ? 'style')
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_section)) <> 3
    OR v_section->>'type' <> ALL (ARRAY[
      'hero', 'text', 'image', 'button_group', 'spacer', 'features', 'services',
      'testimonials', 'pricing', 'faq', 'contact', 'gallery', 'stats', 'team'
    ])
    OR pg_catalog.jsonb_typeof(v_section->'props') <> 'object'
    OR pg_catalog.jsonb_typeof(v_section->'style') <> 'object'
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_section->'props')) > 40
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_section->'style')) > 40
    OR pg_catalog.octet_length(v_section::text) > 16384
    OR v_section::text ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe|expression\s*\('
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;

  v_allowed_props := CASE v_section->>'type'
    WHEN 'hero' THEN ARRAY['eyebrow','heading','subheading','primaryLabel','primaryUrl','secondaryLabel','secondaryUrl','alignment','minHeight','overlayOpacity','imageFit','imageIntent']
    WHEN 'text' THEN ARRAY['heading','body','alignment','maxWidth']
    WHEN 'image' THEN ARRAY['assetId','url','alt','width','alignment','radius','fit']
    WHEN 'button_group' THEN ARRAY['heading','buttons']
    WHEN 'spacer' THEN ARRAY['desktop','tablet','mobile']
    WHEN 'features' THEN ARRAY['eyebrow','heading','subheading','layout','columns','items']
    WHEN 'services' THEN ARRAY['heading','layout','columns','items']
    WHEN 'testimonials' THEN ARRAY['heading','layout','columns','items']
    WHEN 'pricing' THEN ARRAY['heading','layout','items']
    WHEN 'faq' THEN ARRAY['heading','layout','items']
    WHEN 'contact' THEN ARRAY['heading','text','phone','email','address','showForm']
    WHEN 'gallery' THEN ARRAY['heading','layout','columns','images']
    WHEN 'stats' THEN ARRAY['heading','layout','items']
    WHEN 'team' THEN ARRAY['heading','layout','columns','items']
  END;

  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(v_section->'props') AS key LOOP
    IF NOT (v_key = ANY(v_allowed_props)) THEN
      RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
    END IF;
  END LOOP;
  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(v_section->'style') AS key LOOP
    IF NOT (v_key = ANY(v_allowed_styles)) THEN
      RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
    END IF;
  END LOOP;

  IF v_section->'style' ? 'preset' AND v_section->'style'->>'preset' <> ALL (ARRAY['minimal','centered-editorial','split-image','icon-cards','bordered-grid','editorial-list','image-cards','large-quote','inline-strip','featured-grid'])
    OR v_section->'style' ? 'background' AND v_section->'style'->>'background' <> ALL (ARRAY['solid','soft','contrast','accent','gradient','split'])
    OR v_section->'style' ? 'cardStyle' AND v_section->'style'->>'cardStyle' <> ALL (ARRAY['flat','bordered','elevated','glass'])
    OR v_section->'style' ? 'animation' AND v_section->'style'->>'animation' <> ALL (ARRAY['none','fade-up','fade-in','slide-left','slide-right','scale-in'])
    OR v_section->'style' ? 'animationDelayPreset' AND v_section->'style'->>'animationDelayPreset' <> ALL (ARRAY['none','short','medium'])
    OR v_section->'style' ? 'backgroundColor' AND v_section->'style'->>'backgroundColor' !~* '^#[0-9a-f]{6}$'
    OR v_section->'style' ? 'textColor' AND v_section->'style'->>'textColor' !~* '^#[0-9a-f]{6}$'
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;

  v_document := v_page.draft_document;
  IF pg_catalog.jsonb_typeof(v_document) <> 'object'
    OR pg_catalog.jsonb_typeof(v_document->'sections') <> 'array'
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;
  v_section_count := pg_catalog.jsonb_array_length(v_document->'sections');
  IF v_section_count >= 100 THEN
    RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT';
  END IF;
  IF pg_catalog.jsonb_typeof(v_operation->'index') <> 'number'
    OR (v_operation->>'index') !~ '^[0-9]+$'
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;
  v_insert_index := (v_operation->>'index')::integer;
  IF v_insert_index < 0 OR v_insert_index > v_section_count THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;

  v_section_id := extensions.gen_random_uuid();
  v_section := pg_catalog.jsonb_build_object(
    'id', v_section_id::text,
    'type', v_section->'type',
    'props', v_section->'props',
    'style', v_section->'style'
  );
  SELECT COALESCE(pg_catalog.jsonb_agg(item ORDER BY position), '[]'::jsonb)
  INTO v_sections
  FROM (
    SELECT value AS item, ordinal::numeric AS position
    FROM pg_catalog.jsonb_array_elements(v_document->'sections') WITH ORDINALITY AS existing(value, ordinal)
    WHERE ordinal <= v_insert_index
    UNION ALL
    SELECT v_section, v_insert_index::numeric + 0.5
    UNION ALL
    SELECT value, ordinal::numeric
    FROM pg_catalog.jsonb_array_elements(v_document->'sections') WITH ORDINALITY AS existing(value, ordinal)
    WHERE ordinal > v_insert_index
  ) AS ordered_sections;
  v_document := pg_catalog.jsonb_set(v_document, '{sections}', v_sections, false);
  v_next_version := v_page.draft_version + 1;

  UPDATE public.website_pages
  SET draft_document = v_document,
      draft_version = v_next_version,
      updated_at = pg_catalog.now()
  WHERE id = v_page.id;

  INSERT INTO public.website_page_versions (
    organization_id, site_id, page_id, version_number, document,
    created_by, change_summary
  ) VALUES (
    p_organization_id, v_site.id, v_page.id, v_next_version, v_document,
    p_actor_id, 'AI edit: add section'
  );

  UPDATE public.website_agent_edit_plans
  SET status = 'applied', applied_at = pg_catalog.now()
  WHERE id = v_plan.id;

  INSERT INTO public.audit_logs (organization_id, user_name, action, details)
  VALUES (
    p_organization_id,
    p_actor_id,
    'website_agent.edit_plan_applied',
    pg_catalog.json_build_object(
      'site_id', v_site.id,
      'proposal_id', v_plan.id,
      'operation_count', 1
    )::text
  );

  RETURN pg_catalog.jsonb_build_object(
    'site_id', v_site.id,
    'page_id', v_page.id,
    'section_id', v_section_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_website_agent_edit_plan(uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;
