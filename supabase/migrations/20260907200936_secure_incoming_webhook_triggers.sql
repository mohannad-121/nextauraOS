ALTER TABLE public.automation_workflows
  ADD COLUMN incoming_webhook_token_hash TEXT NULL UNIQUE CHECK (incoming_webhook_token_hash IS NULL OR char_length(incoming_webhook_token_hash) = 64);

ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_event_type_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_event_type_check CHECK (event_type IN ('employee.created', 'contact.created', 'expense.status_changed', 'incoming_webhook'));
ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_entity_type_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_entity_type_check CHECK (entity_type IN ('employee', 'contact', 'expense', 'webhook'));
ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_source_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_source_check CHECK (source IN ('database', 'incoming_webhook'));

CREATE TABLE public.automation_incoming_webhook_rate_limits (
  token_hash TEXT NOT NULL REFERENCES public.automation_workflows(incoming_webhook_token_hash) ON DELETE CASCADE,
  client_ip TEXT NOT NULL CHECK (char_length(client_ip) BETWEEN 1 AND 64),
  window_started TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (token_hash, client_ip, window_started)
);
ALTER TABLE public.automation_incoming_webhook_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_incoming_webhook_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_automation_incoming_webhook_rate_limit(
  p_token_hash TEXT, p_client_ip TEXT, p_limit INTEGER DEFAULT 60
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count INTEGER; v_window TIMESTAMPTZ := date_trunc('minute', NOW());
BEGIN
  IF p_token_hash IS NULL OR char_length(p_token_hash) <> 64 OR p_client_ip IS NULL OR char_length(p_client_ip) > 64 OR p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'Invalid webhook rate-limit input.';
  END IF;
  INSERT INTO public.automation_incoming_webhook_rate_limits (token_hash, client_ip, window_started, request_count)
  VALUES (p_token_hash, p_client_ip, v_window, 1)
  ON CONFLICT (token_hash, client_ip, window_started) DO UPDATE
    SET request_count = public.automation_incoming_webhook_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_automation_incoming_webhook_rate_limit(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_automation_incoming_webhook_rate_limit(TEXT, TEXT, INTEGER) TO service_role;
