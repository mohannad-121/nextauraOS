ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_source_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_source_check CHECK (source IN ('database', 'incoming_webhook', 'meta_webhook', 'meta_test'));

