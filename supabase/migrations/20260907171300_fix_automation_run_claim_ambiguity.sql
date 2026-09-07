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

  UPDATE public.automation_runs AS run
  SET status = 'failed',
      error_summary = 'Lease expired after the maximum number of attempts.',
      completed_at = NOW(),
      locked_until = NULL,
      lease_token = NULL
  WHERE run.status = 'running'
    AND run.locked_until <= NOW()
    AND run.attempt_count >= run.max_attempts;

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
