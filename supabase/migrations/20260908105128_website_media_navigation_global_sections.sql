ALTER TABLE public.website_sites
  ADD COLUMN global_sections JSONB NOT NULL DEFAULT '{"version":1,"navigation":[],"header":null,"footer":null}'::jsonb,
  ADD COLUMN global_version INTEGER NOT NULL DEFAULT 1 CHECK (global_version >= 1),
  ADD CONSTRAINT website_sites_global_sections_object CHECK (jsonb_typeof(global_sections) = 'object' AND octet_length(global_sections::text) <= 65536);

ALTER TABLE public.website_assets
  ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX website_assets_organization_site_created
  ON public.website_assets(organization_id, site_id, created_at DESC)
  WHERE deleted_at IS NULL;
