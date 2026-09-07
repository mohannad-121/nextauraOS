CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.invoke_automation_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'automation_worker_schedule_secret'
  LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Automation worker scheduler secret is not configured.';
  END IF;
  PERFORM extensions.http_post(
    url := 'https://vsivakmwvdyqhrrusgmp.supabase.co/functions/v1/automation-worker',
    headers := jsonb_build_object('content-type', 'application/json', 'x-automation-worker-secret', v_secret),
    body := jsonb_build_object('batchSize', 25)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_automation_worker() FROM PUBLIC, anon, authenticated;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'nextaura-automation-worker-every-minute';
SELECT cron.schedule('nextaura-automation-worker-every-minute', '* * * * *', 'SELECT public.invoke_automation_worker()');
