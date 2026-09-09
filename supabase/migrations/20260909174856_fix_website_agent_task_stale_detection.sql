ALTER TABLE public.website_agent_tasks
  ADD COLUMN conflict_resources jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (
    pg_catalog.jsonb_typeof(conflict_resources) = 'array'
    AND pg_catalog.jsonb_array_length(conflict_resources) <= 201
  );

ALTER TABLE public.website_agent_tasks
  DROP CONSTRAINT website_agent_tasks_status_check;
ALTER TABLE public.website_agent_tasks
  ADD CONSTRAINT website_agent_tasks_status_check CHECK (status IN (
    'planning', 'generating', 'ready_for_review', 'applying', 'applied',
    'failed', 'conflict', 'cancelled', 'expired'
  ));

CREATE OR REPLACE FUNCTION public.website_agent_content_baseline(
  p_organization_id uuid,
  p_site_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_site public.website_sites;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members AS member
    WHERE member.organization_id = p_organization_id
      AND member.user_id = p_actor_id
      AND member.status = 'Active'
      AND member.role IN ('Owner', 'Admin')
  ) THEN RAISE EXCEPTION 'AI_EDIT_FORBIDDEN'; END IF;

  SELECT * INTO v_site
  FROM public.website_sites
  WHERE id = p_site_id
    AND organization_id = p_organization_id
    AND archived_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI_TASK_NOT_FOUND'; END IF;

  RETURN pg_catalog.jsonb_build_object(
    'global_version', v_site.global_version,
    'global_hash', pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          pg_catalog.jsonb_build_object(
            'name', v_site.name,
            'default_locale', v_site.default_locale,
            'global_sections', v_site.global_sections
          )::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ),
    'pages', COALESCE((
      SELECT pg_catalog.jsonb_object_agg(page.id::text, page.draft_version)
      FROM public.website_pages AS page
      WHERE page.site_id = v_site.id
        AND page.organization_id = p_organization_id
    ), '{}'::jsonb),
    'page_hashes', COALESCE((
      SELECT pg_catalog.jsonb_object_agg(
        page.id::text,
        pg_catalog.encode(
          extensions.digest(
            pg_catalog.convert_to(
              pg_catalog.jsonb_build_object(
                'name', page.name,
                'slug', page.slug,
                'seo_title', page.seo_title,
                'seo_description', page.seo_description,
                'is_homepage', page.is_homepage,
                'draft_document', page.draft_document
              )::text,
              'UTF8'
            ),
            'sha256'
          ),
          'hex'
        )
      )
      FROM public.website_pages AS page
      WHERE page.site_id = v_site.id
        AND page.organization_id = p_organization_id
    ), '{}'::jsonb),
    'page_updated_at', COALESCE((
      SELECT pg_catalog.jsonb_object_agg(page.id::text, page.updated_at::text)
      FROM public.website_pages AS page
      WHERE page.site_id = v_site.id
        AND page.organization_id = p_organization_id
    ), '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.website_agent_content_baseline(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.website_agent_content_baseline(uuid, uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.apply_website_agent_task(
  p_task_id uuid,
  p_organization_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.website_agent_tasks;
  v_step public.website_agent_task_steps;
  v_site public.website_sites;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_affected_pages jsonb := '[]'::jsonb;
  v_operation_count integer := 0;
  v_global_changed boolean := false;
  v_batch_count integer := 0;
  v_current_baseline jsonb;
  v_conflicts jsonb := '[]'::jsonb;
  v_page_key text;
BEGIN
  SELECT * INTO v_task
  FROM public.website_agent_tasks
  WHERE id = p_task_id
    AND organization_id = p_organization_id
    AND created_by = p_actor_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI_TASK_NOT_FOUND'; END IF;
  IF v_task.status = 'applied' THEN RAISE EXCEPTION 'AI_TASK_ALREADY_APPLIED'; END IF;
  IF v_task.status <> 'ready_for_review' THEN RAISE EXCEPTION 'AI_TASK_NOT_READY'; END IF;
  IF v_task.expires_at <= pg_catalog.now() THEN
    UPDATE public.website_agent_tasks SET status = 'expired', updated_at = pg_catalog.now()
    WHERE id = v_task.id;
    RAISE EXCEPTION 'AI_TASK_EXPIRED';
  END IF;

  SELECT * INTO v_site
  FROM public.website_sites
  WHERE id = v_task.site_id
    AND organization_id = p_organization_id
    AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI_TASK_NOT_FOUND'; END IF;

  v_current_baseline := public.website_agent_content_baseline(
    p_organization_id, v_task.site_id, p_actor_id
  );

  IF v_task.base_versions ? 'global_hash' THEN
    IF v_task.base_versions->>'global_hash' IS DISTINCT FROM v_current_baseline->>'global_hash' THEN
      v_conflicts := v_conflicts || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('type', 'global', 'id', v_task.site_id)
      );
    END IF;
  ELSIF (v_task.base_versions->>'global_version')::integer IS DISTINCT FROM v_site.global_version THEN
    v_conflicts := v_conflicts || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('type', 'global', 'id', v_task.site_id)
    );
  END IF;

  FOR v_page_key IN
    SELECT key FROM pg_catalog.jsonb_object_keys(
      COALESCE(v_task.base_versions->'pages', '{}'::jsonb)
    ) AS key
  LOOP
    IF NOT (v_current_baseline->'pages' ? v_page_key)
      OR (
        v_task.base_versions ? 'page_hashes'
        AND v_task.base_versions->'page_hashes'->>v_page_key
          IS DISTINCT FROM v_current_baseline->'page_hashes'->>v_page_key
      )
      OR (
        NOT (v_task.base_versions ? 'page_hashes')
        AND (v_task.base_versions->'pages'->>v_page_key)::integer
          IS DISTINCT FROM (v_current_baseline->'pages'->>v_page_key)::integer
      )
    THEN
      v_conflicts := v_conflicts || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('type', 'page', 'id', v_page_key)
      );
    END IF;
  END LOOP;

  FOR v_page_key IN
    SELECT key FROM pg_catalog.jsonb_object_keys(
      COALESCE(v_current_baseline->'pages', '{}'::jsonb)
    ) AS key
  LOOP
    IF NOT (v_task.base_versions->'pages' ? v_page_key) THEN
      v_conflicts := v_conflicts || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('type', 'page', 'id', v_page_key)
      );
    END IF;
  END LOOP;

  IF pg_catalog.jsonb_array_length(v_conflicts) > 0 THEN
    RAISE EXCEPTION 'AI_EDIT_STALE_TASK:%', v_conflicts::text;
  END IF;

  -- Version-only drift with identical hashes is a safe no-op rebase.
  UPDATE public.website_agent_tasks
  SET base_versions = v_current_baseline,
      conflict_resources = '[]'::jsonb,
      status = 'applying',
      updated_at = pg_catalog.now(),
      error_summary = NULL
  WHERE id = v_task.id;

  FOR v_step IN
    SELECT * FROM public.website_agent_task_steps
    WHERE task_id = v_task.id
      AND status = 'completed'
      AND proposal_id IS NOT NULL
    ORDER BY step_index
  LOOP
    UPDATE public.website_agent_edit_plans
    SET base_versions = pg_catalog.jsonb_build_object(
          'global_version', v_site.global_version,
          'pages', COALESCE((
            SELECT pg_catalog.jsonb_object_agg(page.id::text, page.draft_version)
            FROM public.website_pages AS page
            WHERE page.site_id = v_site.id
              AND page.organization_id = p_organization_id
          ), '{}'::jsonb),
          -- The legacy verified apply RPC compares this value to
          -- timestamptz::text, so persist that exact representation.
          'page_updated_at', COALESCE((
            SELECT pg_catalog.jsonb_object_agg(page.id::text, page.updated_at::text)
            FROM public.website_pages AS page
            WHERE page.site_id = v_site.id
              AND page.organization_id = p_organization_id
          ), '{}'::jsonb)
        ),
        expires_at = pg_catalog.now() + interval '15 minutes'
    WHERE id = v_step.proposal_id
      AND organization_id = p_organization_id
      AND site_id = v_site.id
      AND created_by = p_actor_id
      AND status = 'generated';
    IF NOT FOUND THEN RAISE EXCEPTION 'AI_TASK_INVALID_PROPOSAL'; END IF;

    v_result := public.apply_website_agent_edit_plan(
      v_step.proposal_id, p_organization_id, p_actor_id
    );
    IF COALESCE((v_result->>'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'AI_TASK_APPLY_FAILED';
    END IF;
    v_results := v_results || pg_catalog.jsonb_build_array(v_result);
    v_affected_pages := v_affected_pages || COALESCE(v_result->'affectedPages', '[]'::jsonb);
    v_operation_count := v_operation_count + COALESCE((v_result->>'operationCount')::integer, 0);
    v_global_changed := v_global_changed OR COALESCE((v_result->>'globalChanged')::boolean, false);
    v_batch_count := v_batch_count + 1;

    SELECT * INTO v_site FROM public.website_sites
    WHERE id = v_task.site_id AND organization_id = p_organization_id
    FOR UPDATE;
  END LOOP;

  IF v_batch_count = 0 OR v_operation_count = 0 THEN RAISE EXCEPTION 'AI_TASK_NO_EFFECT'; END IF;

  UPDATE public.website_agent_tasks
  SET status = 'applied', applied_at = pg_catalog.now(), updated_at = pg_catalog.now()
  WHERE id = v_task.id;

  INSERT INTO public.audit_logs (organization_id, user_name, action, details)
  VALUES (
    p_organization_id, p_actor_id, 'website_agent.task_applied',
    pg_catalog.jsonb_build_object(
      'task_id', v_task.id,
      'batch_count', v_batch_count,
      'operation_count', v_operation_count,
      'site_id', v_site.id
    )::text
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'taskId', v_task.id,
    'siteId', v_site.id,
    'batchCount', v_batch_count,
    'operationCount', v_operation_count,
    'affectedPages', v_affected_pages,
    'globalChanged', v_global_changed,
    'batches', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_website_agent_task(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_website_agent_task(uuid, uuid, uuid)
  TO service_role;
