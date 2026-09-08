CREATE OR REPLACE FUNCTION public.publish_website_release(p_organization_id uuid, p_site_id uuid, p_actor_id uuid, p_manifest jsonb)
RETURNS public.website_releases LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_release public.website_releases; v_version integer;
BEGIN
  PERFORM 1 FROM public.website_sites WHERE id=p_site_id AND organization_id=p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Website not found'; END IF;
  SELECT coalesce(max(version_number),0)+1 INTO v_version FROM public.website_releases WHERE site_id=p_site_id;
  UPDATE public.website_releases SET status='superseded' WHERE site_id=p_site_id AND status='published';
  INSERT INTO public.website_releases(organization_id,site_id,version_number,status,release_manifest,created_by,published_at) VALUES(p_organization_id,p_site_id,v_version,'published',p_manifest,p_actor_id,now()) RETURNING * INTO v_release;
  UPDATE public.website_sites SET published_release_id=v_release.id,status='published' WHERE id=p_site_id;
  RETURN v_release;
END $$;
REVOKE ALL ON FUNCTION public.publish_website_release(uuid,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
