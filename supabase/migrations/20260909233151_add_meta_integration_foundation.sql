ALTER TABLE public.integration_oauth_states
  DROP CONSTRAINT integration_oauth_states_provider_check,
  ADD CONSTRAINT integration_oauth_states_provider_check
    CHECK (provider IN ('google', 'github', 'meta'));

ALTER TABLE public.integration_connections
  ADD COLUMN provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (
      pg_catalog.jsonb_typeof(provider_metadata) = 'object'
      AND pg_catalog.octet_length(provider_metadata::text) <= 32768
      AND provider_metadata::text !~* '"(access_token|page_access_token|client_secret|app_secret)"[[:space:]]*:'
    );

ALTER TABLE public.integration_connections
  DROP CONSTRAINT integration_connections_status_check,
  ADD CONSTRAINT integration_connections_status_check
    CHECK (status IN (
      'active', 'degraded', 'reconnect_required', 'disconnected',
      'expired', 'revoked', 'error'
    ));

CREATE TABLE public.integration_connection_resources (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'meta'),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('facebook_page', 'instagram_account')),
  external_resource_id TEXT NOT NULL CHECK (
    pg_catalog.length(external_resource_id) BETWEEN 1 AND 128
    AND external_resource_id ~ '^[0-9]+$'
  ),
  display_name TEXT NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(display_name)) BETWEEN 1 AND 255),
  selected BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (
    pg_catalog.jsonb_typeof(metadata) = 'object'
    AND pg_catalog.octet_length(metadata::text) <= 8192
    AND metadata::text !~* '"(access_token|page_access_token|client_secret|app_secret)"[[:space:]]*:'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT integration_connection_resources_unique
    UNIQUE (connection_id, resource_type, external_resource_id)
);

CREATE INDEX integration_connection_resources_org_connection_idx
  ON public.integration_connection_resources (organization_id, connection_id, resource_type);
CREATE INDEX integration_connection_resources_meta_lookup_idx
  ON public.integration_connection_resources (provider, external_resource_id)
  WHERE selected;

ALTER TABLE public.integration_connection_resources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_connection_resources FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_integration_resource_organization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.integration_connections AS connection
    WHERE connection.id = NEW.connection_id
      AND connection.organization_id = NEW.organization_id
      AND connection.provider = NEW.provider
  ) THEN
    RAISE EXCEPTION 'INTEGRATION_RESOURCE_ORGANIZATION_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER integration_connection_resources_organization_guard
BEFORE INSERT OR UPDATE OF organization_id, connection_id, provider
ON public.integration_connection_resources
FOR EACH ROW EXECUTE FUNCTION public.enforce_integration_resource_organization();

REVOKE ALL ON FUNCTION public.enforce_integration_resource_organization()
FROM PUBLIC, anon, authenticated;

CREATE TABLE public.meta_webhook_events (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  resource_id UUID NULL REFERENCES public.integration_connection_resources(id) ON DELETE SET NULL,
  product TEXT NOT NULL CHECK (product IN ('facebook', 'instagram')),
  event_type TEXT NOT NULL CHECK (pg_catalog.length(event_type) BETWEEN 1 AND 120),
  external_event_id TEXT NOT NULL CHECK (pg_catalog.length(external_event_id) BETWEEN 1 AND 128),
  external_resource_id TEXT NOT NULL CHECK (pg_catalog.length(external_resource_id) BETWEEN 1 AND 128),
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL CHECK (
    pg_catalog.jsonb_typeof(payload) = 'object'
    AND pg_catalog.octet_length(payload::text) <= 65536
    AND payload::text !~* '"(access_token|authorization|cookie|client_secret|app_secret)"[[:space:]]*:'
  ),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'routed', 'ignored', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT meta_webhook_events_connection_dedupe UNIQUE (connection_id, external_event_id)
);

CREATE INDEX meta_webhook_events_org_created_idx
  ON public.meta_webhook_events (organization_id, created_at DESC);
CREATE INDEX meta_webhook_events_unrouted_idx
  ON public.meta_webhook_events (created_at ASC)
  WHERE status = 'received';

ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_webhook_events FROM PUBLIC, anon, authenticated;
