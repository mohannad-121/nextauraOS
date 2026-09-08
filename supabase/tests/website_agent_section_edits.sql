BEGIN;

DO $$
DECLARE
  v_site public.website_sites;
  v_page public.website_pages;
  v_actor uuid;
  v_plan_id uuid;
  v_before_version integer;
  v_before_page_versions bigint;
  v_before_releases bigint;
  v_before_published_release uuid;
  v_before_document jsonb;
  v_after public.website_pages;
  v_status text;
  v_sections jsonb;
  v_hundred_sections jsonb;
  v_duplicate_id text;
  v_id_one constant text := '11111111-1111-4111-8111-111111111111';
  v_id_two constant text := '22222222-2222-4222-8222-222222222222';
  v_id_three constant text := '33333333-3333-4333-8333-333333333333';
BEGIN
  SELECT s.*
  INTO v_site
  FROM public.website_sites s
  WHERE s.archived_at IS NULL
    AND EXISTS (SELECT 1 FROM public.website_pages p WHERE p.site_id = s.id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.organization_id = s.organization_id
        AND m.status = 'Active'
        AND m.role IN ('Owner', 'Admin')
    )
  ORDER BY s.created_at
  LIMIT 1;

  IF v_site.id IS NULL THEN RAISE EXCEPTION 'TEST_FIXTURE_MISSING'; END IF;

  SELECT m.user_id
  INTO v_actor
  FROM public.organization_members m
  WHERE m.organization_id = v_site.organization_id
    AND m.status = 'Active'
    AND m.role IN ('Owner', 'Admin')
  ORDER BY m.created_at
  LIMIT 1;

  SELECT *
  INTO v_page
  FROM public.website_pages
  WHERE site_id = v_site.id
    AND organization_id = v_site.organization_id
  ORDER BY created_at
  LIMIT 1;

  v_sections := pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('id', v_id_one, 'type', 'text', 'props', pg_catalog.jsonb_build_object('heading', 'One', 'body', 'First'), 'style', pg_catalog.jsonb_build_object('paddingY', 40)),
    pg_catalog.jsonb_build_object('id', v_id_two, 'type', 'text', 'props', pg_catalog.jsonb_build_object('heading', 'Two', 'body', 'Second'), 'style', pg_catalog.jsonb_build_object('paddingY', 48)),
    pg_catalog.jsonb_build_object('id', v_id_three, 'type', 'text', 'props', pg_catalog.jsonb_build_object('heading', 'Three', 'body', 'Third'), 'style', pg_catalog.jsonb_build_object('paddingY', 56))
  );
  UPDATE public.website_pages
  SET draft_document = pg_catalog.jsonb_set(draft_document, '{sections}', v_sections, false)
  WHERE id = v_page.id
  RETURNING * INTO v_page;

  SELECT pg_catalog.count(*) INTO v_before_releases FROM public.website_releases WHERE site_id = v_site.id;
  v_before_published_release := v_site.published_release_id;

  -- A. A valid props/style update succeeds and preserves the section type.
  v_before_version := v_page.draft_version;
  SELECT pg_catalog.count(*) INTO v_before_page_versions FROM public.website_page_versions WHERE page_id = v_page.id;
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (
    v_site.organization_id, v_site.id, v_actor, 'Update section',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Update section', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'update_section', 'pageId', v_page.id, 'sectionId', v_id_one, 'changes', pg_catalog.jsonb_build_object('props', pg_catalog.jsonb_build_object('heading', 'Updated'), 'style', pg_catalog.jsonb_build_object('paddingY', 64)))
    )),
    pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version))
  ) RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
  SELECT * INTO v_page FROM public.website_pages WHERE id = v_page.id;
  IF v_page.draft_version <> v_before_version + 1
    OR v_page.draft_document->'sections'->0->>'type' <> 'text'
    OR v_page.draft_document->'sections'->0->'props'->>'heading' <> 'Updated'
    OR (v_page.draft_document->'sections'->0->'style'->>'paddingY')::integer <> 64
  THEN RAISE EXCEPTION 'UPDATE_SECTION_FAILED'; END IF;
  IF (SELECT pg_catalog.count(*) FROM public.website_page_versions WHERE page_id = v_page.id) <> v_before_page_versions + 1 THEN RAISE EXCEPTION 'UPDATE_VERSION_ROW_FAILED'; END IF;

  -- B. Unknown props are rejected without mutation.
  v_before_document := v_page.draft_document;
  v_before_version := v_page.draft_version;
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Invalid property',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Invalid property', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'update_section', 'pageId', v_page.id, 'sectionId', v_id_one, 'changes', pg_catalog.jsonb_build_object('props', pg_catalog.jsonb_build_object('onclick', 'alert(1)')))
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
    RAISE EXCEPTION 'INVALID_UPDATE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_INVALID_PLAN' THEN RAISE; END IF; END;
  IF (SELECT draft_version FROM public.website_pages WHERE id = v_page.id) <> v_before_version
    OR (SELECT draft_document FROM public.website_pages WHERE id = v_page.id) <> v_before_document
  THEN RAISE EXCEPTION 'INVALID_UPDATE_MUTATED_PAGE'; END IF;

  -- C. Type changes are not part of the update contract.
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Change type',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Change type', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'update_section', 'pageId', v_page.id, 'sectionId', v_id_one, 'changes', pg_catalog.jsonb_build_object('type', 'hero'))
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
    RAISE EXCEPTION 'TYPE_CHANGE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_INVALID_PLAN' THEN RAISE; END IF; END;

  -- D. Remove succeeds.
  v_before_version := v_page.draft_version;
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Remove section',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Remove section', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'remove_section', 'pageId', v_page.id, 'sectionId', v_id_three)
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
  SELECT * INTO v_page FROM public.website_pages WHERE id = v_page.id;
  IF v_page.draft_version <> v_before_version + 1
    OR pg_catalog.jsonb_array_length(v_page.draft_document->'sections') <> 2
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_page.draft_document->'sections') AS section WHERE section->>'id' = v_id_three)
  THEN RAISE EXCEPTION 'REMOVE_SECTION_FAILED'; END IF;

  -- E. A missing remove target is an error, not a no-op.
  v_before_version := v_page.draft_version;
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Missing remove',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Missing remove', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'remove_section', 'pageId', v_page.id, 'sectionId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
    RAISE EXCEPTION 'MISSING_REMOVE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_TARGET_NOT_FOUND' THEN RAISE; END IF; END;
  IF (SELECT draft_version FROM public.website_pages WHERE id = v_page.id) <> v_before_version THEN RAISE EXCEPTION 'MISSING_REMOVE_MUTATED_PAGE'; END IF;

  -- F/G. Move is deterministic and rejects an out-of-range destination.
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Move section',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Move section', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'move_section', 'pageId', v_page.id, 'sectionId', v_id_two, 'index', 0)
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
  SELECT * INTO v_page FROM public.website_pages WHERE id = v_page.id;
  IF v_page.draft_document->'sections'->0->>'id' <> v_id_two OR v_page.draft_document->'sections'->1->>'id' <> v_id_one THEN RAISE EXCEPTION 'MOVE_ORDER_FAILED'; END IF;

  v_before_document := v_page.draft_document;
  v_before_version := v_page.draft_version;
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Invalid move',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Invalid move', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'move_section', 'pageId', v_page.id, 'sectionId', v_id_two, 'index', 2)
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
    RAISE EXCEPTION 'INVALID_MOVE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_INVALID_INDEX' THEN RAISE; END IF; END;
  IF (SELECT draft_document FROM public.website_pages WHERE id = v_page.id) <> v_before_document
    OR (SELECT draft_version FROM public.website_pages WHERE id = v_page.id) <> v_before_version
  THEN RAISE EXCEPTION 'INVALID_MOVE_MUTATED_PAGE'; END IF;

  -- H/I. Duplicate copies the source and receives a new server-generated ID.
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Duplicate section',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Duplicate section', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'duplicate_section', 'pageId', v_page.id, 'sectionId', v_id_two, 'index', 1)
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
  SELECT * INTO v_page FROM public.website_pages WHERE id = v_page.id;
  v_duplicate_id := v_page.draft_document->'sections'->1->>'id';
  IF pg_catalog.jsonb_array_length(v_page.draft_document->'sections') <> 3
    OR v_duplicate_id = v_id_two
    OR v_duplicate_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR ((v_page.draft_document->'sections'->1) - 'id') <> ((v_page.draft_document->'sections'->0) - 'id')
  THEN RAISE EXCEPTION 'DUPLICATE_SECTION_FAILED'; END IF;

  -- J. Duplicating at the page limit is rejected.
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', extensions.gen_random_uuid(), 'type', 'text', 'props', '{}'::jsonb, 'style', '{}'::jsonb
  )) INTO v_hundred_sections FROM pg_catalog.generate_series(1, 100);
  v_before_document := v_page.draft_document;
  UPDATE public.website_pages
  SET draft_document = pg_catalog.jsonb_set(draft_document, '{sections}', v_hundred_sections, false)
  WHERE id = v_page.id
  RETURNING * INTO v_after;
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Duplicate at limit',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Duplicate at limit', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'duplicate_section', 'pageId', v_page.id, 'sectionId', v_hundred_sections->0->>'id', 'index', 1)
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_after.draft_version)))
  RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
    RAISE EXCEPTION 'SECTION_LIMIT_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_SECTION_LIMIT' THEN RAISE; END IF; END;
  IF (SELECT draft_version FROM public.website_pages WHERE id = v_page.id) <> v_after.draft_version THEN RAISE EXCEPTION 'LIMIT_FAILURE_MUTATED_VERSION'; END IF;
  UPDATE public.website_pages SET draft_document = v_before_document WHERE id = v_page.id RETURNING * INTO v_page;

  -- K/L. Multiple same-page operations write one draft and one immutable version.
  v_before_version := v_page.draft_version;
  SELECT pg_catalog.count(*) INTO v_before_page_versions FROM public.website_page_versions WHERE page_id = v_page.id;
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Multi operation',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Update move remove', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'update_section', 'pageId', v_page.id, 'sectionId', v_id_one, 'changes', pg_catalog.jsonb_build_object('props', pg_catalog.jsonb_build_object('heading', 'Atomic update'))),
      pg_catalog.jsonb_build_object('op', 'move_section', 'pageId', v_page.id, 'sectionId', v_id_one, 'index', 0),
      pg_catalog.jsonb_build_object('op', 'remove_section', 'pageId', v_page.id, 'sectionId', v_id_two)
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
  SELECT * INTO v_page FROM public.website_pages WHERE id = v_page.id;
  IF v_page.draft_version <> v_before_version + 1 THEN RAISE EXCEPTION 'MULTI_OP_VERSION_INCREMENT_FAILED'; END IF;
  IF (SELECT pg_catalog.count(*) FROM public.website_page_versions WHERE page_id = v_page.id) <> v_before_page_versions + 1 THEN RAISE EXCEPTION 'MULTI_OP_VERSION_ROW_FAILED'; END IF;
  IF v_page.draft_document->'sections'->0->>'id' <> v_id_one
    OR v_page.draft_document->'sections'->0->'props'->>'heading' <> 'Atomic update'
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_page.draft_document->'sections') AS section WHERE section->>'id' = v_id_two)
  THEN RAISE EXCEPTION 'MULTI_OP_RESULT_FAILED'; END IF;

  -- M. A failure in the middle rolls back all earlier in-memory operations.
  v_before_document := v_page.draft_document;
  v_before_version := v_page.draft_version;
  SELECT pg_catalog.count(*) INTO v_before_page_versions FROM public.website_page_versions WHERE page_id = v_page.id;
  INSERT INTO public.website_agent_edit_plans (organization_id, site_id, created_by, instruction, plan_json, base_versions)
  VALUES (v_site.organization_id, v_site.id, v_actor, 'Atomic failure',
    pg_catalog.jsonb_build_object('version', 1, 'summary', 'Update then fail', 'operations', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op', 'update_section', 'pageId', v_page.id, 'sectionId', v_id_one, 'changes', pg_catalog.jsonb_build_object('props', pg_catalog.jsonb_build_object('heading', 'Must roll back'))),
      pg_catalog.jsonb_build_object('op', 'remove_section', 'pageId', v_page.id, 'sectionId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    )), pg_catalog.jsonb_build_object('pages', pg_catalog.jsonb_build_object(v_page.id::text, v_page.draft_version)))
  RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id, v_site.organization_id, v_actor);
    RAISE EXCEPTION 'MIDDLE_FAILURE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_TARGET_NOT_FOUND' THEN RAISE; END IF; END;
  SELECT status INTO v_status FROM public.website_agent_edit_plans WHERE id = v_plan_id;
  IF (SELECT draft_document FROM public.website_pages WHERE id = v_page.id) <> v_before_document
    OR (SELECT draft_version FROM public.website_pages WHERE id = v_page.id) <> v_before_version
    OR (SELECT pg_catalog.count(*) FROM public.website_page_versions WHERE page_id = v_page.id) <> v_before_page_versions
    OR v_status <> 'generated'
  THEN RAISE EXCEPTION 'MIDDLE_FAILURE_PARTIAL_MUTATION'; END IF;

  -- N/O. Applying drafts never changes or creates publishing state.
  IF (SELECT published_release_id FROM public.website_sites WHERE id = v_site.id) IS DISTINCT FROM v_before_published_release THEN RAISE EXCEPTION 'PUBLISHED_RELEASE_CHANGED'; END IF;
  IF (SELECT pg_catalog.count(*) FROM public.website_releases WHERE site_id = v_site.id) <> v_before_releases THEN RAISE EXCEPTION 'WEBSITE_RELEASE_CREATED'; END IF;
END;
$$;

SELECT 'PASS: section edit operations, validation, atomicity, versioning, and release immutability' AS result;
ROLLBACK;
