ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_event_type_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_event_type_check CHECK (event_type IN ('employee.created', 'contact.created', 'expense.status_changed', 'incoming_webhook', 'facebook.page.comment.created'));

ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_entity_type_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_entity_type_check CHECK (entity_type IN ('employee', 'contact', 'expense', 'webhook', 'facebook_comment'));

ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_source_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_source_check CHECK (source IN ('database', 'incoming_webhook', 'meta_webhook'));
ALTER TABLE public.automation_workflows DROP CONSTRAINT automation_workflows_trigger_type_check;
ALTER TABLE public.automation_workflows ADD CONSTRAINT automation_workflows_trigger_type_check CHECK (trigger_type IN ('employee.created', 'contact.created', 'expense.status_changed', 'incoming_webhook', 'schedule', 'facebook.page.comment.created'));
