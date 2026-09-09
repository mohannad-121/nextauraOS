BEGIN;

DO $$
DECLARE
  v_site public.website_sites;
  v_page public.website_pages;
  v_actor uuid;
  v_task_id uuid;
  v_plan_id uuid;
  v_baseline jsonb;
  v_before_name text;
  v_result jsonb;
BEGIN
  SELECT site.* INTO v_site
  FROM public.website_sites AS site
  WHERE site.archived_at IS NULL
    AND EXISTS (SELECT 1 FROM public.website_pages AS page WHERE page.site_id = site.id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS member
      WHERE member.organization_id = site.organization_id
        AND member.status = 'Active' AND member.role IN ('Owner', 'Admin')
    )
  ORDER BY site.created_at LIMIT 1;
  IF v_site.id IS NULL THEN RAISE EXCEPTION 'TEST_FIXTURE_MISSING'; END IF;
  SELECT member.user_id INTO v_actor
  FROM public.organization_members AS member
  WHERE member.organization_id = v_site.organization_id
    AND member.status = 'Active' AND member.role IN ('Owner', 'Admin')
  ORDER BY member.created_at LIMIT 1;
  SELECT * INTO v_page FROM public.website_pages
  WHERE site_id = v_site.id ORDER BY created_at LIMIT 1;

  -- A. A version-only increment with identical authoritative content is safely rebased.
  v_baseline := public.website_agent_content_baseline(v_site.organization_id, v_site.id, v_actor);
  INSERT INTO public.website_agent_tasks (
    organization_id, site_id, created_by, instruction, intent, target_language,
    base_versions, status, total_steps, completed_steps
  ) VALUES (
    v_site.organization_id, v_site.id, v_actor, 'No-op rebase test', 'SITE_LANGUAGE',
    'en', v_baseline, 'ready_for_review', 1, 1
  ) RETURNING id INTO v_task_id;
  INSERT INTO public.website_agent_edit_plans (
    organization_id, site_id, created_by, instruction, plan_json, base_versions
  ) VALUES (
    v_site.organization_id, v_site.id, v_actor, 'Safe metadata edit',
    pg_catalog.jsonb_build_object(
      'version', 1, 'summary', 'Safe metadata edit',
      'operations', pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'op', 'update_site_metadata',
        'changes', pg_catalog.jsonb_build_object('name', v_site.name || ' Rebased')
      ))
    ), v_baseline
  ) RETURNING id INTO v_plan_id;
  INSERT INTO public.website_agent_task_steps (
    task_id, organization_id, site_id, step_index, step_type, label,
    status, proposal_id, operation_count, completed_at
  ) VALUES (
    v_task_id, v_site.organization_id, v_site.id, 0, 'globals', 'Safe edit',
    'completed', v_plan_id, 1, pg_catalog.now()
  );
  UPDATE public.website_pages
  SET draft_version = draft_version + 1
  WHERE id = v_page.id;
  v_result := public.apply_website_agent_task(v_task_id, v_site.organization_id, v_actor);
  IF COALESCE((v_result->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'NO_OP_REBASE_FAILED';
  END IF;

  -- B. A genuine document mutation is still rejected and never overwritten.
  SELECT * INTO v_site FROM public.website_sites WHERE id = v_site.id;
  SELECT * INTO v_page FROM public.website_pages WHERE id = v_page.id;
  v_before_name := v_site.name;
  v_baseline := public.website_agent_content_baseline(v_site.organization_id, v_site.id, v_actor);
  INSERT INTO public.website_agent_tasks (
    organization_id, site_id, created_by, instruction, intent, target_language,
    base_versions, status, total_steps, completed_steps
  ) VALUES (
    v_site.organization_id, v_site.id, v_actor, 'Real conflict test', 'SITE_LANGUAGE',
    'ar', v_baseline, 'ready_for_review', 1, 1
  ) RETURNING id INTO v_task_id;
  INSERT INTO public.website_agent_edit_plans (
    organization_id, site_id, created_by, instruction, plan_json, base_versions
  ) VALUES (
    v_site.organization_id, v_site.id, v_actor, 'Must not apply',
    pg_catalog.jsonb_build_object(
      'version', 1, 'summary', 'Must not apply',
      'operations', pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'op', 'update_site_metadata',
        'changes', pg_catalog.jsonb_build_object('name', 'Must Not Apply')
      ))
    ), v_baseline
  ) RETURNING id INTO v_plan_id;
  INSERT INTO public.website_agent_task_steps (
    task_id, organization_id, site_id, step_index, step_type, label,
    status, proposal_id, operation_count, completed_at
  ) VALUES (
    v_task_id, v_site.organization_id, v_site.id, 0, 'globals', 'Conflicting edit',
    'completed', v_plan_id, 1, pg_catalog.now()
  );
  UPDATE public.website_pages
  SET draft_document = pg_catalog.jsonb_set(
        draft_document,
        '{version}',
        pg_catalog.to_jsonb(COALESCE((draft_document->>'version')::integer, 1) + 1),
        true
      ),
      draft_version = draft_version + 1
  WHERE id = v_page.id;
  BEGIN
    PERFORM public.apply_website_agent_task(v_task_id, v_site.organization_id, v_actor);
    RAISE EXCEPTION 'GENUINE_CONFLICT_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'AI_EDIT_STALE_TASK:%' THEN RAISE; END IF;
  END;
  IF (SELECT name FROM public.website_sites WHERE id = v_site.id) IS DISTINCT FROM v_before_name THEN
    RAISE EXCEPTION 'GENUINE_CONFLICT_OVERWROTE_SITE';
  END IF;
END;
$$;

SELECT 'PASS: no-op drift rebases and genuine content conflicts remain protected' AS result;
ROLLBACK;
