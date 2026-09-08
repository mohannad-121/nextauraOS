CREATE OR REPLACE FUNCTION public.validate_website_agent_page_slug(p_slug text, p_allow_root boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF p_slug IS NULL OR (p_slug = '/' AND NOT p_allow_root) OR p_slug !~ '^/$|^/[a-z0-9](?:[a-z0-9/-]{0,190}[a-z0-9])?$' OR p_slug ~ '//' OR p_slug ~ '[?#]' THEN
    RAISE EXCEPTION 'AI_EDIT_INVALID_SLUG';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_website_agent_page_seo(p_seo jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_key text;
BEGIN
  IF pg_catalog.jsonb_typeof(p_seo) <> 'object' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_seo)) NOT BETWEEN 1 AND 2 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SEO'; END IF;
  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_seo) AS keys(key) LOOP
    IF v_key NOT IN ('title','description') THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SEO'; END IF;
  END LOOP;
  IF p_seo ? 'title' AND (pg_catalog.jsonb_typeof(p_seo->'title') <> 'string' OR pg_catalog.length(pg_catalog.btrim(p_seo->>'title')) NOT BETWEEN 1 AND 160)
    OR p_seo ? 'description' AND (pg_catalog.jsonb_typeof(p_seo->'description') <> 'string' OR pg_catalog.length(pg_catalog.btrim(p_seo->>'description')) NOT BETWEEN 1 AND 320)
    OR p_seo::text ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe|data:text\/html'
  THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SEO'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_website_agent_navigation_item(p_item jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_key text;
BEGIN
  IF pg_catalog.jsonb_typeof(p_item) <> 'object' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_item)) <> 4
    OR NOT (p_item ? 'id' AND p_item ? 'label' AND p_item ? 'pageId' AND p_item ? 'visible')
    OR COALESCE(p_item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR COALESCE(p_item->>'pageId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR pg_catalog.jsonb_typeof(p_item->'label') <> 'string' OR pg_catalog.length(pg_catalog.btrim(p_item->>'label')) NOT BETWEEN 1 AND 80
    OR pg_catalog.jsonb_typeof(p_item->'visible') <> 'boolean'
    OR p_item::text ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe|data:text\/html'
  THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF;
  FOR v_key IN SELECT key FROM pg_catalog.jsonb_object_keys(p_item) AS keys(key) LOOP
    IF v_key NOT IN ('id','label','pageId','visible') THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_website_agent_edit_plan(p_plan_id uuid,p_organization_id uuid,p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_plan public.website_agent_edit_plans; v_site public.website_sites; v_page public.website_pages;
  v_op jsonb; v_name text; v_target text; v_page_id uuid; v_key text; v_section jsonb; v_sections jsonb; v_doc jsonb; v_changes jsonb;
  v_docs jsonb := '{}'::jsonb; v_versions jsonb := '{}'::jsonb; v_states jsonb := '{}'::jsonb; v_new_pages jsonb := '{}'::jsonb; v_temp_ids jsonb := '{}'::jsonb; v_meta_changed jsonb := '{}'::jsonb;
  v_globals jsonb; v_global_section jsonb; v_theme_patch jsonb; v_theme jsonb; v_site_theme jsonb; v_site_name text; v_locale text;
  v_index integer; v_current_index integer; v_section_count integer; v_next_version integer; v_sort_order integer; v_page_count integer; v_nav_count integer;
  v_global_changed boolean := false; v_new boolean; v_temp_ref text; v_nav_id text; v_nav_item jsonb; v_navigation jsonb; v_new_sections jsonb; v_item jsonb; v_logo_id uuid;
BEGIN
  SELECT * INTO v_plan FROM public.website_agent_edit_plans WHERE id=p_plan_id AND organization_id=p_organization_id AND created_by=p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
  IF v_plan.status='applied' THEN RAISE EXCEPTION 'AI_EDIT_ALREADY_APPLIED'; END IF;
  IF v_plan.status <> 'generated' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  IF v_plan.expires_at <= pg_catalog.now() THEN RAISE EXCEPTION 'AI_EDIT_EXPIRED'; END IF;
  SELECT * INTO v_site FROM public.website_sites WHERE id=v_plan.site_id AND organization_id=p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=p_organization_id AND user_id=p_actor_id AND status='Active' AND role IN ('Owner','Admin')) THEN RAISE EXCEPTION 'AI_EDIT_CROSS_TENANT'; END IF;
  IF pg_catalog.jsonb_typeof(v_plan.plan_json) <> 'object' OR v_plan.plan_json->>'version' <> '1' OR pg_catalog.length(pg_catalog.btrim(COALESCE(v_plan.plan_json->>'summary',''))) NOT BETWEEN 1 AND 500 OR pg_catalog.jsonb_typeof(v_plan.plan_json->'operations') <> 'array' OR pg_catalog.jsonb_array_length(v_plan.plan_json->'operations') NOT BETWEEN 1 AND 30 OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_plan.plan_json) AS keys(key) WHERE key NOT IN ('version','summary','operations')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  IF v_plan.base_versions ? 'global_version' AND (v_plan.base_versions->>'global_version')::integer <> v_site.global_version THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
  v_globals:=v_site.global_sections; v_navigation:=v_globals->'navigation'; v_site_name:=v_site.name; v_locale:=v_site.default_locale;
  IF pg_catalog.jsonb_typeof(v_globals) <> 'object' OR v_globals->>'version' <> '1' OR pg_catalog.jsonb_typeof(v_navigation) <> 'array' OR NOT(v_globals ? 'header' AND v_globals ? 'footer') THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  SELECT COALESCE(draft_document->'theme',pg_catalog.jsonb_build_object('primaryColor','#2563eb','backgroundColor','#ffffff','textColor','#0f172a','radius','md')) INTO v_site_theme FROM public.website_pages WHERE site_id=v_site.id AND organization_id=p_organization_id ORDER BY sort_order,id LIMIT 1;
  PERFORM public.validate_website_agent_site_theme(v_site_theme);
  SELECT pg_catalog.count(*),COALESCE(pg_catalog.max(sort_order),0) INTO v_page_count,v_sort_order FROM public.website_pages WHERE site_id=v_site.id AND organization_id=p_organization_id;

  FOR v_op IN SELECT value FROM pg_catalog.jsonb_array_elements(v_plan.plan_json->'operations') LOOP
    IF pg_catalog.jsonb_typeof(v_op) <> 'object' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
    v_name:=v_op->>'op';
    IF NOT(v_name=ANY(ARRAY['add_section','update_section','remove_section','move_section','duplicate_section','update_site_theme','update_site_metadata','update_global_header','update_global_footer','create_page','rename_page','update_page_slug','update_page_seo','add_navigation_item','update_navigation_item','remove_navigation_item'])) THEN RAISE EXCEPTION 'AI_EDIT_UNSUPPORTED_OPERATION'; END IF;

    IF v_name='create_page' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op)) <> 6 OR NOT(v_op ? 'tempRef' AND v_op ? 'name' AND v_op ? 'slug' AND v_op ? 'seo' AND v_op ? 'sections') OR COALESCE(v_op->>'tempRef','') !~ '^new:[a-z0-9][a-z0-9_-]{0,60}$' OR pg_catalog.jsonb_typeof(v_op->'seo') <> 'object' OR pg_catalog.jsonb_typeof(v_op->'sections') <> 'array' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      v_temp_ref:=v_op->>'tempRef'; IF v_temp_ids ? v_temp_ref THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
      IF pg_catalog.length(pg_catalog.btrim(v_op->>'name')) NOT BETWEEN 1 AND 120 OR v_op->>'name' ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PAGE'; END IF;
      PERFORM public.validate_website_agent_page_slug(v_op->>'slug',false); PERFORM public.validate_website_agent_page_seo(v_op->'seo');
      IF v_page_count + (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_new_pages)) >= 8 THEN RAISE EXCEPTION 'AI_EDIT_PAGE_LIMIT'; END IF;
      IF EXISTS(SELECT 1 FROM public.website_pages WHERE site_id=v_site.id AND slug=v_op->>'slug') OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_each(v_new_pages) AS pages(key,value) WHERE value->>'slug'=v_op->>'slug') THEN RAISE EXCEPTION 'AI_EDIT_SLUG_CONFLICT'; END IF;
      IF pg_catalog.jsonb_array_length(v_op->'sections') > 100 THEN RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT'; END IF;
      v_new_sections:='[]'::jsonb;
      FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(v_op->'sections') LOOP
        IF pg_catalog.jsonb_typeof(v_item)<>'object' OR v_item ? 'id' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_item))<>3 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION'; END IF;
        v_section:=v_item||pg_catalog.jsonb_build_object('id',extensions.gen_random_uuid()::text); PERFORM public.validate_website_agent_edit_section(v_section); v_new_sections:=v_new_sections||pg_catalog.jsonb_build_array(v_section);
      END LOOP;
      v_page_id:=extensions.gen_random_uuid(); v_key:=v_page_id::text; v_sort_order:=v_sort_order+1;
      v_doc:=pg_catalog.jsonb_build_object('version',1,'theme',v_site_theme,'sections',v_new_sections);
      v_temp_ids:=pg_catalog.jsonb_set(v_temp_ids,ARRAY[v_temp_ref],pg_catalog.to_jsonb(v_key),true);
      v_new_pages:=pg_catalog.jsonb_set(v_new_pages,ARRAY[v_key],pg_catalog.jsonb_build_object('name',pg_catalog.btrim(v_op->>'name'),'slug',v_op->>'slug','seo_title',v_op->'seo'->>'title','seo_description',v_op->'seo'->>'description','sort_order',v_sort_order),true);
      v_states:=pg_catalog.jsonb_set(v_states,ARRAY[v_key],pg_catalog.jsonb_build_object('new',true,'name',pg_catalog.btrim(v_op->>'name'),'slug',v_op->>'slug','seo_title',v_op->'seo'->>'title','seo_description',v_op->'seo'->>'description','document',v_doc,'draft_version',0,'is_homepage',false),true);
      v_docs:=pg_catalog.jsonb_set(v_docs,ARRAY[v_key],v_doc,true); v_versions:=pg_catalog.jsonb_set(v_versions,ARRAY[v_key],'0'::jsonb,true);
      CONTINUE;
    END IF;

    IF v_name IN ('update_site_theme','update_site_metadata','update_global_header','update_global_footer','add_navigation_item','update_navigation_item','remove_navigation_item') THEN
      IF NOT(v_plan.base_versions ? 'global_version') THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
    END IF;
    IF v_name='update_site_theme' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>2 OR pg_catalog.jsonb_typeof(v_op->'theme')<>'object' OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(v_op->'theme') AS keys(key) WHERE key NOT IN ('preset','primaryColor','secondaryColor','surfaceColor','mutedTextColor','backgroundColor','textColor','headingFont','bodyFont','radius','direction')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_THEME'; END IF;
      v_theme_patch:=v_op->'theme'; v_site_theme:=v_site_theme||v_theme_patch; PERFORM public.validate_website_agent_site_theme(v_site_theme);
      FOR v_page IN SELECT * FROM public.website_pages WHERE site_id=v_site.id AND organization_id=p_organization_id ORDER BY id FOR UPDATE LOOP
        v_key:=v_page.id::text; IF NOT(v_states ? v_key) THEN
          IF (v_plan.base_versions->'pages'->>v_key) IS DISTINCT FROM v_page.draft_version::text THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
          v_states:=pg_catalog.jsonb_set(v_states,ARRAY[v_key],pg_catalog.jsonb_build_object('new',false,'name',v_page.name,'slug',v_page.slug,'seo_title',v_page.seo_title,'seo_description',v_page.seo_description,'document',v_page.draft_document,'draft_version',v_page.draft_version,'updated_at',v_page.updated_at::text,'is_homepage',v_page.is_homepage),true);
        END IF;
        v_doc:=v_docs->v_key; IF v_doc IS NULL THEN v_doc:=v_states->v_key->'document'; END IF; v_doc:=pg_catalog.jsonb_set(v_doc,'{theme}',(v_doc->'theme')||v_theme_patch,true); v_docs:=pg_catalog.jsonb_set(v_docs,ARRAY[v_key],v_doc,true); v_versions:=pg_catalog.jsonb_set(v_versions,ARRAY[v_key],v_states->v_key->'draft_version',true);
      END LOOP;
      FOR v_key,v_doc IN SELECT key,value FROM pg_catalog.jsonb_each(v_docs) LOOP
        IF v_new_pages ? v_key THEN v_docs:=pg_catalog.jsonb_set(v_docs,ARRAY[v_key],pg_catalog.jsonb_set(v_doc,'{theme}',(v_doc->'theme')||v_theme_patch,true),false); END IF;
      END LOOP;
      v_global_changed:=true; CONTINUE;
    END IF;
    IF v_name='update_site_metadata' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>2 OR pg_catalog.jsonb_typeof(v_op->'changes')<>'object' OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(v_op->'changes') AS keys(key) WHERE key NOT IN('name','language')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_METADATA'; END IF;
      v_changes:=v_op->'changes'; IF v_changes ? 'name' THEN IF pg_catalog.length(pg_catalog.btrim(v_changes->>'name')) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_METADATA'; END IF; v_site_name:=pg_catalog.btrim(v_changes->>'name'); END IF; IF v_changes ? 'language' THEN IF v_changes->>'language' NOT IN ('en','ar') THEN RAISE EXCEPTION 'AI_EDIT_INVALID_METADATA'; END IF; v_locale:=v_changes->>'language'; END IF; v_global_changed:=true; CONTINUE;
    END IF;
    IF v_name IN ('update_global_header','update_global_footer') THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>2 OR pg_catalog.jsonb_typeof(v_op->'changes')<>'object' OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(v_op->'changes') AS keys(key) WHERE key NOT IN('props','style')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_GLOBAL_SECTION'; END IF;
      v_changes:=v_op->'changes'; v_target:=CASE WHEN v_name='update_global_header' THEN 'header' ELSE 'footer' END; v_global_section:=v_globals->v_target; IF v_global_section IS NULL OR v_global_section='null'::jsonb THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
      IF v_changes ? 'props' THEN v_global_section:=pg_catalog.jsonb_set(v_global_section,'{props}',(v_global_section->'props')||(v_changes->'props'),false); END IF; IF v_changes ? 'style' THEN v_global_section:=pg_catalog.jsonb_set(v_global_section,'{style}',(v_global_section->'style')||(v_changes->'style'),false); END IF; PERFORM public.validate_website_agent_global_section(v_global_section,v_target);
      IF v_global_section->'props' ? 'logoAssetId' AND v_global_section->'props'->'logoAssetId' <> 'null'::jsonb THEN v_logo_id:=(v_global_section->'props'->>'logoAssetId')::uuid; IF NOT EXISTS(SELECT 1 FROM public.website_assets WHERE id=v_logo_id AND organization_id=p_organization_id AND site_id=v_site.id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_ASSET'; END IF; END IF;
      v_globals:=pg_catalog.jsonb_set(v_globals,ARRAY[v_target],v_global_section,false); v_global_changed:=true; CONTINUE;
    END IF;

    IF v_name IN ('add_navigation_item','update_navigation_item','remove_navigation_item') THEN
      v_nav_count:=pg_catalog.jsonb_array_length(v_navigation);
      IF v_name='add_navigation_item' THEN
        IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>4 OR NOT(v_op ? 'label' AND v_op ? 'index') OR ((CASE WHEN v_op ? 'targetPageId' THEN 1 ELSE 0 END)+(CASE WHEN v_op ? 'targetPageRef' THEN 1 ELSE 0 END))<>1 OR pg_catalog.jsonb_typeof(v_op->'index')<>'number' OR (v_op->>'index') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF;
        v_target:=COALESCE(v_op->>'targetPageId',v_op->>'targetPageRef'); v_index:=(v_op->>'index')::integer; IF v_index<0 OR v_index>v_nav_count OR pg_catalog.length(pg_catalog.btrim(v_op->>'label')) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF;
        IF v_op ? 'targetPageRef' THEN v_target:=v_temp_ids->>v_target; IF v_target IS NULL THEN RAISE EXCEPTION 'AI_EDIT_NAV_TARGET_INVALID'; END IF; END IF;
        IF v_target !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' OR NOT(v_new_pages ? v_target) AND NOT EXISTS(SELECT 1 FROM public.website_pages WHERE id=v_target::uuid AND site_id=v_site.id AND organization_id=p_organization_id) THEN RAISE EXCEPTION 'AI_EDIT_NAV_TARGET_INVALID'; END IF;
        v_nav_item:=pg_catalog.jsonb_build_object('id',extensions.gen_random_uuid()::text,'label',pg_catalog.btrim(v_op->>'label'),'pageId',v_target,'visible',true); PERFORM public.validate_website_agent_navigation_item(v_nav_item); v_navigation:=public.website_agent_jsonb_array_insert(v_navigation,v_nav_item,v_index); v_globals:=pg_catalog.jsonb_set(v_globals,'{navigation}',v_navigation,false); v_global_changed:=true; CONTINUE;
      ELSIF v_name='remove_navigation_item' THEN
        IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>2 OR COALESCE(v_op->>'navigationId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF;
        v_nav_id:=v_op->>'navigationId'; IF NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(v_navigation) AS item WHERE item->>'id'=v_nav_id) THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF; SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY ordinal),'[]'::jsonb) INTO v_navigation FROM pg_catalog.jsonb_array_elements(v_navigation) WITH ORDINALITY AS item(value,ordinal) WHERE value->>'id'<>v_nav_id; v_globals:=pg_catalog.jsonb_set(v_globals,'{navigation}',v_navigation,false); v_global_changed:=true; CONTINUE;
      ELSE
        IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>3 OR NOT(v_op ? 'navigationId' AND v_op ? 'changes') OR pg_catalog.jsonb_typeof(v_op->'changes')<>'object' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF;
        v_nav_id:=v_op->>'navigationId'; SELECT value,(ordinal-1)::integer INTO v_nav_item,v_current_index FROM pg_catalog.jsonb_array_elements(v_navigation) WITH ORDINALITY AS item(value,ordinal) WHERE value->>'id'=v_nav_id; IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
        v_changes:=v_op->'changes'; IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(v_changes) AS keys(key) WHERE key NOT IN('label','targetPageId','targetPageRef','index')) OR ((CASE WHEN v_changes ? 'targetPageId' THEN 1 ELSE 0 END)+(CASE WHEN v_changes ? 'targetPageRef' THEN 1 ELSE 0 END))>1 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF;
        IF v_changes ? 'label' THEN IF pg_catalog.length(pg_catalog.btrim(v_changes->>'label')) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF; v_nav_item:=pg_catalog.jsonb_set(v_nav_item,'{label}',pg_catalog.to_jsonb(pg_catalog.btrim(v_changes->>'label')),false); END IF;
        IF v_changes ? 'targetPageId' OR v_changes ? 'targetPageRef' THEN v_target:=COALESCE(v_changes->>'targetPageId',v_changes->>'targetPageRef'); IF v_changes ? 'targetPageRef' THEN v_target:=v_temp_ids->>v_target; END IF; IF v_target IS NULL OR (NOT(v_new_pages ? v_target) AND NOT EXISTS(SELECT 1 FROM public.website_pages WHERE id=v_target::uuid AND site_id=v_site.id AND organization_id=p_organization_id)) THEN RAISE EXCEPTION 'AI_EDIT_NAV_TARGET_INVALID'; END IF; v_nav_item:=pg_catalog.jsonb_set(v_nav_item,'{pageId}',pg_catalog.to_jsonb(v_target),false); END IF;
        PERFORM public.validate_website_agent_navigation_item(v_nav_item); SELECT pg_catalog.jsonb_agg(CASE WHEN ordinal-1=v_current_index THEN v_nav_item ELSE value END ORDER BY ordinal) INTO v_navigation FROM pg_catalog.jsonb_array_elements(v_navigation) WITH ORDINALITY AS item(value,ordinal);
        IF v_changes ? 'index' THEN v_index:=(v_changes->>'index')::integer; IF pg_catalog.jsonb_typeof(v_changes->'index')<>'number' OR v_index<0 OR v_index>=v_nav_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_NAVIGATION'; END IF; SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY ordinal),'[]'::jsonb) INTO v_navigation FROM pg_catalog.jsonb_array_elements(v_navigation) WITH ORDINALITY AS item(value,ordinal) WHERE value->>'id'<>v_nav_id; v_navigation:=public.website_agent_jsonb_array_insert(v_navigation,v_nav_item,v_index); END IF;
        v_globals:=pg_catalog.jsonb_set(v_globals,'{navigation}',v_navigation,false); v_global_changed:=true; CONTINUE;
      END IF;
    END IF;

    -- Resolve existing UUID targets and same-proposal temp page refs for page and section operations.
    IF NOT (v_op ? 'pageId' OR v_op ? 'pageRef') OR ((CASE WHEN v_op ? 'pageId' THEN 1 ELSE 0 END)+(CASE WHEN v_op ? 'pageRef' THEN 1 ELSE 0 END))<>1 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_TARGET'; END IF;
    v_target:=COALESCE(v_op->>'pageId',v_op->>'pageRef'); IF v_op ? 'pageRef' THEN v_target:=v_temp_ids->>v_target; IF v_target IS NULL THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF; END IF;
    IF v_target !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_TARGET'; END IF;
    v_page_id:=v_target::uuid; v_key:=v_target; v_new:=v_new_pages ? v_key;
    IF NOT(v_states ? v_key) THEN
      SELECT * INTO v_page FROM public.website_pages WHERE id=v_page_id AND site_id=v_site.id AND organization_id=p_organization_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
      IF (v_plan.base_versions->'pages'->>v_key) IS DISTINCT FROM v_page.draft_version::text THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
      v_states:=pg_catalog.jsonb_set(v_states,ARRAY[v_key],pg_catalog.jsonb_build_object('new',false,'name',v_page.name,'slug',v_page.slug,'seo_title',v_page.seo_title,'seo_description',v_page.seo_description,'document',v_page.draft_document,'draft_version',v_page.draft_version,'updated_at',v_page.updated_at::text,'is_homepage',v_page.is_homepage),true);
    END IF;
    IF v_name='rename_page' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>3 OR pg_catalog.length(pg_catalog.btrim(v_op->>'name')) NOT BETWEEN 1 AND 120 OR v_op->>'name' ~* '<\/?script|on[a-z]+\s*=|javascript:|<iframe' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PAGE'; END IF;
      IF NOT v_new AND (v_plan.base_versions->'page_updated_at'->>v_key) IS DISTINCT FROM v_states->v_key->>'updated_at' THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
      v_states:=pg_catalog.jsonb_set(v_states,ARRAY[v_key,'name'],pg_catalog.to_jsonb(pg_catalog.btrim(v_op->>'name')),false); v_meta_changed:=pg_catalog.jsonb_set(v_meta_changed,ARRAY[v_key],'true'::jsonb,true); CONTINUE;
    ELSIF v_name='update_page_slug' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>3 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PAGE'; END IF; PERFORM public.validate_website_agent_page_slug(v_op->>'slug',(v_states->v_key->>'is_homepage')::boolean);
      IF v_op->>'slug'='/' AND NOT (v_states->v_key->>'is_homepage')::boolean THEN RAISE EXCEPTION 'AI_EDIT_HOMEPAGE_IMMUTABLE'; END IF;
      IF EXISTS(SELECT 1 FROM public.website_pages WHERE site_id=v_site.id AND slug=v_op->>'slug' AND id<>v_page_id) OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_each(v_new_pages) AS pages(key,value) WHERE key<>v_key AND value->>'slug'=v_op->>'slug') THEN RAISE EXCEPTION 'AI_EDIT_SLUG_CONFLICT'; END IF;
      IF NOT v_new AND (v_plan.base_versions->'page_updated_at'->>v_key) IS DISTINCT FROM v_states->v_key->>'updated_at' THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
      v_states:=pg_catalog.jsonb_set(v_states,ARRAY[v_key,'slug'],pg_catalog.to_jsonb(v_op->>'slug'),false); v_meta_changed:=pg_catalog.jsonb_set(v_meta_changed,ARRAY[v_key],'true'::jsonb,true); CONTINUE;
    ELSIF v_name='update_page_seo' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>3 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SEO'; END IF; PERFORM public.validate_website_agent_page_seo(v_op->'seo');
      IF NOT v_new AND (v_plan.base_versions->'page_updated_at'->>v_key) IS DISTINCT FROM v_states->v_key->>'updated_at' THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
      IF v_op->'seo' ? 'title' THEN v_states:=pg_catalog.jsonb_set(v_states,ARRAY[v_key,'seo_title'],pg_catalog.to_jsonb(pg_catalog.btrim(v_op->'seo'->>'title')),false); END IF; IF v_op->'seo' ? 'description' THEN v_states:=pg_catalog.jsonb_set(v_states,ARRAY[v_key,'seo_description'],pg_catalog.to_jsonb(pg_catalog.btrim(v_op->'seo'->>'description')),false); END IF; v_meta_changed:=pg_catalog.jsonb_set(v_meta_changed,ARRAY[v_key],'true'::jsonb,true); CONTINUE;
    END IF;

    v_doc:=v_docs->v_key; IF v_doc IS NULL THEN v_doc:=v_states->v_key->'document'; v_docs:=pg_catalog.jsonb_set(v_docs,ARRAY[v_key],v_doc,true); v_versions:=pg_catalog.jsonb_set(v_versions,ARRAY[v_key],v_states->v_key->'draft_version',true); END IF;
    IF pg_catalog.jsonb_typeof(v_doc->'sections')<>'array' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF; v_sections:=v_doc->'sections'; v_section_count:=pg_catalog.jsonb_array_length(v_sections);
    IF v_name='add_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>4 OR NOT(v_op ? 'index' AND v_op ? 'section') OR pg_catalog.jsonb_typeof(v_op->'index')<>'number' OR (v_op->>'index') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF; IF v_section_count>=100 THEN RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT'; END IF; v_index:=(v_op->>'index')::integer; IF v_index<0 OR v_index>v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF; v_section:=v_op->'section'; IF pg_catalog.jsonb_typeof(v_section)<>'object' OR v_section ? 'id' OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_section))<>3 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION'; END IF; v_section:=v_section||pg_catalog.jsonb_build_object('id',extensions.gen_random_uuid()::text); PERFORM public.validate_website_agent_edit_section(v_section); v_sections:=public.website_agent_jsonb_array_insert(v_sections,v_section,v_index);
    ELSIF v_name='update_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>4 OR NOT(v_op ? 'sectionId' AND v_op ? 'changes') OR pg_catalog.jsonb_typeof(v_op->'changes')<>'object' OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(v_op->'changes') AS keys(key) WHERE key NOT IN('props','style')) THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF; SELECT value,(ordinal-1)::integer INTO v_section,v_current_index FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value,ordinal) WHERE value->>'id'=v_op->>'sectionId'; IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF; v_changes:=v_op->'changes'; IF v_changes ? 'props' THEN v_section:=pg_catalog.jsonb_set(v_section,'{props}',(v_section->'props')||(v_changes->'props'),false); END IF; IF v_changes ? 'style' THEN v_section:=pg_catalog.jsonb_set(v_section,'{style}',(v_section->'style')||(v_changes->'style'),false); END IF; PERFORM public.validate_website_agent_edit_section(v_section); SELECT pg_catalog.jsonb_agg(CASE WHEN ordinal-1=v_current_index THEN v_section ELSE value END ORDER BY ordinal) INTO v_sections FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value,ordinal);
    ELSIF v_name='remove_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>3 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF; IF NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(v_sections) AS item WHERE item->>'id'=v_op->>'sectionId') THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF; SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY ordinal),'[]'::jsonb) INTO v_sections FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value,ordinal) WHERE value->>'id'<>v_op->>'sectionId';
    ELSIF v_name='move_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>4 OR pg_catalog.jsonb_typeof(v_op->'index')<>'number' OR (v_op->>'index') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF; v_index:=(v_op->>'index')::integer; SELECT value INTO v_section FROM pg_catalog.jsonb_array_elements(v_sections) AS item WHERE item->>'id'=v_op->>'sectionId'; IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF; IF v_index<0 OR v_index>=v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF; SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY ordinal),'[]'::jsonb) INTO v_sections FROM pg_catalog.jsonb_array_elements(v_sections) WITH ORDINALITY AS item(value,ordinal) WHERE value->>'id'<>v_op->>'sectionId'; v_sections:=public.website_agent_jsonb_array_insert(v_sections,v_section,v_index);
    ELSIF v_name='duplicate_section' THEN
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_op))<>4 OR pg_catalog.jsonb_typeof(v_op->'index')<>'number' OR (v_op->>'index') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF; IF v_section_count>=100 THEN RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT'; END IF; v_index:=(v_op->>'index')::integer; SELECT value INTO v_section FROM pg_catalog.jsonb_array_elements(v_sections) AS item WHERE item->>'id'=v_op->>'sectionId'; IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF; IF v_index<0 OR v_index>v_section_count THEN RAISE EXCEPTION 'AI_EDIT_INVALID_INDEX'; END IF; v_section:=pg_catalog.jsonb_set(v_section,'{id}',pg_catalog.to_jsonb(extensions.gen_random_uuid()::text),false); PERFORM public.validate_website_agent_edit_section(v_section); v_sections:=public.website_agent_jsonb_array_insert(v_sections,v_section,v_index);
    ELSE RAISE EXCEPTION 'AI_EDIT_UNSUPPORTED_OPERATION'; END IF;
    v_doc:=pg_catalog.jsonb_set(v_doc,'{sections}',v_sections,false); v_docs:=pg_catalog.jsonb_set(v_docs,ARRAY[v_key],v_doc,false);
  END LOOP;

  FOR v_key,v_doc IN SELECT key,value FROM pg_catalog.jsonb_each(v_docs) LOOP
    v_page_id:=v_key::uuid; v_next_version:=(v_versions->>v_key)::integer+1;
    IF v_new_pages ? v_key THEN
      INSERT INTO public.website_pages(id,organization_id,site_id,name,slug,page_type,is_homepage,seo_title,seo_description,sort_order,draft_document,draft_version,created_by) VALUES(v_page_id,p_organization_id,v_site.id,v_states->v_key->>'name',v_states->v_key->>'slug','standard',false,NULLIF(v_states->v_key->>'seo_title',''),NULLIF(v_states->v_key->>'seo_description',''),(v_new_pages->v_key->>'sort_order')::integer,v_doc,1,p_actor_id);
      INSERT INTO public.website_page_versions(organization_id,site_id,page_id,version_number,document,created_by,change_summary) VALUES(p_organization_id,v_site.id,v_page_id,1,v_doc,p_actor_id,'AI-created initial draft');
    ELSE
      UPDATE public.website_pages SET draft_document=v_doc,draft_version=v_next_version,updated_at=pg_catalog.now() WHERE id=v_page_id AND site_id=v_site.id AND organization_id=p_organization_id;
      INSERT INTO public.website_page_versions(organization_id,site_id,page_id,version_number,document,created_by,change_summary) VALUES(p_organization_id,v_site.id,v_page_id,v_next_version,v_doc,p_actor_id,'AI website edits');
    END IF;
  END LOOP;
  FOR v_key,v_item IN SELECT key,value FROM pg_catalog.jsonb_each(v_meta_changed) LOOP
    IF NOT(v_new_pages ? v_key) THEN UPDATE public.website_pages SET name=v_states->v_key->>'name',slug=v_states->v_key->>'slug',seo_title=NULLIF(v_states->v_key->>'seo_title',''),seo_description=NULLIF(v_states->v_key->>'seo_description',''),updated_at=pg_catalog.now() WHERE id=v_key::uuid AND site_id=v_site.id AND organization_id=p_organization_id; END IF;
  END LOOP;
  IF v_global_changed THEN UPDATE public.website_sites SET name=v_site_name,default_locale=v_locale,global_sections=v_globals,global_version=global_version+1,updated_at=pg_catalog.now() WHERE id=v_site.id AND organization_id=p_organization_id; END IF;
  UPDATE public.website_agent_edit_plans SET status='applied',applied_at=pg_catalog.now() WHERE id=v_plan.id;
  INSERT INTO public.audit_logs(organization_id,user_name,action,details) VALUES(p_organization_id,p_actor_id,'website_agent.edit_plan_applied',pg_catalog.json_build_object('site_id',v_site.id,'proposal_id',v_plan.id,'operation_count',pg_catalog.jsonb_array_length(v_plan.plan_json->'operations'))::text);
  RETURN pg_catalog.jsonb_build_object('site_id',v_site.id,'created_page_ids',v_temp_ids,'affected_pages',(SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_docs)),'global_updated',v_global_changed);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_website_agent_page_slug(text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.validate_website_agent_page_seo(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.validate_website_agent_navigation_item(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.apply_website_agent_edit_plan(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
