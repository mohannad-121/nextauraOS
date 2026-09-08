CREATE TABLE public.website_agent_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 6000),
  plan_json jsonb NOT NULL CHECK (jsonb_typeof(plan_json) = 'object' AND octet_length(plan_json::text) <= 262144),
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'applied', 'expired', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  applied_at timestamptz NULL,
  applied_site_id uuid NULL REFERENCES public.website_sites(id) ON DELETE SET NULL,
  CHECK ((status = 'applied') = (applied_at IS NOT NULL))
);

CREATE INDEX website_agent_plans_owner_expiry
  ON public.website_agent_plans (organization_id, created_by, expires_at DESC);

ALTER TABLE public.website_agent_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY website_agent_plans_read_own ON public.website_agent_plans
  FOR SELECT TO authenticated
  USING (created_by = (select auth.uid()) AND public.is_org_member(organization_id));
REVOKE ALL ON public.website_agent_plans FROM anon, authenticated;
GRANT SELECT ON public.website_agent_plans TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_website_agent_plan(
  p_plan_id uuid,
  p_organization_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan public.website_agent_plans;
  v_site public.website_sites;
  v_page jsonb;
  v_page_id uuid;
  v_homepage_id uuid;
  v_page_ids jsonb := '{}'::jsonb;
  v_navigation jsonb := '[]'::jsonb;
  v_globals jsonb;
  v_document jsonb;
  v_slug text;
  v_index integer := 0;
BEGIN
  SELECT * INTO v_plan
  FROM public.website_agent_plans
  WHERE id = p_plan_id
    AND organization_id = p_organization_id
    AND created_by = p_actor_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Website plan not found.'; END IF;
  IF v_plan.status = 'applied' THEN RAISE EXCEPTION 'This website plan has already been applied.'; END IF;
  IF v_plan.expires_at <= now() THEN
    UPDATE public.website_agent_plans SET status = 'expired' WHERE id = v_plan.id;
    RAISE EXCEPTION 'This website plan has expired. Generate a new plan.';
  END IF;
  IF v_plan.status <> 'generated' THEN RAISE EXCEPTION 'This website plan is unavailable.'; END IF;

  v_slug := v_plan.plan_json #>> '{site,slugSuggestion}';
  WHILE EXISTS (SELECT 1 FROM public.website_sites WHERE organization_id = p_organization_id AND slug = v_slug) LOOP
    v_slug := left(v_plan.plan_json #>> '{site,slugSuggestion}', 54) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  END LOOP;

  INSERT INTO public.website_sites (
    organization_id, name, slug, public_slug, default_locale, created_by, status, global_sections
  ) VALUES (
    p_organization_id,
    v_plan.plan_json #>> '{site,name}',
    v_slug,
    v_slug,
    coalesce(v_plan.plan_json #>> '{site,language}', 'en'),
    p_actor_id,
    'draft',
    '{"version":1,"navigation":[],"header":null,"footer":null}'::jsonb
  ) RETURNING * INTO v_site;

  FOR v_page IN SELECT value FROM jsonb_array_elements(v_plan.plan_json->'pages') LOOP
    v_index := v_index + 1;
    v_page_id := gen_random_uuid();
    v_document := jsonb_build_object('version', 1, 'theme', v_plan.plan_json->'site'->'theme', 'sections', v_page->'sections');
    INSERT INTO public.website_pages (
      id, organization_id, site_id, name, slug, page_type, is_homepage,
      seo_title, seo_description, sort_order, draft_document, draft_version, created_by
    ) VALUES (
      v_page_id, p_organization_id, v_site.id,
      v_page->>'name', v_page->>'slug',
      CASE WHEN coalesce((v_page->>'isHomepage')::boolean, false) THEN 'home' ELSE 'standard' END,
      coalesce((v_page->>'isHomepage')::boolean, false),
      nullif(v_page #>> '{seo,title}', ''), nullif(v_page #>> '{seo,description}', ''),
      v_index, v_document, 1, p_actor_id
    );
    INSERT INTO public.website_page_versions (
      organization_id, site_id, page_id, version_number, document, created_by, change_summary
    ) VALUES (p_organization_id, v_site.id, v_page_id, 1, v_document, p_actor_id, 'AI-generated initial draft');
    v_page_ids := v_page_ids || jsonb_build_object(v_page->>'clientId', v_page_id::text);
    IF coalesce((v_page->>'isHomepage')::boolean, false) THEN v_homepage_id := v_page_id; END IF;
  END LOOP;

  FOR v_page IN SELECT value FROM jsonb_array_elements(v_plan.plan_json->'navigation') LOOP
    v_navigation := v_navigation || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid()::text,
      'label', v_page->>'label',
      'pageId', v_page_ids->>(v_page->>'targetPageClientId'),
      'visible', true
    ));
  END LOOP;
  v_globals := jsonb_build_object(
    'version', 1,
    'navigation', v_navigation,
    'header', v_plan.plan_json->'header',
    'footer', v_plan.plan_json->'footer'
  );
  UPDATE public.website_sites
  SET global_sections = v_globals, global_version = 1
  WHERE id = v_site.id;

  UPDATE public.website_agent_plans
  SET status = 'applied', applied_at = now(), applied_site_id = v_site.id
  WHERE id = v_plan.id;

  INSERT INTO public.audit_logs (organization_id, user_name, action, details)
  VALUES (p_organization_id, p_actor_id, 'website_agent.plan_applied', json_build_object(
    'plan_id', v_plan.id, 'site_id', v_site.id,
    'page_count', jsonb_array_length(v_plan.plan_json->'pages'),
    'section_count', (SELECT count(*) FROM jsonb_array_elements(v_plan.plan_json->'pages') AS p, jsonb_array_elements(p.value->'sections'))
  )::text);

  -- Deliberately no website_releases insert and no published_release_id update.
  RETURN jsonb_build_object('site_id', v_site.id, 'homepage_id', v_homepage_id);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_website_agent_plan(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
