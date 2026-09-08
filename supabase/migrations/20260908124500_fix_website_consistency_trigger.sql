-- Each trigger target has a different NEW record shape. Use mutually exclusive
-- branches so website page inserts never reference fields that only exist on a
-- page-version record.
CREATE OR REPLACE FUNCTION public.assert_website_organization_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'website_pages' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.website_sites AS site
      WHERE site.id = NEW.site_id
        AND site.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Website page organization must match its site.';
    END IF;
  ELSIF TG_TABLE_NAME = 'website_page_versions' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.website_pages AS page
      WHERE page.id = NEW.page_id
        AND page.site_id = NEW.site_id
        AND page.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Website page version organization must match its page.';
    END IF;
  ELSIF TG_TABLE_NAME = 'website_assets' AND NEW.site_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.website_sites AS site
      WHERE site.id = NEW.site_id
        AND site.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Website asset organization must match its site.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_website_organization_consistency() FROM PUBLIC, anon, authenticated;
