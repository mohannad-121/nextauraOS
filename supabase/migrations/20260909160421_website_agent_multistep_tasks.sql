CREATE TABLE public.website_agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instruction text NOT NULL CHECK (pg_catalog.char_length(instruction) BETWEEN 1 AND 6000),
  intent text NOT NULL CHECK (intent IN ('SITE_LANGUAGE')),
  target_language text NULL CHECK (target_language IN ('en', 'ar')),
  base_versions jsonb NOT NULL CHECK (pg_catalog.jsonb_typeof(base_versions) = 'object'),
  status text NOT NULL DEFAULT 'planning' CHECK (status IN (
    'planning', 'generating', 'ready_for_review', 'applying', 'applied',
    'failed', 'cancelled', 'expired'
  )),
  total_steps integer NOT NULL DEFAULT 0 CHECK (total_steps BETWEEN 0 AND 200),
  completed_steps integer NOT NULL DEFAULT 0 CHECK (
    completed_steps >= 0 AND completed_steps <= total_steps
  ),
  error_summary text NULL CHECK (error_summary IS NULL OR pg_catalog.char_length(error_summary) <= 500),
  expires_at timestamptz NOT NULL DEFAULT (pg_catalog.now() + interval '2 hours'),
  applied_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE public.website_agent_task_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.website_agent_tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE,
  step_index integer NOT NULL CHECK (step_index BETWEEN 0 AND 199),
  step_type text NOT NULL CHECK (step_type IN ('layout', 'globals', 'page')),
  page_id uuid NULL REFERENCES public.website_pages(id) ON DELETE SET NULL,
  label text NOT NULL CHECK (pg_catalog.char_length(label) BETWEEN 1 AND 160),
  input_scope jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    pg_catalog.jsonb_typeof(input_scope) = 'object'
    AND pg_catalog.octet_length(input_scope::text) <= 32768
  ),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'cancelled'
  )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 2),
  max_attempts integer NOT NULL DEFAULT 2 CHECK (max_attempts = 2),
  proposal_id uuid NULL REFERENCES public.website_agent_edit_plans(id) ON DELETE SET NULL,
  operation_count integer NOT NULL DEFAULT 0 CHECK (operation_count BETWEEN 0 AND 30),
  error_summary text NULL CHECK (error_summary IS NULL OR pg_catalog.char_length(error_summary) <= 500),
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  UNIQUE (task_id, step_index)
);

CREATE INDEX website_agent_tasks_owner_site_status
  ON public.website_agent_tasks (created_by, organization_id, site_id, status, created_at DESC);
CREATE INDEX website_agent_task_steps_task_order
  ON public.website_agent_task_steps (task_id, step_index);

ALTER TABLE public.website_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_agent_task_steps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_agent_tasks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.website_agent_task_steps FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.website_agent_tasks TO service_role;
GRANT ALL ON public.website_agent_task_steps TO service_role;

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

  IF (v_task.base_versions->>'global_version')::integer IS DISTINCT FROM v_site.global_version
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_task.base_versions->'pages'))
       <> (SELECT pg_catalog.count(*) FROM public.website_pages AS page
           WHERE page.site_id = v_site.id AND page.organization_id = p_organization_id)
    OR EXISTS (
      SELECT 1 FROM public.website_pages AS page
      WHERE page.site_id = v_site.id
        AND page.organization_id = p_organization_id
        AND (v_task.base_versions->'pages'->>page.id::text)::integer IS DISTINCT FROM page.draft_version
    )
  THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;

  UPDATE public.website_agent_tasks
  SET status = 'applying', updated_at = pg_catalog.now(), error_summary = NULL
  WHERE id = v_task.id;

  FOR v_step IN
    SELECT * FROM public.website_agent_task_steps
    WHERE task_id = v_task.id
      AND status = 'completed'
      AND proposal_id IS NOT NULL
    ORDER BY step_index
  LOOP
    -- Each proposal is re-based inside this same transaction. The existing
    -- verified apply RPC remains the only mutation authority for every batch.
    UPDATE public.website_agent_edit_plans
    SET base_versions = pg_catalog.jsonb_build_object(
          'global_version', v_site.global_version,
          'pages', COALESCE((
            SELECT pg_catalog.jsonb_object_agg(page.id::text, page.draft_version)
            FROM public.website_pages AS page
            WHERE page.site_id = v_site.id
              AND page.organization_id = p_organization_id
          ), '{}'::jsonb),
          'page_updated_at', COALESCE((
            SELECT pg_catalog.jsonb_object_agg(page.id::text, page.updated_at)
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

  IF v_batch_count = 0 OR v_operation_count = 0 THEN
    RAISE EXCEPTION 'AI_TASK_NO_EFFECT';
  END IF;

  UPDATE public.website_agent_tasks
  SET status = 'applied', applied_at = pg_catalog.now(), updated_at = pg_catalog.now()
  WHERE id = v_task.id;

  INSERT INTO public.audit_logs (organization_id, user_name, action, details)
  VALUES (
    p_organization_id,
    p_actor_id,
    'website_agent.task_applied',
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
