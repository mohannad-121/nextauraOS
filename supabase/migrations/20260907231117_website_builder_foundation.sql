ALTER TABLE public.plan_capabilities
  ADD COLUMN website_builder_access BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN website_site_limit INTEGER NULL CHECK (website_site_limit IS NULL OR website_site_limit >= 1);

UPDATE public.plan_capabilities
SET website_builder_access = true,
    website_site_limit = CASE plan WHEN 'one_app_free' THEN 1 WHEN 'standard' THEN 3 ELSE NULL END;

INSERT INTO public.services (key, name, category, description, icon_name, display_order, is_active, minimum_plan)
VALUES ('website_builder', 'Website Builder', 'marketing', 'Create organization-owned website drafts with structured, versioned pages.', 'PanelsTopLeft', 25, true, 'standard')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon_name = EXCLUDED.icon_name, minimum_plan = EXCLUDED.minimum_plan, is_active = true;

CREATE TABLE public.website_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  default_locale TEXT NOT NULL DEFAULT 'en' CHECK (default_locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  favicon_asset_id UUID NULL,
  published_version_id UUID NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug TEXT NOT NULL CHECK (slug = '/' OR slug ~ '^/[a-z0-9](?:[a-z0-9/-]{0,190}[a-z0-9])?$'),
  page_type TEXT NOT NULL DEFAULT 'standard' CHECK (page_type IN ('standard', 'home', 'not_found')),
  is_homepage BOOLEAN NOT NULL DEFAULT false,
  seo_title TEXT NULL CHECK (seo_title IS NULL OR char_length(seo_title) <= 160),
  seo_description TEXT NULL CHECK (seo_description IS NULL OR char_length(seo_description) <= 320),
  og_image_asset_id UUID NULL,
  canonical_url TEXT NULL CHECK (canonical_url IS NULL OR char_length(canonical_url) <= 2048),
  indexing_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  draft_document JSONB NOT NULL DEFAULT '{"version":1,"sections":[]}'::jsonb,
  draft_version INTEGER NOT NULL DEFAULT 1 CHECK (draft_version >= 1),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug),
  CHECK (jsonb_typeof(draft_document) = 'object'),
  CHECK (octet_length(draft_document::text) <= 262144)
);

CREATE UNIQUE INDEX website_pages_one_homepage_per_site ON public.website_pages(site_id) WHERE is_homepage;
CREATE INDEX website_sites_organization_updated ON public.website_sites(organization_id, updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX website_pages_organization_site ON public.website_pages(organization_id, site_id, sort_order);

CREATE TABLE public.website_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.website_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object' AND octet_length(document::text) <= 262144),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT NULL CHECK (change_summary IS NULL OR char_length(change_summary) <= 280),
  UNIQUE(page_id, version_number)
);
CREATE INDEX website_page_versions_page_created ON public.website_page_versions(organization_id, page_id, created_at DESC);

CREATE TABLE public.website_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id UUID NULL REFERENCES public.website_sites(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE CHECK (char_length(storage_path) BETWEEN 1 AND 1024),
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  mime_type TEXT NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 127),
  file_size BIGINT NOT NULL CHECK (file_size >= 0 AND file_size <= 52428800),
  width INTEGER NULL CHECK (width IS NULL OR width > 0), height INTEGER NULL CHECK (height IS NULL OR height > 0),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.website_sites ADD CONSTRAINT website_sites_favicon_asset_fk FOREIGN KEY (favicon_asset_id) REFERENCES public.website_assets(id) ON DELETE SET NULL;
ALTER TABLE public.website_pages ADD CONSTRAINT website_pages_og_asset_fk FOREIGN KEY (og_image_asset_id) REFERENCES public.website_assets(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.assert_website_organization_consistency()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'website_pages' AND NOT EXISTS (SELECT 1 FROM public.website_sites s WHERE s.id = NEW.site_id AND s.organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'Website page organization must match its site.'; END IF;
  IF TG_TABLE_NAME = 'website_page_versions' AND NOT EXISTS (SELECT 1 FROM public.website_pages p WHERE p.id = NEW.page_id AND p.site_id = NEW.site_id AND p.organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'Website page version organization must match its page.'; END IF;
  IF TG_TABLE_NAME = 'website_assets' AND NEW.site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.website_sites s WHERE s.id = NEW.site_id AND s.organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'Website asset organization must match its site.'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER website_pages_org_consistency BEFORE INSERT OR UPDATE OF organization_id, site_id ON public.website_pages FOR EACH ROW EXECUTE FUNCTION public.assert_website_organization_consistency();
CREATE TRIGGER website_versions_org_consistency BEFORE INSERT OR UPDATE OF organization_id, site_id, page_id ON public.website_page_versions FOR EACH ROW EXECUTE FUNCTION public.assert_website_organization_consistency();
CREATE TRIGGER website_assets_org_consistency BEFORE INSERT OR UPDATE OF organization_id, site_id ON public.website_assets FOR EACH ROW EXECUTE FUNCTION public.assert_website_organization_consistency();
CREATE TRIGGER website_sites_updated_at BEFORE UPDATE ON public.website_sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER website_pages_updated_at BEFORE UPDATE ON public.website_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.website_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY website_sites_read ON public.website_sites FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY website_pages_read ON public.website_pages FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY website_versions_read ON public.website_page_versions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY website_assets_read ON public.website_assets FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
REVOKE ALL ON public.website_sites, public.website_pages, public.website_page_versions, public.website_assets FROM anon, authenticated;
GRANT SELECT ON public.website_sites, public.website_pages, public.website_page_versions, public.website_assets TO authenticated;
REVOKE EXECUTE ON FUNCTION public.assert_website_organization_consistency() FROM PUBLIC, anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('website-assets', 'website-assets', false, 52428800, ARRAY['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
