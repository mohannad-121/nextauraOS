-- Allow provider 'instagram' and resource_type 'instagram_professional_account'
ALTER TABLE public.integration_connection_resources
  DROP CONSTRAINT IF EXISTS integration_connection_resources_provider_check,
  ADD CONSTRAINT integration_connection_resources_provider_check
    CHECK (provider IN ('meta', 'instagram'));

ALTER TABLE public.integration_connection_resources
  DROP CONSTRAINT IF EXISTS integration_connection_resources_resource_type_check,
  ADD CONSTRAINT integration_connection_resources_resource_type_check
    CHECK (resource_type IN ('facebook_page', 'instagram_account', 'instagram_professional_account'));

-- Backfill existing Instagram connections that were missing their resource row
INSERT INTO public.integration_connection_resources (
  organization_id,
  connection_id,
  provider,
  resource_type,
  external_resource_id,
  display_name,
  selected,
  metadata
)
SELECT
  c.organization_id,
  c.id AS connection_id,
  'instagram' AS provider,
  'instagram_professional_account' AS resource_type,
  c.provider_metadata->>'ig_user_id' AS external_resource_id,
  COALESCE(NULLIF(c.account_label, ''), '@' || (c.provider_metadata->>'username'), c.name) AS display_name,
  true AS selected,
  jsonb_build_object(
    'username', c.provider_metadata->>'username',
    'name', COALESCE(c.provider_metadata->>'display_name', c.name),
    'account_type', COALESCE(c.provider_metadata->>'account_type', 'BUSINESS')
  ) AS metadata
FROM public.integration_connections c
WHERE c.provider = 'instagram'
  AND c.provider_metadata->>'ig_user_id' IS NOT NULL
ON CONFLICT (connection_id, resource_type, external_resource_id) DO UPDATE
SET selected = true,
    display_name = EXCLUDED.display_name,
    metadata = EXCLUDED.metadata,
    updated_at = pg_catalog.now();
