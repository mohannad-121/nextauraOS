ALTER TABLE public.website_sites ADD COLUMN public_slug text;

-- Existing private, organization-scoped slugs are not safe public identifiers.
-- Give legacy sites deterministic globally unique public addresses without exposing an org ID.
UPDATE public.website_sites
SET public_slug = slug || '-' || left(id::text, 8)
WHERE public_slug IS NULL;

ALTER TABLE public.website_sites
  ALTER COLUMN public_slug SET NOT NULL,
  ADD CONSTRAINT website_sites_public_slug_format
    CHECK (public_slug ~ '^[a-z0-9](?:[a-z0-9-]{0,77}[a-z0-9])?$'),
  ADD CONSTRAINT website_sites_public_slug_reserved
    CHECK (public_slug NOT IN ('admin', 'api', 'app', 'auth', 'billing', 'login', 'pricing', 'site', 'www'));

CREATE UNIQUE INDEX website_sites_public_slug_unique ON public.website_sites(public_slug);
