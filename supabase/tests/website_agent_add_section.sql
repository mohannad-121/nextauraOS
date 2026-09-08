BEGIN;

DO $$
DECLARE
  v_site public.website_sites;
  v_page public.website_pages;
  v_other_page public.website_pages;
  v_actor uuid;
  v_plan_id uuid;
  v_before_version integer;
  v_before_sections integer;
  v_before_page_versions bigint;
  v_before_releases bigint;
  v_before_published_release uuid;
  v_after public.website_pages;
  v_status text;
  v_hundred_sections jsonb;
BEGIN
  SELECT s.*
  INTO v_site
  FROM public.website_sites s
  WHERE s.archived_at IS NULL
    AND EXISTS (SELECT 1 FROM public.website_pages p WHERE p.site_id = s.id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = s.organization_id
        AND m.status = 'Active'
        AND m.role IN ('Owner', 'Admin')
    )
  ORDER BY s.created_at
  LIMIT 1;

  IF v_site.id IS NULL THEN RAISE EXCEPTION 'TEST_FIXTURE_MISSING'; END IF;

  SELECT m.user_id INTO v_actor
  FROM public.organization_members m
  WHERE m.organization_id = v_site.organization_id
    AND m.status = 'Active'
    AND m.role IN ('Owner', 'Admin')
  ORDER BY m.created_at
  LIMIT 1;

  SELECT * INTO v_page
  FROM public.website_pages
  WHERE site_id = v_site.id AND organization_id = v_site.organization_id
  ORDER BY created_at
  LIMIT 1;

  SELECT * INTO v_other_page
  FROM public.website_pages
  WHERE site_id <> v_site.id
  ORDER BY created_at
  LIMIT 1;
  IF v_other_page.id IS NULL THEN RAISE EXCEPTION 'CROSS_SITE_FIXTURE_MISSING'; END IF;

  v_before_version := v_page.draft_version;
  v_before_sections := jsonb_array_length(v_page.draft_document->'sections');
  SELECT count(*) INTO v_before_page_versions FROM public.website_page_versions WHERE page_id = v_page.id;
  SELECT count(*) INTO v_before_releases FROM public.website_releases WHERE site_id = v_site.id;
  v_before_published_release := v_site.published_release_id;

  INSERT INTO public.website_agent_edit_plans(organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (
    v_site.organization_id, v_site.id, v_actor, 'Add a text section',
    jsonb_build_object('version',1,'summary','Add text section','operations',jsonb_build_array(jsonb_build_object(
      'op','add_section','pageId',v_page.id,'index',v_before_sections,
      'section',jsonb_build_object('type','text','props',jsonb_build_object('heading','AI section','body','Safe draft content','alignment','left','maxWidth',680),'style',jsonb_build_object('backgroundColor','#ffffff','textColor','#0f172a','paddingY',72))
    ))),
    jsonb_build_object('global_version',v_site.global_version,'pages',jsonb_build_object(v_page.id::text,v_page.draft_version))
  ) RETURNING id INTO v_plan_id;

  PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
  SELECT * INTO v_after FROM public.website_pages WHERE id = v_page.id;
  IF v_after.draft_version <> v_before_version + 1 THEN RAISE EXCEPTION 'VALID_ADD_VERSION_FAILED'; END IF;
  IF jsonb_array_length(v_after.draft_document->'sections') <> v_before_sections + 1 THEN RAISE EXCEPTION 'VALID_ADD_SECTION_FAILED'; END IF;
  IF (SELECT count(*) FROM public.website_page_versions WHERE page_id=v_page.id) <> v_before_page_versions + 1 THEN RAISE EXCEPTION 'IMMUTABLE_VERSION_COUNT_FAILED'; END IF;
  IF (SELECT published_release_id FROM public.website_sites WHERE id=v_site.id) IS DISTINCT FROM v_before_published_release THEN RAISE EXCEPTION 'PUBLISHED_RELEASE_CHANGED'; END IF;
  IF (SELECT count(*) FROM public.website_releases WHERE site_id=v_site.id) <> v_before_releases THEN RAISE EXCEPTION 'RELEASE_ROW_CREATED'; END IF;

  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Invalid section',jsonb_build_object('version',1,'summary','Invalid','operations',jsonb_build_array(jsonb_build_object('op','add_section','pageId',v_page.id,'index',0,'section',jsonb_build_object('type','script','props','{}'::jsonb,'style','{}'::jsonb)))),jsonb_build_object('pages',jsonb_build_object(v_page.id::text,v_after.draft_version))) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'INVALID_SECTION_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AI_EDIT_INVALID_PLAN' THEN RAISE; END IF;
  END;
  SELECT status INTO v_status FROM public.website_agent_edit_plans WHERE id=v_plan_id;
  IF v_status <> 'generated' OR (SELECT draft_version FROM public.website_pages WHERE id=v_page.id) <> v_after.draft_version THEN RAISE EXCEPTION 'INVALID_SECTION_PARTIAL_MUTATION'; END IF;

  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Cross-site page',jsonb_build_object('version',1,'summary','Cross site','operations',jsonb_build_array(jsonb_build_object('op','add_section','pageId',v_other_page.id,'index',0,'section',jsonb_build_object('type','text','props','{}'::jsonb,'style','{}'::jsonb)))),jsonb_build_object('pages',jsonb_build_object(v_other_page.id::text,v_other_page.draft_version))) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'CROSS_SITE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AI_EDIT_TARGET_NOT_FOUND' THEN RAISE; END IF;
  END;

  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Stale proposal',jsonb_build_object('version',1,'summary','Stale','operations',jsonb_build_array(jsonb_build_object('op','add_section','pageId',v_page.id,'index',0,'section',jsonb_build_object('type','text','props','{}'::jsonb,'style','{}'::jsonb)))),jsonb_build_object('pages',jsonb_build_object(v_page.id::text,v_after.draft_version-1))) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'STALE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AI_EDIT_STALE_PROPOSAL' THEN RAISE; END IF;
  END;

  SELECT jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'type','text','props','{}'::jsonb,'style','{}'::jsonb)) INTO v_hundred_sections FROM generate_series(1,100);
  UPDATE public.website_pages SET draft_document=jsonb_set(draft_document,'{sections}',v_hundred_sections),draft_version=draft_version+1 WHERE id=v_page.id RETURNING * INTO v_after;
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Over section limit',jsonb_build_object('version',1,'summary','Limit','operations',jsonb_build_array(jsonb_build_object('op','add_section','pageId',v_page.id,'index',100,'section',jsonb_build_object('type','text','props','{}'::jsonb,'style','{}'::jsonb)))),jsonb_build_object('pages',jsonb_build_object(v_page.id::text,v_after.draft_version))) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'SECTION_LIMIT_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AI_EDIT_SECTION_LIMIT' THEN RAISE; END IF;
  END;
  IF (SELECT draft_version FROM public.website_pages WHERE id=v_page.id) <> v_after.draft_version THEN RAISE EXCEPTION 'LIMIT_FAILURE_PARTIAL_MUTATION'; END IF;
END;
$$;

SELECT 'PASS: add_section transaction, validation, versioning, release immutability, and rollback checks' AS result;
ROLLBACK;
