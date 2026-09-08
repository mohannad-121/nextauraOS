CREATE TABLE public.website_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE, version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL CHECK (status IN ('published','superseded','unpublished')), release_manifest jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, unpublished_at timestamptz,
  UNIQUE(site_id, version_number), CHECK (jsonb_typeof(release_manifest) = 'object' AND octet_length(release_manifest::text) <= 524288)
);
ALTER TABLE public.website_sites ADD COLUMN published_release_id uuid REFERENCES public.website_releases(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX website_releases_one_active ON public.website_releases(site_id) WHERE status = 'published';
CREATE INDEX website_releases_site_history ON public.website_releases(organization_id, site_id, version_number DESC);
ALTER TABLE public.website_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY website_releases_read ON public.website_releases FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
REVOKE ALL ON public.website_releases FROM anon, authenticated; GRANT SELECT ON public.website_releases TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_website_release(p_organization_id uuid, p_site_id uuid, p_actor_id uuid, p_manifest jsonb)
RETURNS public.website_releases LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_site public.website_sites; v_release public.website_releases; v_version integer;
BEGIN
  SELECT * INTO v_site FROM public.website_sites WHERE id=p_site_id AND organization_id=p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Website not found'; END IF;
  SELECT coalesce(max(version_number),0)+1 INTO v_version FROM public.website_releases WHERE site_id=p_site_id;
  UPDATE public.website_releases SET status='superseded' WHERE site_id=p_site_id AND status='published';
  INSERT INTO public.website_releases(organization_id,site_id,version_number,status,release_manifest,created_by,published_at) VALUES(p_organization_id,p_site_id,v_version,'published',p_manifest,p_actor_id,now()) RETURNING * INTO v_release;
  UPDATE public.website_sites SET published_release_id=v_release.id,status='published' WHERE id=p_site_id;
  RETURN v_release;
END $$;
CREATE OR REPLACE FUNCTION public.unpublish_website_release(p_organization_id uuid, p_site_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_release_id uuid;
BEGIN
  SELECT published_release_id INTO v_release_id FROM public.website_sites WHERE id=p_site_id AND organization_id=p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v_release_id IS NULL THEN RAISE EXCEPTION 'No published release'; END IF;
  UPDATE public.website_releases SET status='unpublished',unpublished_at=now() WHERE id=v_release_id AND organization_id=p_organization_id;
  UPDATE public.website_sites SET published_release_id=NULL,status='draft' WHERE id=p_site_id;
  RETURN v_release_id;
END $$;
REVOKE ALL ON FUNCTION public.publish_website_release(uuid,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unpublish_website_release(uuid,uuid) FROM PUBLIC, anon, authenticated;
