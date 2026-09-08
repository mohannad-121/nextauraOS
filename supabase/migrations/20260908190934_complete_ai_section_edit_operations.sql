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
    RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION';
  END IF;

  v_type := p_section->>'type';
  IF NOT (v_type = ANY (ARRAY[
    'hero', 'text', 'image', 'button_group', 'spacer', 'features', 'services',
    'testimonials', 'pricing', 'faq', 'contact', 'gallery', 'stats', 'team'
  ])) THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION';
  END IF;

  v_allowed_props := CASE v_type
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

  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_section->'props') AS key LOOP
    IF NOT (v_key = ANY(v_allowed_props)) THEN
      RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION';
    END IF;
  END LOOP;
  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_section->'style') AS key LOOP
    IF NOT (v_key = ANY(v_allowed_styles)) THEN
      RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION';
    END IF;
  END LOOP;

  IF p_section->'style' ? 'preset' AND NOT (p_section->'style'->>'preset' = ANY (ARRAY['minimal','centered-editorial','split-image','icon-cards','bordered-grid','editorial-list','image-cards','large-quote','inline-strip','featured-grid']))
    OR p_section->'style' ? 'background' AND NOT (p_section->'style'->>'background' = ANY (ARRAY['solid','soft','contrast','accent','gradient','split']))
    OR p_section->'style' ? 'cardStyle' AND NOT (p_section->'style'->>'cardStyle' = ANY (ARRAY['flat','bordered','elevated','glass']))
    OR p_section->'style' ? 'animation' AND NOT (p_section->'style'->>'animation' = ANY (ARRAY['none','fade-up','fade-in','slide-left','slide-right','scale-in']))
    OR p_section->'style' ? 'animationDelayPreset' AND NOT (p_section->'style'->>'animationDelayPreset' = ANY (ARRAY['none','short','medium']))
    OR p_section->'style' ? 'alignment' AND NOT (p_section->'style'->>'alignment' = ANY (ARRAY['left','center','right']))
    OR p_section->'style' ? 'backgroundColor' AND p_section->'style'->>'backgroundColor' !~* '^#[0-9a-f]{6}$'
    OR p_section->'style' ? 'textColor' AND p_section->'style'->>'textColor' !~* '^#[0-9a-f]{6}$'
    OR p_section->'style' ? 'paddingY' AND (
      pg_catalog.jsonb_typeof(p_section->'style'->'paddingY') <> 'number'
      OR (p_section->'style'->>'paddingY')::numeric NOT BETWEEN 0 AND 240
    )
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION';
  END IF;

  v_items := CASE WHEN v_type = 'gallery' THEN p_section->'props'->'images' ELSE p_section->'props'->'items' END;
  v_item_limit := CASE v_type WHEN 'features' THEN 12 WHEN 'services' THEN 12 WHEN 'testimonials' THEN 12 WHEN 'pricing' THEN 4 WHEN 'faq' THEN 20 WHEN 'gallery' THEN 24 WHEN 'stats' THEN 8 WHEN 'team' THEN 16 ELSE NULL END;
  IF v_items IS NOT NULL AND (
    pg_catalog.jsonb_typeof(v_items) <> 'array'
    OR (v_item_limit IS NOT NULL AND pg_catalog.jsonb_array_length(v_items) > v_item_limit)
  ) THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.website_agent_jsonb_array_insert(
  p_items jsonb,
  p_item jsonb,
  p_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_length integer;
  v_result jsonb;
BEGIN
  IF pg_catalog.jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
  END IF;
  v_length := pg_catalog.jsonb_array_length(p_items);
  IF p_index < 0 OR p_index > v_length THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX';
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(item ORDER BY position), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT value AS item, ordinal::numeric AS position
    FROM pg_catalog.jsonb_array_elements(p_items) WITH ORDINALITY AS existing(value, ordinal)
    WHERE ordinal <= p_index
    UNION ALL
    SELECT p_item, p_index::numeric + 0.5
    UNION ALL
    SELECT value, ordinal::numeric
    FROM pg_catalog.jsonb_array_elements(p_items) WITH ORDINALITY AS existing(value, ordinal)
    WHERE ordinal > p_index
  ) AS ordered_items;
  RETURN v_result;
END;
$$;

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
  v_operation_name text;
  v_page_id uuid;
  v_page_key text;
  v_section_id text;
  v_section jsonb;
  v_changes jsonb;
  v_document jsonb;
  v_sections jsonb;
  v_documents jsonb := '{}'::jsonb;
  v_versions jsonb := '{}'::jsonb;
  v_index integer;
  v_current_index integer;
  v_section_count integer;
  v_next_version integer;
  v_key text;
BEGIN
  SELECT * INTO v_plan
  FROM public.website_agent_edit_plans
  WHERE id = p_plan_id
    AND organization_id = p_organization_id
    AND created_by = p_actor_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
  IF v_plan.status = 'applied' THEN RAISE EXCEPTION 'AI_EDIT_ALREADY_APPLIED'; END IF;
  IF v_plan.status <> 'generated' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  IF v_plan.expires_at <= pg_catalog.now() THEN RAISE EXCEPTION 'AI_EDIT_EXPIRED'; END IF;

  SELECT * INTO v_site
  FROM public.website_sites
  WHERE id = v_plan.site_id
    AND organization_id = p_organization_id
    AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_actor_id
      AND status = 'Active'
      AND role IN ('Owner', 'Admin')
  ) THEN RAISE EXCEPTION 'AI_EDIT_CROSS_TENANT'; END IF;

  IF pg_catalog.jsonb_typeof(v_plan.plan_json) <> 'object'
    OR v_plan.plan_json->>'version' <> '1'
    OR pg_catalog.length(pg_catalog.btrim(COALESCE(v_plan.plan_json->>'summary',''))) NOT BETWEEN 1 AND 500
    OR pg_catalog.jsonb_typeof(v_plan.plan_json->'operations') <> 'array'
    OR pg_catalog.jsonb_array_length(v_plan.plan_json->'operations') NOT BETWEEN 1 AND 30
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_plan.plan_json) key WHERE key NOT IN ('version','summary','operations'))
  THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  IF v_plan.base_versions ? 'global_version'
    AND (v_plan.base_versions->>'global_version')::integer <> v_site.global_version
  THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;

  FOR v_operation IN SELECT value FROM pg_catalog.jsonb_array_elements(v_plan.plan_json->'operations') LOOP
    IF pg_catalog.jsonb_typeof(v_operation) <> 'object' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
    v_operation_name := v_operation->>'op';
    IF NOT (v_operation_name = ANY (ARRAY['add_section','update_section','remove_section','move_section','duplicate_section'])) THEN
      RAISE EXCEPTION 'AI_EDIT_UNSUPPORTED_OPERATION';
    END IF;
    IF COALESCE(v_operation->>'pageId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN';
    END IF;
    v_page_id := (v_operation->>'pageId')::uuid;
    v_page_key := v_page_id::text;

    IF NOT (v_documents ? v_page_key) THEN
      SELECT * INTO v_page
      FROM public.website_pages
      WHERE id = v_page_id
        AND site_id = v_site.id
        AND organization_id = p_organization_id
      FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
      IF (v_plan.base_versions->'pages'->>v_page_key) IS DISTINCT FROM v_page.draft_version::text THEN
        RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL';
      END IF;
      IF pg_catalog.jsonb_typeof(v_page.draft_document) <> 'object'
        OR pg_catalog.jsonb_typeof(v_page.draft_document->'sections') <> 'array'
      THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      v_documents := pg_catalog.jsonb_set(v_documents, ARRAY[v_page_key], v_page.draft_document, true);
      v_versions := pg_catalog.jsonb_set(v_versions, ARRAY[v_page_key], pg_catalog.to_jsonb(v_page.draft_version), true);
    END IF;

    v_document := v_documents->v_page_key;
    v_sections := v_document->'sections';
    v_section_count := pg_catalog.jsonb_array_length(v_sections);

    IF v_operation_name = 'add_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4
        OR NOT (v_operation ? 'index' AND v_operation ? 'section')
        OR pg_catalog.jsonb_typeof(v_operation->'index') <> 'number'
        OR (v_operation->>'index') !~ '^[0-9]+$'
      THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      IF v_section_count >= 100 THEN RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT'; END IF;
      v_index := (v_operation->>'index')::integer;
      IF v_index < 0 OR v_index > v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF;
      v_section := v_operation->'section';
      IF pg_catalog.jsonb_typeof(v_section) <> 'object' OR v_section ? 'id'
        OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_section)) <> 3
      THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION'; END IF;
      v_section := v_section || pg_catalog.jsonb_build_object('id', extensions.gen_random_uuid()::text);
      PERFORM public.validate_website_agent_edit_section(v_section);
      v_sections := public.website_agent_jsonb_array_insert(v_sections, v_section, v_index);

    ELSIF v_operation_name = 'update_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4
        OR NOT (v_operation ? 'sectionId' AND v_operation ? 'changes')
        OR COALESCE(v_operation->>'sectionId','') = ''
        OR pg_catalog.jsonb_typeof(v_operation->'changes') <> 'object'
        OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation->'changes')) NOT BETWEEN 1 AND 2
        OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_operation->'changes') key WHERE key NOT IN ('props','style'))
      THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      v_section_id := v_operation->>'sectionId';
      SELECT value, (ordinal - 1)::integer INTO v_section, v_current_index
      FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value, ordinal)
      WHERE value->>'id' = v_section_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
      v_changes := v_operation->'changes';
      IF v_changes ? 'props' AND pg_catalog.jsonb_typeof(v_changes->'props') <> 'object'
        OR v_changes ? 'style' AND pg_catalog.jsonb_typeof(v_changes->'style') <> 'object'
      THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION'; END IF;
      IF v_changes ? 'props' THEN v_section := pg_catalog.jsonb_set(v_section, '{props}', (v_section->'props') || (v_changes->'props'), false); END IF;
      IF v_changes ? 'style' THEN v_section := pg_catalog.jsonb_set(v_section, '{style}', (v_section->'style') || (v_changes->'style'), false); END IF;
      PERFORM public.validate_website_agent_edit_section(v_section);
      SELECT pg_catalog.jsonb_agg(CASE WHEN ordinal - 1 = v_current_index THEN v_section ELSE value END ORDER BY ordinal)
      INTO v_sections
      FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value, ordinal);

    ELSIF v_operation_name = 'remove_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 3 OR NOT (v_operation ? 'sectionId') THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      v_section_id := v_operation->>'sectionId';
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_sections) item WHERE item->>'id'=v_section_id) THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
      SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY ordinal), '[]'::jsonb) INTO v_sections
      FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value, ordinal)
      WHERE value->>'id' <> v_section_id;

    ELSIF v_operation_name = 'move_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4
        OR NOT (v_operation ? 'sectionId' AND v_operation ? 'index')
        OR pg_catalog.jsonb_typeof(v_operation->'index') <> 'number'
        OR (v_operation->>'index') !~ '^[0-9]+$'
      THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      v_section_id := v_operation->>'sectionId'; v_index := (v_operation->>'index')::integer;
      SELECT value INTO v_section FROM pg_catalog.jsonb_array_elements(v_sections) item WHERE item->>'id'=v_section_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
      IF v_index < 0 OR v_index >= v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF;
      SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY ordinal), '[]'::jsonb) INTO v_sections
      FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value, ordinal)
      WHERE value->>'id' <> v_section_id;
      v_sections := public.website_agent_jsonb_array_insert(v_sections, v_section, v_index);

    ELSE
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4
        OR NOT (v_operation ? 'sectionId' AND v_operation ? 'index')
        OR pg_catalog.jsonb_typeof(v_operation->'index') <> 'number'
        OR (v_operation->>'index') !~ '^[0-9]+$'
      THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      IF v_section_count >= 100 THEN RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT'; END IF;
      v_section_id := v_operation->>'sectionId'; v_index := (v_operation->>'index')::integer;
      SELECT value INTO v_section FROM pg_catalog.jsonb_array_elements(v_sections) item WHERE item->>'id'=v_section_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
      IF v_index < 0 OR v_index > v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF;
      v_section := pg_catalog.jsonb_set(v_section, '{id}', pg_catalog.to_jsonb(extensions.gen_random_uuid()::text), false);
      PERFORM public.validate_website_agent_edit_section(v_section);
      v_sections := public.website_agent_jsonb_array_insert(v_sections, v_section, v_index);
    END IF;

    v_document := pg_catalog.jsonb_set(v_document, '{sections}', v_sections, false);
    v_documents := pg_catalog.jsonb_set(v_documents, ARRAY[v_page_key], v_document, false);
  END LOOP;

  FOR v_page_key, v_document IN SELECT key, value FROM pg_catalog.jsonb_each(v_documents) LOOP
    v_page_id := v_page_key::uuid;
    v_next_version := (v_versions->>v_page_key)::integer + 1;
    UPDATE public.website_pages
    SET draft_document=v_document, draft_version=v_next_version, updated_at=pg_catalog.now()
    WHERE id=v_page_id AND site_id=v_site.id AND organization_id=p_organization_id;
    INSERT INTO public.website_page_versions(organization_id,site_id,page_id,version_number,document,created_by,change_summary)
    VALUES(p_organization_id,v_site.id,v_page_id,v_next_version,v_document,p_actor_id,'AI section edits');
  END LOOP;

  UPDATE public.website_agent_edit_plans SET status='applied', applied_at=pg_catalog.now() WHERE id=v_plan.id;
  INSERT INTO public.audit_logs(organization_id,user_name,action,details)
  VALUES(p_organization_id,p_actor_id,'website_agent.edit_plan_applied',pg_catalog.json_build_object('site_id',v_site.id,'proposal_id',v_plan.id,'operation_count',pg_catalog.jsonb_array_length(v_plan.plan_json->'operations'))::text);
  RETURN pg_catalog.jsonb_build_object('site_id',v_site.id,'affected_pages',(SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_documents)));
END;
$$;

REVOKE ALL ON FUNCTION public.validate_website_agent_edit_section(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.website_agent_jsonb_array_insert(jsonb, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_website_agent_edit_plan(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
