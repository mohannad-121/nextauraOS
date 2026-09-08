CREATE OR REPLACE FUNCTION public.apply_website_agent_edit_plan(p_plan_id uuid, p_organization_id uuid, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.website_agent_edit_plans; s public.website_sites; pg public.website_pages; op jsonb; doc jsonb; sec jsonb; n int; nextv int;
BEGIN
 SELECT * INTO p FROM public.website_agent_edit_plans WHERE id=p_plan_id AND organization_id=p_organization_id AND created_by=p_actor_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
 IF p.status='applied' THEN RAISE EXCEPTION 'AI_EDIT_ALREADY_APPLIED'; END IF;
 IF p.expires_at<=now() THEN UPDATE public.website_agent_edit_plans SET status='expired' WHERE id=p_plan_id; RAISE EXCEPTION 'AI_EDIT_EXPIRED'; END IF;
 SELECT * INTO s FROM public.website_sites WHERE id=p.site_id AND organization_id=p_organization_id AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=p_organization_id AND user_id=p_actor_id AND status='Active' AND role IN ('Owner','Admin')) THEN RAISE EXCEPTION 'AI_EDIT_CROSS_TENANT'; END IF;
 IF jsonb_typeof(p.plan_json)<> 'object' OR p.plan_json->>'version'<>'1' OR jsonb_typeof(p.plan_json->'operations')<>'array' OR jsonb_array_length(p.plan_json->'operations')<>1 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
 op:=p.plan_json->'operations'->0;
 IF jsonb_typeof(op)<>'object' OR op->>'op'<>'add_section' THEN RAISE EXCEPTION 'AI_EDIT_UNSUPPORTED_OPERATION'; END IF;
IF NOT (op ? 'pageId' AND op ? 'index' AND op ? 'section') OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(op))<>4 THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
 SELECT * INTO pg FROM public.website_pages WHERE id=(op->>'pageId')::uuid AND site_id=s.id AND organization_id=p_organization_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_TARGET_NOT_FOUND'; END IF;
 IF (p.base_versions->'pages'->>pg.id::text) IS DISTINCT FROM pg.draft_version::text OR ((p.base_versions->>'global_version') IS NOT NULL AND (p.base_versions->>'global_version')::int<>s.global_version) THEN RAISE EXCEPTION 'AI_EDIT_STALE_PROPOSAL'; END IF;
 sec:=op->'section';
IF jsonb_typeof(sec)<>'object' OR sec ? 'id' OR NOT (sec ? 'type' AND sec ? 'props' AND sec ? 'style') OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(sec))<>3 OR NOT (sec->>'type'=ANY(ARRAY['hero','text','image','button_group','spacer','features','services','testimonials','pricing','faq','contact','gallery','stats','team'])) OR jsonb_typeof(sec->'props')<>'object' OR jsonb_typeof(sec->'style')<>'object' OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(sec->'props'))>40 OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(sec->'style'))>40 OR sec::text ~* '<\\/?script|on[a-z]+\\s*=|javascript:|<iframe|expression\\s*\\(' THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
 doc:=pg.draft_document; n:=jsonb_array_length(doc->'sections');
 IF n>=100 THEN RAISE EXCEPTION 'AI_EDIT_SECTION_LIMIT'; END IF;
 IF jsonb_typeof(op->'index')<>'number' OR (op->>'index')::int<0 OR (op->>'index')::int>n THEN RAISE EXCEPTION 'AI_EDIT_INVALID_PLAN'; END IF;
 sec:=jsonb_build_object('id',gen_random_uuid()::text,'type',sec->'type','props',sec->'props','style',sec->'style');
 doc:=jsonb_set(doc,'{sections}',(doc->'sections') || '[]'::jsonb,true);
 doc:=jsonb_set(doc,'{sections}',(SELECT jsonb_agg(x ORDER BY ord) FROM (SELECT value x, ord FROM jsonb_array_elements(doc->'sections') WITH ORDINALITY t(value,ord) WHERE ord<=(op->>'index')::int UNION ALL SELECT sec,(op->>'index')::int+0.5 UNION ALL SELECT value,ord FROM jsonb_array_elements(doc->'sections') WITH ORDINALITY t(value,ord) WHERE ord>(op->>'index')::int) q),true);
 nextv:=pg.draft_version+1; UPDATE public.website_pages SET draft_document=doc,draft_version=nextv,updated_at=now() WHERE id=pg.id;
 INSERT INTO public.website_page_versions(organization_id,site_id,page_id,version_number,document,created_by,change_summary) VALUES(p_organization_id,s.id,pg.id,nextv,doc,p_actor_id,'AI edit: add section');
 UPDATE public.website_agent_edit_plans SET status='applied',applied_at=now() WHERE id=p.id;
 INSERT INTO public.audit_logs(organization_id,user_name,action,details) VALUES(p_organization_id,p_actor_id,'website_agent.edit_plan_applied',json_build_object('site_id',s.id,'proposal_id',p.id,'operation_count',1)::text);
 RETURN jsonb_build_object('site_id',s.id,'page_id',pg.id,'section_id',sec->>'id');
END $$;
REVOKE ALL ON FUNCTION public.apply_website_agent_edit_plan(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
