CREATE TABLE public.automation_action_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  action_index INTEGER NOT NULL CHECK (action_index >= 0),
  action_type TEXT NOT NULL CHECK (action_type = 'outgoing_webhook'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  http_status INTEGER NULL CHECK (http_status BETWEEN 100 AND 599),
  error_summary TEXT NULL CHECK (error_summary IS NULL OR char_length(error_summary) <= 1000),
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT automation_action_deliveries_run_action_unique UNIQUE (run_id, action_index)
);

CREATE INDEX idx_automation_action_deliveries_organization_created
  ON public.automation_action_deliveries(organization_id, created_at DESC);

ALTER TABLE public.automation_action_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_action_deliveries FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_automation_action_delivery_organization_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.automation_runs AS run
    WHERE run.id = NEW.run_id
      AND run.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Automation action delivery organization must match its run.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_automation_action_deliveries_organization_consistency
  BEFORE INSERT OR UPDATE OF organization_id, run_id ON public.automation_action_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.assert_automation_action_delivery_organization_consistency();

CREATE OR REPLACE FUNCTION public.complete_automation_run_terminal_failure(
  p_run_id UUID,
  p_lease_token UUID,
  p_summary TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF p_run_id IS NULL OR p_lease_token IS NULL OR p_summary IS NULL OR char_length(p_summary) > 1000 THEN
    RAISE EXCEPTION 'A valid run lease and summary are required.';
  END IF;

  UPDATE public.automation_runs AS run
  SET status = 'failed',
      result_summary = NULL,
      error_summary = p_summary,
      completed_at = NOW(),
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

REVOKE EXECUTE ON FUNCTION public.assert_automation_action_delivery_organization_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_automation_run_terminal_failure(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_automation_run_terminal_failure(UUID, UUID, TEXT) TO service_role;
