CREATE OR REPLACE FUNCTION public.validate_website_agent_site_theme(p_theme jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_key text;
  v_color_key text;
  v_allowed_keys constant text[] := ARRAY[
    'preset', 'primaryColor', 'secondaryColor', 'surfaceColor',
    'mutedTextColor', 'backgroundColor', 'textColor', 'headingFont',
    'bodyFont', 'radius', 'direction'
  ];
BEGIN
  IF pg_catalog.jsonb_typeof(p_theme) <> 'object'
    OR NOT (p_theme ? 'primaryColor' AND p_theme ? 'backgroundColor' AND p_theme ? 'textColor' AND p_theme ? 'radius')
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_theme)) > 11
    OR pg_catalog.octet_length(p_theme::text) > 4096
    OR p_theme::text ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe|data:text\/html|expression\s*\('
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_THEME';
  END IF;

  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_theme) AS keys(key) LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_THEME'; END IF;
  END LOOP;

  FOREACH v_color_key IN ARRAY ARRAY['primaryColor','secondaryColor','surfaceColor','mutedTextColor','backgroundColor','textColor'] LOOP
    IF p_theme ? v_color_key AND (
      pg_catalog.jsonb_typeof(p_theme->v_color_key) <> 'string'
      OR p_theme->>v_color_key !~* '^#[0-9a-f]{6}$'
    ) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_THEME'; END IF;
  END LOOP;

  IF p_theme ? 'preset' AND NOT (p_theme->>'preset' = ANY(ARRAY['minimal','dark','warm','bold','luxury','wellness']))
    OR p_theme ? 'headingFont' AND NOT (p_theme->>'headingFont' = ANY(ARRAY['Inter','Manrope','Playfair Display','DM Sans','Noto Sans Arabic','IBM Plex Sans Arabic']))
    OR p_theme ? 'bodyFont' AND NOT (p_theme->>'bodyFont' = ANY(ARRAY['Inter','Manrope','Playfair Display','DM Sans','Noto Sans Arabic','IBM Plex Sans Arabic']))
    OR NOT (p_theme->>'radius' = ANY(ARRAY['sm','md','lg']))
    OR p_theme ? 'direction' AND NOT (p_theme->>'direction' = ANY(ARRAY['ltr','rtl']))
  THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_THEME';
  END IF;
END;
$$;

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
  v_allowed_styles constant text[] := ARRAY['backgroundColor','textColor','transparent','variant'];
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
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_section->'style')) > 4
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
  v_globals jsonb;
  v_global_section jsonb;
  v_theme_patch jsonb;
  v_theme jsonb;
  v_site_name text;
  v_default_locale text;
  v_index integer;
  v_current_index integer;
  v_section_count integer;
  v_next_version integer;
  v_global_changed boolean := false;
  v_is_section_operation boolean;
  v_logo_id uuid;
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
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_plan.plan_json) AS keys(key) WHERE key NOT IN ('version','summary','operations'))
  THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  IF v_plan.base_versions ? 'global_version'
    AND (v_plan.base_versions->>'global_version')::integer <> v_site.global_version
  THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;

  v_globals := v_site.global_sections;
  v_site_name := v_site.name;
  v_default_locale := v_site.default_locale;
  IF pg_catalog.jsonb_typeof(v_globals) <> 'object'
    OR v_globals->>'version' <> '1'
    OR pg_catalog.jsonb_typeof(v_globals->'navigation') <> 'array'
    OR NOT (v_globals ? 'header' AND v_globals ? 'footer')
  THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;

  FOR v_operation IN SELECT value FROM pg_catalog.jsonb_array_elements(v_plan.plan_json->'operations') LOOP
    IF pg_catalog.jsonb_typeof(v_operation) <> 'object' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
    v_operation_name := v_operation->>'op';
    IF NOT (v_operation_name = ANY (ARRAY[
      'add_section','update_section','remove_section','move_section','duplicate_section',
      'update_site_theme','update_site_metadata','update_global_header','update_global_footer'
    ])) THEN RAISE EXCEPTION 'AI_EDIT_UNSUPPORTED_OPERATION'; END IF;

    v_is_section_operation := v_operation_name = ANY(ARRAY['add_section','update_section','remove_section','move_section','duplicate_section']);
    IF v_is_section_operation THEN
      IF COALESCE(v_operation->>'pageId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      v_page_id := (v_operation->>'pageId')::uuid;
      v_page_key := v_page_id::text;
      IF NOT (v_documents ? v_page_key) THEN
        SELECT * INTO v_page FROM public.website_pages
        WHERE id = v_page_id AND site_id = v_site.id AND organization_id = p_organization_id
        FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
        IF (v_plan.base_versions->'pages'->>v_page_key) IS DISTINCT FROM v_page.draft_version::text THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
        IF pg_catalog.jsonb_typeof(v_page.draft_document) <> 'object' OR pg_catalog.jsonb_typeof(v_page.draft_document->'sections') <> 'array' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
        v_documents := pg_catalog.jsonb_set(v_documents, ARRAY[v_page_key], v_page.draft_document, true);
        v_versions := pg_catalog.jsonb_set(v_versions, ARRAY[v_page_key], pg_catalog.to_jsonb(v_page.draft_version), true);
      END IF;

      v_document := v_documents->v_page_key;
      v_sections := v_document->'sections';
      v_section_count := pg_catalog.jsonb_array_length(v_sections);

      IF v_operation_name = 'add_section' THEN
        IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4 OR NOT (v_operation ? 'index' AND v_operation ? 'section') OR pg_catalog.jsonb_typeof(v_operation->'index') <> 'number' OR (v_operation->>'index') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
        IF v_section_count >= 100 THEN RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT'; END IF;
        v_index := (v_operation->>'index')::integer;
        IF v_index < 0 OR v_index > v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF;
        v_section := v_operation->'section';
        IF pg_catalog.jsonb_typeof(v_section) <> 'object' OR v_section ? 'id' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_section)) <> 3 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION'; END IF;
        v_section := v_section || pg_catalog.jsonb_build_object('id', extensions.gen_random_uuid()::text);
        PERFORM public.validate_website_agent_edit_section(v_section);
        v_sections := public.website_agent_jsonb_array_insert(v_sections, v_section, v_index);
      ELSIF v_operation_name = 'update_section' THEN
        IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4 OR NOT (v_operation ? 'sectionId' AND v_operation ? 'changes') OR COALESCE(v_operation->>'sectionId','') = '' OR pg_catalog.jsonb_typeof(v_operation->'changes') <> 'object' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation->'changes')) NOT BETWEEN 1 AND 2 OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_operation->'changes') AS keys(key) WHERE key NOT IN ('props','style')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
        v_section_id := v_operation->>'sectionId';
        SELECT value, (ordinal - 1)::integer INTO v_section, v_current_index FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value, ordinal) WHERE value->>'id' = v_section_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
        v_changes := v_operation->'changes';
        IF v_changes ? 'props' AND pg_catalog.jsonb_typeof(v_changes->'props') <> 'object' OR v_changes ? 'style' AND pg_catalog.jsonb_typeof(v_changes->'style') <> 'object' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION'; END IF;
        IF v_changes ? 'props' THEN v_section := pg_catalog.jsonb_set(v_section, '{props}', (v_section->'props') || (v_changes->'props'), false); END IF;
        IF v_changes ? 'style' THEN v_section := pg_catalog.jsonb_set(v_section, '{style}', (v_section->'style') || (v_changes->'style'), false); END IF;
        PERFORM public.validate_website_agent_edit_section(v_section);
        SELECT pg_catalog.jsonb_agg(CASE WHEN ordinal - 1 = v_current_index THEN v_section ELSE value END ORDER BY ordinal) INTO v_sections FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value, ordinal);
      ELSIF v_operation_name = 'remove_section' THEN
        IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 3 OR NOT (v_operation ? 'sectionId') THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
        v_section_id := v_operation->>'sectionId';
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_sections) AS item WHERE item->>'id'=v_section_id) THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
        SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY ordinal), '[]'::jsonb) INTO v_sections FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value, ordinal) WHERE value->>'id' <> v_section_id;
      ELSIF v_operation_name = 'move_section' THEN
        IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4 OR NOT (v_operation ? 'sectionId' AND v_operation ? 'index') OR pg_catalog.jsonb_typeof(v_operation->'index') <> 'number' OR (v_operation->>'index') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
        v_section_id := v_operation->>'sectionId'; v_index := (v_operation->>'index')::integer;
        SELECT value INTO v_section FROM pg_catalog.jsonb_array_elements(v_sections) AS item WHERE item->>'id'=v_section_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
        IF v_index < 0 OR v_index >= v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF;
        SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY ordinal), '[]'::jsonb) INTO v_sections FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value, ordinal) WHERE value->>'id' <> v_section_id;
        v_sections := public.website_agent_jsonb_array_insert(v_sections, v_section, v_index);
      ELSE
        IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 4 OR NOT (v_operation ? 'sectionId' AND v_operation ? 'index') OR pg_catalog.jsonb_typeof(v_operation->'index') <> 'number' OR (v_operation->>'index') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
        IF v_section_count >= 100 THEN RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT'; END IF;
        v_section_id := v_operation->>'sectionId'; v_index := (v_operation->>'index')::integer;
        SELECT value INTO v_section FROM pg_catalog.jsonb_array_elements(v_sections) AS item WHERE item->>'id'=v_section_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
        IF v_index < 0 OR v_index > v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF;
        v_section := pg_catalog.jsonb_set(v_section, '{id}', pg_catalog.to_jsonb(extensions.gen_random_uuid()::text), false);
        PERFORM public.validate_website_agent_edit_section(v_section);
        v_sections := public.website_agent_jsonb_array_insert(v_sections, v_section, v_index);
      END IF;
      v_document := pg_catalog.jsonb_set(v_document, '{sections}', v_sections, false);
      v_documents := pg_catalog.jsonb_set(v_documents, ARRAY[v_page_key], v_document, false);

    ELSIF v_operation_name = 'update_site_theme' THEN
      IF NOT (v_plan.base_versions ? 'global_version') THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 2 OR pg_catalog.jsonb_typeof(v_operation->'theme') <> 'object' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation->'theme')) NOT BETWEEN 1 AND 11 OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_operation->'theme') AS keys(key) WHERE key NOT IN ('preset','primaryColor','secondaryColor','surfaceColor','mutedTextColor','backgroundColor','textColor','headingFont','bodyFont','radius','direction')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_THEME'; END IF;
      v_theme_patch := v_operation->'theme';
      FOR v_page IN SELECT * FROM public.website_pages WHERE site_id = v_site.id AND organization_id = p_organization_id ORDER BY id FOR UPDATE LOOP
        v_page_key := v_page.id::text;
        IF NOT (v_documents ? v_page_key) THEN
          IF (v_plan.base_versions->'pages'->>v_page_key) IS DISTINCT FROM v_page.draft_version::text THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
          IF pg_catalog.jsonb_typeof(v_page.draft_document) <> 'object' OR pg_catalog.jsonb_typeof(v_page.draft_document->'sections') <> 'array' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
          v_documents := pg_catalog.jsonb_set(v_documents, ARRAY[v_page_key], v_page.draft_document, true);
          v_versions := pg_catalog.jsonb_set(v_versions, ARRAY[v_page_key], pg_catalog.to_jsonb(v_page.draft_version), true);
        END IF;
        v_document := v_documents->v_page_key;
        v_theme := COALESCE(v_document->'theme', '{}'::jsonb) || v_theme_patch;
        PERFORM public.validate_website_agent_site_theme(v_theme);
        v_document := pg_catalog.jsonb_set(v_document, '{theme}', v_theme, true);
        v_documents := pg_catalog.jsonb_set(v_documents, ARRAY[v_page_key], v_document, false);
      END LOOP;
      v_global_changed := true;

    ELSIF v_operation_name = 'update_site_metadata' THEN
      IF NOT (v_plan.base_versions ? 'global_version') THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 2 OR pg_catalog.jsonb_typeof(v_operation->'changes') <> 'object' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation->'changes')) NOT BETWEEN 1 AND 2 OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_operation->'changes') AS keys(key) WHERE key NOT IN ('name','language')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_METADATA'; END IF;
      v_changes := v_operation->'changes';
      IF v_changes ? 'name' AND (pg_catalog.jsonb_typeof(v_changes->'name') <> 'string' OR pg_catalog.length(pg_catalog.btrim(v_changes->>'name')) NOT BETWEEN 1 AND 120) OR v_changes ? 'language' AND (pg_catalog.jsonb_typeof(v_changes->'language') <> 'string' OR NOT (v_changes->>'language' = ANY(ARRAY['en','ar']))) OR v_changes::text ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe|data:text\/html' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_METADATA'; END IF;
      IF v_changes ? 'name' THEN v_site_name := pg_catalog.btrim(v_changes->>'name'); END IF;
      IF v_changes ? 'language' THEN v_default_locale := v_changes->>'language'; END IF;
      v_global_changed := true;

    ELSE
      IF NOT (v_plan.base_versions ? 'global_version') THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation)) <> 2 OR pg_catalog.jsonb_typeof(v_operation->'changes') <> 'object' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_operation->'changes')) NOT BETWEEN 1 AND 2 OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_operation->'changes') AS keys(key) WHERE key NOT IN ('props','style')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION'; END IF;
      v_changes := v_operation->'changes';
      IF v_changes ? 'props' AND pg_catalog.jsonb_typeof(v_changes->'props') <> 'object' OR v_changes ? 'style' AND pg_catalog.jsonb_typeof(v_changes->'style') <> 'object' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION'; END IF;
      v_section_id := CASE WHEN v_operation_name = 'update_global_header' THEN 'header' ELSE 'footer' END;
      v_global_section := v_globals->v_section_id;
      IF v_global_section IS NULL OR v_global_section = 'null'::jsonb THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
      IF v_changes ? 'props' THEN v_global_section := pg_catalog.jsonb_set(v_global_section, '{props}', (v_global_section->'props') || (v_changes->'props'), false); END IF;
      IF v_changes ? 'style' THEN v_global_section := pg_catalog.jsonb_set(v_global_section, '{style}', (v_global_section->'style') || (v_changes->'style'), false); END IF;
      PERFORM public.validate_website_agent_global_section(v_global_section, v_section_id);
      v_logo_id := NULL;
      IF v_global_section->'props' ? 'logoAssetId' AND v_global_section->'props'->'logoAssetId' <> 'null'::jsonb THEN
        v_logo_id := (v_global_section->'props'->>'logoAssetId')::uuid;
        IF NOT EXISTS (SELECT 1 FROM public.website_assets WHERE id = v_logo_id AND organization_id = p_organization_id AND site_id = v_site.id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_ASSET'; END IF;
      END IF;
      v_globals := pg_catalog.jsonb_set(v_globals, ARRAY[v_section_id], v_global_section, false);
      v_global_changed := true;
    END IF;
  END LOOP;

  FOR v_page_key, v_document IN SELECT key, value FROM pg_catalog.jsonb_each(v_documents) LOOP
    v_page_id := v_page_key::uuid;
    v_next_version := (v_versions->>v_page_key)::integer + 1;
    UPDATE public.website_pages SET draft_document = v_document, draft_version = v_next_version, updated_at = pg_catalog.now()
    WHERE id = v_page_id AND site_id = v_site.id AND organization_id = p_organization_id;
    INSERT INTO public.website_page_versions (organization_id,site_id,page_id,version_number,document,created_by,change_summary)
    VALUES (p_organization_id,v_site.id,v_page_id,v_next_version,v_document,p_actor_id,'AI website edits');
  END LOOP;

  IF v_global_changed THEN
    UPDATE public.website_sites
    SET name = v_site_name,
        default_locale = v_default_locale,
        global_sections = v_globals,
        global_version = global_version + 1,
        updated_at = pg_catalog.now()
    WHERE id = v_site.id AND organization_id = p_organization_id;
  END IF;

  UPDATE public.website_agent_edit_plans SET status='applied', applied_at=pg_catalog.now() WHERE id=v_plan.id;
  INSERT INTO public.audit_logs(organization_id,user_name,action,details)
  VALUES(p_organization_id,p_actor_id,'website_agent.edit_plan_applied',pg_catalog.json_build_object('site_id',v_site.id,'proposal_id',v_plan.id,'operation_count',pg_catalog.jsonb_array_length(v_plan.plan_json->'operations'))::text);
  RETURN pg_catalog.jsonb_build_object('site_id',v_site.id,'affected_pages',(SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_documents)),'global_updated',v_global_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_website_agent_site_theme(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_website_agent_global_section(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_website_agent_edit_plan(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
