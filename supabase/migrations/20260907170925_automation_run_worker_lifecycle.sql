ALTER TABLE public.automation_events
  ADD COLUMN processed_at TIMESTAMPTZ NULL;

CREATE INDEX idx_automation_events_unprocessed_occurred
  ON public.automation_events(occurred_at ASC)
  WHERE processed_at IS NULL;

CREATE TABLE public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.automation_events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  locked_until TIMESTAMPTZ NULL,
  lease_token UUID NULL,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 512),
  error_summary TEXT NULL CHECK (error_summary IS NULL OR char_length(error_summary) <= 1000),
  result_summary TEXT NULL CHECK (result_summary IS NULL OR char_length(result_summary) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT automation_runs_workflow_event_unique UNIQUE (workflow_id, event_id),
  CONSTRAINT automation_runs_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX idx_automation_runs_claimable
  ON public.automation_runs(status, next_attempt_at ASC, created_at ASC)
  WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_automation_runs_expired_leases
  ON public.automation_runs(locked_until ASC)
  WHERE status = 'running';
CREATE INDEX idx_automation_runs_organization_created
  ON public.automation_runs(organization_id, created_at DESC);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_runs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_automation_run_organization_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.automation_workflows AS workflow
    JOIN public.automation_events AS event ON event.id = NEW.event_id
    WHERE workflow.id = NEW.workflow_id
      AND workflow.organization_id = NEW.organization_id
      AND event.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Automation run organization must match its workflow and event.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_automation_runs_organization_consistency
  BEFORE INSERT OR UPDATE OF organization_id, workflow_id, event_id ON public.automation_runs
  FOR EACH ROW EXECUTE FUNCTION public.assert_automation_run_organization_consistency();

CREATE OR REPLACE FUNCTION public.enqueue_automation_runs(p_event_batch_size INTEGER DEFAULT 25)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event public.automation_events%ROWTYPE;
  v_target public.organizations%ROWTYPE;
  v_root public.organizations%ROWTYPE;
  v_plan TEXT := 'one_app_free';
  v_subscription_status TEXT;
  v_automation_access BOOLEAN := false;
  v_inserted INTEGER;
  v_events_processed INTEGER := 0;
  v_runs_created INTEGER := 0;
BEGIN
  IF p_event_batch_size IS NULL OR p_event_batch_size < 1 OR p_event_batch_size > 100 THEN
    RAISE EXCEPTION 'Event batch size must be between 1 and 100.';
  END IF;

  FOR v_event IN
    SELECT *
    FROM public.automation_events
    WHERE processed_at IS NULL
    ORDER BY occurred_at ASC, id ASC
    LIMIT p_event_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_target FROM public.organizations WHERE id = v_event.organization_id;
    SELECT * INTO v_root FROM public.organizations
      WHERE id = COALESCE(v_target.billing_root_organization_id, v_target.id);
    SELECT plan, status INTO v_plan, v_subscription_status
      FROM public.organization_subscriptions
      WHERE organization_id = v_root.id;
    v_plan := COALESCE(v_plan, 'one_app_free');
    SELECT automation_access INTO v_automation_access
      FROM public.plan_capabilities WHERE plan = v_plan;
    v_automation_access := COALESCE(v_automation_access, false);

    IF v_target.lifecycle_status = 'active'
      AND v_root.lifecycle_status = 'active'
      AND v_subscription_status IN ('active', 'trialing', 'past_due')
      AND v_automation_access THEN
      INSERT INTO public.automation_runs (
        organization_id, workflow_id, event_id, idempotency_key
      )
      SELECT
        v_event.organization_id,
        workflow.id,
        v_event.id,
        format('automation-run:%s:%s', workflow.id, v_event.id)
      FROM public.automation_workflows AS workflow
      WHERE workflow.organization_id = v_event.organization_id
        AND workflow.enabled = true
        AND workflow.trigger_type = v_event.event_type
      ON CONFLICT (workflow_id, event_id) DO NOTHING;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      v_runs_created := v_runs_created + v_inserted;
    END IF;

    UPDATE public.automation_events SET processed_at = NOW() WHERE id = v_event.id;
    v_events_processed := v_events_processed + 1;
  END LOOP;

  RETURN jsonb_build_object('events_processed', v_events_processed, 'runs_created', v_runs_created);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_automation_runs(
  p_run_batch_size INTEGER DEFAULT 25,
  p_lease_seconds INTEGER DEFAULT 120,
  p_lease_token UUID DEFAULT gen_random_uuid()
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  workflow_id UUID,
  event_id UUID,
  attempt_count INTEGER,
  lease_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_run_batch_size IS NULL OR p_run_batch_size < 1 OR p_run_batch_size > 100 THEN
    RAISE EXCEPTION 'Run batch size must be between 1 and 100.';
  END IF;
  IF p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'Lease duration must be between 30 and 900 seconds.';
  END IF;
  IF p_lease_token IS NULL THEN
    RAISE EXCEPTION 'Lease token is required.';
  END IF;

  UPDATE public.automation_runs
  SET status = 'failed',
      error_summary = 'Lease expired after the maximum number of attempts.',
      completed_at = NOW(),
      locked_until = NULL,
      lease_token = NULL
  WHERE status = 'running'
    AND locked_until <= NOW()
    AND attempt_count >= max_attempts;

  RETURN QUERY
  WITH candidates AS (
    SELECT run.id
    FROM public.automation_runs AS run
    WHERE run.attempt_count < run.max_attempts
      AND (
        (run.status IN ('pending', 'retrying') AND run.next_attempt_at <= NOW())
        OR (run.status = 'running' AND run.locked_until <= NOW())
      )
    ORDER BY run.next_attempt_at ASC, run.created_at ASC
    LIMIT p_run_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.automation_runs AS run
  SET status = 'running',
      attempt_count = run.attempt_count + 1,
      started_at = COALESCE(run.started_at, NOW()),
      locked_until = NOW() + make_interval(secs => p_lease_seconds),
      lease_token = p_lease_token,
      error_summary = NULL
  FROM candidates
  WHERE run.id = candidates.id
  RETURNING run.id, run.organization_id, run.workflow_id, run.event_id, run.attempt_count, run.lease_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_automation_run(
  p_run_id UUID,
  p_lease_token UUID,
  p_succeeded BOOLEAN,
  p_summary TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF p_run_id IS NULL OR p_lease_token IS NULL THEN
    RAISE EXCEPTION 'Run ID and lease token are required.';
  END IF;
  IF p_summary IS NOT NULL AND char_length(p_summary) > 1000 THEN
    RAISE EXCEPTION 'Run summary is too long.';
  END IF;

  UPDATE public.automation_runs AS run
  SET status = CASE
        WHEN p_succeeded THEN 'completed'
        WHEN run.attempt_count >= run.max_attempts THEN 'failed'
        ELSE 'retrying'
      END,
      result_summary = CASE WHEN p_succeeded THEN p_summary ELSE NULL END,
      error_summary = CASE WHEN p_succeeded THEN NULL ELSE COALESCE(p_summary, 'Automation run failed.') END,
      completed_at = CASE WHEN p_succeeded OR run.attempt_count >= run.max_attempts THEN NOW() ELSE NULL END,
      next_attempt_at = CASE
        WHEN p_succeeded OR run.attempt_count >= run.max_attempts THEN run.next_attempt_at
        ELSE NOW() + make_interval(secs => LEAST(3600, (30 * power(2, LEAST(run.attempt_count - 1, 6)))::INTEGER))
      END,
      locked_until = NULL,
      lease_token = NULL
  WHERE run.id = p_run_id
    AND run.status = 'running'
    AND run.lease_token = p_lease_token
    AND run.locked_until > NOW()
  RETURNING run.status INTO v_status;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Run lease is no longer valid.';
  END IF;
  RETURN v_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_automation_run_organization_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_automation_runs(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_automation_runs(INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_automation_run(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_automation_runs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_automation_runs(INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_automation_run(UUID, UUID, BOOLEAN, TEXT) TO service_role;
