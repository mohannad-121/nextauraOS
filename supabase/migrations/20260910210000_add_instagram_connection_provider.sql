-- Expand provider column to support instagram (separate from facebook/meta)
ALTER TABLE public.integration_connections DROP CONSTRAINT IF EXISTS integration_connections_provider_check;
ALTER TABLE public.integration_connections ADD CONSTRAINT integration_connections_provider_check
  CHECK (provider IN ('google', 'github', 'slack', 'meta', 'generic_api', 'instagram'));

ALTER TABLE public.integration_oauth_states DROP CONSTRAINT IF EXISTS integration_oauth_states_provider_check;
ALTER TABLE public.integration_oauth_states ADD CONSTRAINT integration_oauth_states_provider_check
  CHECK (provider IN ('google', 'github', 'meta', 'instagram'));

-- Expand automation_events to support instagram event types (webhook foundation, no trigger node yet)
ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_event_type_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_event_type_check
  CHECK (event_type IN (
    'employee.created',
    'contact.created',
    'expense.status_changed',
    'incoming_webhook',
    'facebook.page.comment.created',
    'instagram.comment.created'
  ));

ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_entity_type_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_entity_type_check
  CHECK (entity_type IN ('employee', 'contact', 'expense', 'webhook', 'facebook_comment', 'instagram_comment'));

ALTER TABLE public.automation_events DROP CONSTRAINT automation_events_source_check;
ALTER TABLE public.automation_events ADD CONSTRAINT automation_events_source_check
  CHECK (source IN ('database', 'incoming_webhook', 'meta_webhook', 'meta_test', 'instagram_webhook'));
