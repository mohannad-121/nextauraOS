CREATE TABLE public.website_agent_edit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instruction text NOT NULL CHECK (char_length(instruction) BETWEEN 1 AND 6000),
  plan_json jsonb NOT NULL CHECK (jsonb_typeof(plan_json) = 'object' AND octet_length(plan_json::text) <= 262144),
  base_versions jsonb NOT NULL CHECK (jsonb_typeof(base_versions) = 'object'),
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'applied', 'expired', 'invalidated')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  applied_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'applied') = (applied_at IS NOT NULL))
);
CREATE INDEX website_agent_edit_plans_site_owner ON public.website_agent_edit_plans (organization_id, site_id, created_by, created_at DESC);
ALTER TABLE public.website_agent_edit_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY website_agent_edit_plans_read_own ON public.website_agent_edit_plans FOR SELECT TO authenticated USING (created_by = (select auth.uid()) AND public.is_org_member(organization_id));
REVOKE ALL ON public.website_agent_edit_plans FROM anon, authenticated;
GRANT SELECT ON public.website_agent_edit_plans TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_website_agent_edit_plan(p_plan jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_op jsonb; v_allowed text[] := ARRAY['update_site_theme','update_site_metadata','update_global_header','update_global_footer','add_navigation_item','update_navigation_item','remove_navigation_item','create_page','rename_page','update_page_slug','update_page_seo','add_section','update_section','remove_section','move_section','duplicate_section'];
BEGIN
  IF jsonb_typeof(p_plan) <> 'object' OR p_plan->>'version' <> '1' OR jsonb_typeof(p_plan->'operations') <> 'array' OR jsonb_array_length(p_plan->'operations') > 30 OR coalesce(length(p_plan->>'summary'), 0) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
  FOR v_op IN SELECT value FROM jsonb_array_elements(p_plan->'operations') LOOP
    IF jsonb_typeof(v_op) <> 'object' OR NOT (v_op ? 'op') OR NOT (v_op->>'op' = ANY(v_allowed)) OR v_op ? 'sql' OR v_op ? 'html' OR v_op ? 'javascript' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_OPERATION'; END IF;
    IF (v_op->>'op') IN ('create_page','rename_page','update_page_slug','update_page_seo','add_section','update_section','remove_section','move_section','duplicate_section') AND coalesce(length(v_op->>'pageId'),0) > 80 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_TARGET'; END IF;
    IF (v_op->>'op') IN ('add_section','update_section') AND jsonb_typeof(v_op->'section') <> 'object' AND jsonb_typeof(v_op->'changes') <> 'object' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_SECTION'; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.apply_website_agent_edit_plan(p_plan_id uuid, p_organization_id uuid, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_plan public.website_agent_edit_plans; v_site public.website_sites; v_op jsonb; v_page public.website_pages; v_doc jsonb; v_index int; v_new_page_id uuid; v_page_ids jsonb := '{}'::jsonb; v_changed_pages uuid[] := '{}';
BEGIN
  SELECT * INTO v_plan FROM public.website_agent_edit_plans WHERE id=p_plan_id AND organization_id=p_organization_id AND created_by=p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_NOT_FOUND'; END IF;
  IF v_plan.status='applied' THEN RAISE EXCEPTION 'AI_EDIT_ALREADY_APPLIED'; END IF;
  IF v_plan.expires_at <= now() THEN UPDATE public.website_agent_edit_plans SET status='expired' WHERE id=p_plan_id; RAISE EXCEPTION 'AI_EDIT_EXPIRED'; END IF;
  SELECT * INTO v_site FROM public.website_sites WHERE id=v_plan.site_id AND organization_id=p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=p_organization_id AND user_id=p_actor_id AND status='Active' AND role IN ('Owner','Admin')) THEN RAISE EXCEPTION 'AI_EDIT_FORBIDDEN'; END IF;
  PERFORM public.validate_website_agent_edit_plan(v_plan.plan_json);
  FOR v_page IN SELECT * FROM public.website_pages WHERE site_id=v_site.id AND organization_id=p_organization_id LOOP
    IF (v_plan.base_versions->>'global_version') IS NOT NULL AND v_site.global_version <> (v_plan.base_versions->>'global_version')::int THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
    IF (v_plan.base_versions->'pages'->>v_page.id::text) IS NOT NULL AND v_page.draft_version <> (v_plan.base_versions->'pages'->>v_page.id::text)::int THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
  END LOOP;
  FOR v_op IN SELECT value FROM jsonb_array_elements(v_plan.plan_json->'operations') LOOP
    IF v_op->>'op'='update_site_theme' THEN UPDATE public.website_pages SET draft_document=jsonb_set(draft_document,'{theme}',v_op->'theme',true), draft_version=draft_version+1, updated_at=now() WHERE site_id=v_site.id AND organization_id=p_organization_id;
    ELSIF v_op->>'op'='create_page' THEN
      v_new_page_id:=gen_random_uuid(); INSERT INTO public.website_pages(id,organization_id,site_id,name,slug,page_type,is_homepage,draft_document,draft_version,created_by) VALUES(v_new_page_id,p_organization_id,v_site.id,v_op->>'name',v_op->>'slug','standard',false,jsonb_build_object('version',1,'sections',coalesce(v_op->'sections','[]'::jsonb)),1,p_actor_id); v_page_ids:=v_page_ids || jsonb_build_object(coalesce(v_op->>'tempRef',v_new_page_id::text),v_new_page_id::text);
    END IF;
  END LOOP;
  UPDATE public.website_agent_edit_plans SET status='applied', applied_at=now() WHERE id=p_plan_id;
  INSERT INTO public.audit_logs(organization_id,user_name,action,details) VALUES(p_organization_id,p_actor_id,'website_agent.edit_plan_applied',json_build_object('site_id',v_site.id,'proposal_id',p_plan_id,'operation_count',jsonb_array_length(v_plan.plan_json->'operations'))::text);
  RETURN jsonb_build_object('site_id',v_site.id,'created_page_ids',v_page_ids);
END $$;
REVOKE ALL ON FUNCTION public.validate_website_agent_edit_plan(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_website_agent_edit_plan(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
