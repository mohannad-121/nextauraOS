BEGIN;

DO $$
DECLARE
  v_site public.website_sites;
  v_actor uuid;
  v_task_id uuid;
  v_first_plan uuid;
  v_second_plan uuid;
  v_result jsonb;
  v_release_id uuid;
  v_release_count bigint;
BEGIN
  SELECT site.* INTO v_site
  FROM public.website_sites AS site
  WHERE site.archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS member
      WHERE member.organization_id = site.organization_id
        AND member.status = 'Active'
        AND member.role IN ('Owner', 'Admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.website_pages AS page WHERE page.site_id = site.id
    )
  ORDER BY site.created_at
  LIMIT 1;
  IF v_site.id IS NULL THEN RAISE EXCEPTION 'TEST_FIXTURE_MISSING'; END IF;

  SELECT member.user_id INTO v_actor
  FROM public.organization_members AS member
  WHERE member.organization_id = v_site.organization_id
    AND member.status = 'Active'
    AND member.role IN ('Owner', 'Admin')
  ORDER BY member.created_at
  LIMIT 1;

  v_release_id := v_site.published_release_id;
  SELECT pg_catalog.count(*) INTO v_release_count
  FROM public.website_releases WHERE site_id = v_site.id;

  INSERT INTO public.website_agent_tasks (
    organization_id, site_id, created_by, instruction, intent,
    target_language, base_versions, status, total_steps, completed_steps
  ) VALUES (
    v_site.organization_id, v_site.id, v_actor, 'Make the site Arabic',
    'SITE_LANGUAGE', 'ar', pg_catalog.jsonb_build_object(
      'global_version', v_site.global_version,
      'pages', COALESCE((
        SELECT pg_catalog.jsonb_object_agg(page.id::text, page.draft_version)
        FROM public.website_pages AS page WHERE page.site_id = v_site.id
      ), '{}'::jsonb)
    ), 'ready_for_review', 2, 2
  ) RETURNING id INTO v_task_id;

  INSERT INTO public.website_agent_edit_plans (
    organization_id, site_id, created_by, instruction, plan_json, base_versions
  ) VALUES (
    v_site.organization_id, v_site.id, v_actor, 'Arabic metadata',
    pg_catalog.jsonb_build_object(
      'version', 1,
      'summary', 'Arabic language',
      'operations', (SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'op', 'update_site_metadata',
          'changes', pg_catalog.jsonb_build_object('language', 'ar')
        )
      ) FROM pg_catalog.generate_series(1, 20))
    ),
    pg_catalog.jsonb_build_object('global_version', v_site.global_version, 'pages', '{}'::jsonb)
  ) RETURNING id INTO v_first_plan;

  INSERT INTO public.website_agent_edit_plans (
    organization_id, site_id, created_by, instruction, plan_json, base_versions
  ) VALUES (
    v_site.organization_id, v_site.id, v_actor, 'Arabic layout',
    pg_catalog.jsonb_build_object(
      'version', 1,
      'summary', 'RTL layout',
      'operations', (SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'op', 'update_site_theme',
          'theme', pg_catalog.jsonb_build_object(
            'direction', 'rtl',
            'headingFont', 'IBM Plex Sans Arabic',
            'bodyFont', 'Noto Sans Arabic'
          )
        )
      ) FROM pg_catalog.generate_series(1, 11))
    ),
    pg_catalog.jsonb_build_object('global_version', v_site.global_version, 'pages', '{}'::jsonb)
  ) RETURNING id INTO v_second_plan;

  INSERT INTO public.website_agent_task_steps (
    task_id, organization_id, site_id, step_index, step_type, label,
    status, proposal_id, operation_count, completed_at
  ) VALUES
    (v_task_id, v_site.organization_id, v_site.id, 0, 'layout', 'Language', 'completed', v_first_plan, 20, pg_catalog.now()),
    (v_task_id, v_site.organization_id, v_site.id, 1, 'layout', 'Direction', 'completed', v_second_plan, 11, pg_catalog.now());

  v_result := public.apply_website_agent_task(v_task_id, v_site.organization_id, v_actor);
  SELECT * INTO v_site FROM public.website_sites WHERE id = v_site.id;

  IF COALESCE((v_result->>'success')::boolean, false) IS NOT TRUE
    OR (v_result->>'batchCount')::integer <> 2
    OR (v_result->>'operationCount')::integer <> 31
    OR v_site.default_locale <> 'ar'
    OR EXISTS (
      SELECT 1 FROM public.website_pages AS page
      WHERE page.site_id = v_site.id
        AND (
          page.draft_document #>> '{theme,direction}' <> 'rtl'
          OR page.draft_document #>> '{theme,headingFont}' <> 'IBM Plex Sans Arabic'
          OR page.draft_document #>> '{theme,bodyFont}' <> 'Noto Sans Arabic'
        )
    )
  THEN RAISE EXCEPTION 'MULTISTEP_APPLY_FAILED'; END IF;

  IF v_site.published_release_id IS DISTINCT FROM v_release_id
    OR (SELECT pg_catalog.count(*) FROM public.website_releases WHERE site_id = v_site.id) <> v_release_count
  THEN RAISE EXCEPTION 'MULTISTEP_TASK_PUBLISHED'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.website_agent_tasks
    WHERE id = v_task_id AND status <> 'applied'
  ) THEN RAISE EXCEPTION 'MULTISTEP_TASK_STATUS_FAILED'; END IF;
END;
$$;

SELECT 'PASS: grouped task apply is verified, transactional, and draft-only' AS result;
ROLLBACK;
