CREATE OR REPLACE FUNCTION public.enforce_meta_webhook_event_organization()
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
      AND connection.provider = 'meta'
  ) THEN
    RAISE EXCEPTION 'META_WEBHOOK_CONNECTION_ORGANIZATION_MISMATCH';
  END IF;

  IF NEW.resource_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.integration_connection_resources AS resource
    WHERE resource.id = NEW.resource_id
      AND resource.connection_id = NEW.connection_id
      AND resource.organization_id = NEW.organization_id
      AND resource.provider = 'meta'
  ) THEN
    RAISE EXCEPTION 'META_WEBHOOK_RESOURCE_ORGANIZATION_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER meta_webhook_events_organization_guard
BEFORE INSERT OR UPDATE OF organization_id, connection_id, resource_id
ON public.meta_webhook_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_meta_webhook_event_organization();

REVOKE ALL ON FUNCTION public.enforce_meta_webhook_event_organization()
FROM PUBLIC, anon, authenticated;
