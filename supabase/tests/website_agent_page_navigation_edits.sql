BEGIN;

DO $$
DECLARE
  v_site public.website_sites; v_page public.website_pages; v_actor uuid; v_plan_id uuid;
  v_base_pages jsonb; v_new_id text; v_nav_id text; v_before_pages integer; v_before_globals jsonb; v_before_theme text; v_before_release uuid; v_release_id uuid:=extensions.gen_random_uuid(); v_release_version integer; v_release_manifest jsonb:=pg_catalog.jsonb_build_object('version',1,'fixture','immutable');
  v_section_id constant text := '11111111-1111-4111-8111-111111111111';
BEGIN
  SELECT s.* INTO v_site FROM public.website_sites s WHERE s.archived_at IS NULL AND EXISTS(SELECT 1 FROM public.website_pages p WHERE p.site_id=s.id) AND EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=s.organization_id AND m.status='Active' AND m.role IN('Owner','Admin')) ORDER BY s.created_at LIMIT 1;
  IF v_site.id IS NULL THEN RAISE EXCEPTION 'TEST_FIXTURE_MISSING'; END IF;
  SELECT user_id INTO v_actor FROM public.organization_members WHERE organization_id=v_site.organization_id AND status='Active' AND role IN('Owner','Admin') ORDER BY created_at LIMIT 1;
  SELECT * INTO v_page FROM public.website_pages WHERE site_id=v_site.id ORDER BY sort_order,id LIMIT 1;
  UPDATE public.website_pages SET draft_document=pg_catalog.jsonb_set(pg_catalog.jsonb_set(draft_document,'{theme}',pg_catalog.jsonb_build_object('primaryColor','#2563eb','backgroundColor','#ffffff','textColor','#0f172a','radius','md'),true),'{sections}',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id',v_section_id,'type','text','props',pg_catalog.jsonb_build_object('heading','Old','body','Body'),'style',pg_catalog.jsonb_build_object('backgroundColor','#ffffff','textColor','#0f172a','paddingY',48))),false) WHERE id=v_page.id;
  SELECT p.* INTO v_page FROM public.website_pages p WHERE p.id=v_page.id;
  UPDATE public.website_sites SET global_sections=pg_catalog.jsonb_build_object('version',1,'navigation','[]'::jsonb,'header',pg_catalog.jsonb_build_object('id','22222222-2222-4222-8222-222222222222','type','header','props',pg_catalog.jsonb_build_object('siteName','Test'),'style',pg_catalog.jsonb_build_object('backgroundColor','#ffffff','textColor','#0f172a')),'footer',pg_catalog.jsonb_build_object('id','33333333-3333-4333-8333-333333333333','type','footer','props',pg_catalog.jsonb_build_object('siteName','Test'),'style',pg_catalog.jsonb_build_object('backgroundColor','#0f172a','textColor','#ffffff'))) WHERE id=v_site.id;
  SELECT s.* INTO v_site FROM public.website_sites s WHERE s.id=v_site.id;
  SELECT COALESCE(max(version_number),0)+1 INTO v_release_version FROM public.website_releases WHERE site_id=v_site.id;
  INSERT INTO public.website_releases(id,organization_id,site_id,version_number,status,release_manifest,created_by,published_at) VALUES(v_release_id,v_site.organization_id,v_site.id,v_release_version,'published',v_release_manifest,v_actor,pg_catalog.now());
  UPDATE public.website_sites SET published_release_id=v_release_id,status='published' WHERE id=v_site.id;
  SELECT s.* INTO v_site FROM public.website_sites s WHERE s.id=v_site.id;

  -- A/E/F/H/J/K/M/P/U: create a temp page, add a section, update it, and link it in one draft-only transaction.
  SELECT pg_catalog.jsonb_object_agg(id::text,draft_version) INTO v_base_pages FROM public.website_pages WHERE site_id=v_site.id;
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions) VALUES(v_site.organization_id,v_site.id,v_actor,'Create about page',pg_catalog.jsonb_build_object('version',1,'summary','Create and link about','operations',pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('op','create_page','tempRef','new:about','name','About','slug','/about','seo',pg_catalog.jsonb_build_object('title','About us','description','About description'),'sections','[]'::jsonb),
    pg_catalog.jsonb_build_object('op','add_section','pageRef','new:about','index',0,'section',pg_catalog.jsonb_build_object('type','text','props',pg_catalog.jsonb_build_object('heading','About','body','Draft only'),'style',pg_catalog.jsonb_build_object('backgroundColor','#ffffff','textColor','#0f172a','paddingY',48))),
    pg_catalog.jsonb_build_object('op','add_navigation_item','label','About','targetPageRef','new:about','index',0),
    pg_catalog.jsonb_build_object('op','update_section','pageRef','new:about','sectionId','00000000-0000-4000-8000-000000000000','changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('heading','No')))
  )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages',v_base_pages)) RETURNING id INTO v_plan_id;
  -- The last operation is deliberately invalid, proving all prior new-page work rolls back.
  v_before_pages:=(SELECT count(*) FROM public.website_pages WHERE site_id=v_site.id); v_before_globals:=v_site.global_sections; v_before_theme:=v_page.draft_document#>>'{theme,primaryColor}';
  BEGIN PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor); RAISE EXCEPTION 'ATOMIC_FAILURE_ACCEPTED'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'AI_EDIT_TARGET_NOT_FOUND' THEN RAISE; END IF; END;
  IF (SELECT count(*) FROM public.website_pages WHERE site_id=v_site.id)<>v_before_pages OR (SELECT global_sections FROM public.website_sites WHERE id=v_site.id)<>v_before_globals THEN RAISE EXCEPTION 'ATOMIC_ROLLBACK_FAILED'; END IF;

  -- Successful create + temp section + navigation.
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions) VALUES(v_site.organization_id,v_site.id,v_actor,'Create about page',pg_catalog.jsonb_build_object('version',1,'summary','Create and link about','operations',pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('op','create_page','tempRef','new:about','name','About','slug','/about','seo',pg_catalog.jsonb_build_object('title','About us','description','About description'),'sections','[]'::jsonb),
    pg_catalog.jsonb_build_object('op','add_section','pageRef','new:about','index',0,'section',pg_catalog.jsonb_build_object('type','text','props',pg_catalog.jsonb_build_object('heading','About','body','Draft only'),'style',pg_catalog.jsonb_build_object('backgroundColor','#ffffff','textColor','#0f172a','paddingY',48))),
    pg_catalog.jsonb_build_object('op','add_navigation_item','label','About','targetPageRef','new:about','index',0)
  )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages',v_base_pages)) RETURNING id INTO v_plan_id;
  SELECT public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor)->'created_page_ids'->>'new:about' INTO v_new_id;
  IF v_new_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.website_pages WHERE id=v_new_id::uuid AND site_id=v_site.id AND slug='/about' AND draft_version=1)
    OR (SELECT count(*) FROM public.website_page_versions WHERE page_id=v_new_id::uuid)<>1
    OR (SELECT global_sections->'navigation'->0->>'pageId' FROM public.website_sites WHERE id=v_site.id)<>v_new_id
    OR (SELECT draft_document#>>'{sections,0,props,heading}' FROM public.website_pages WHERE id=v_new_id::uuid)<>'About'
  THEN RAISE EXCEPTION 'TEMP_PAGE_CREATE_OR_NAV_FAILED'; END IF;
  v_nav_id:=(SELECT global_sections->'navigation'->0->>'id' FROM public.website_sites WHERE id=v_site.id);

  -- B/C/D/F/G/H/I/J/L/M/N/O/R: representative strict failures and safe metadata/navigation mutations.
  SELECT pg_catalog.jsonb_object_agg(id::text,draft_version) INTO v_base_pages FROM public.website_pages WHERE site_id=v_site.id;
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions) VALUES(v_site.organization_id,v_site.id,v_actor,'Metadata and navigation',pg_catalog.jsonb_build_object('version',1,'summary','Rename slug seo nav','operations',pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('op','rename_page','pageId',v_new_id,'name','Our About'),
    pg_catalog.jsonb_build_object('op','update_page_slug','pageId',v_new_id,'slug','/our-about'),
    pg_catalog.jsonb_build_object('op','update_page_seo','pageId',v_new_id,'seo',pg_catalog.jsonb_build_object('title','Our About','description','Safe metadata')),
    pg_catalog.jsonb_build_object('op','update_navigation_item','navigationId',v_nav_id,'changes',pg_catalog.jsonb_build_object('label','Our About','index',0)),
    pg_catalog.jsonb_build_object('op','remove_navigation_item','navigationId',v_nav_id)
  )),pg_catalog.jsonb_build_object('global_version',(SELECT global_version FROM public.website_sites WHERE id=v_site.id),'pages',v_base_pages,'page_updated_at',pg_catalog.jsonb_build_object(v_new_id,(SELECT updated_at::text FROM public.website_pages WHERE id=v_new_id::uuid)))) RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
  IF (SELECT name FROM public.website_pages WHERE id=v_new_id::uuid)<>'Our About' OR (SELECT slug FROM public.website_pages WHERE id=v_new_id::uuid)<>'/our-about' OR (SELECT seo_title FROM public.website_pages WHERE id=v_new_id::uuid)<>'Our About' OR pg_catalog.jsonb_array_length((SELECT global_sections->'navigation' FROM public.website_sites WHERE id=v_site.id))<>0 THEN RAISE EXCEPTION 'PAGE_OR_NAV_MUTATION_FAILED'; END IF;

  -- Duplicate slug, unsafe slug, bad SEO, and invalid nav target all fail safely.
  FOREACH v_before_theme IN ARRAY ARRAY['duplicate','unsafe','seo','nav','stale'] LOOP
    SELECT pg_catalog.jsonb_object_agg(id::text,draft_version) INTO v_base_pages FROM public.website_pages WHERE site_id=v_site.id;
    INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions) VALUES(v_site.organization_id,v_site.id,v_actor,'Invalid edit',pg_catalog.jsonb_build_object('version',1,'summary','Invalid edit','operations',pg_catalog.jsonb_build_array(
      CASE WHEN v_before_theme='duplicate' THEN pg_catalog.jsonb_build_object('op','create_page','tempRef','new:duplicate','name','Duplicate','slug','/our-about','seo',pg_catalog.jsonb_build_object('title','Duplicate','description','Duplicate'),'sections','[]'::jsonb)
      WHEN v_before_theme='unsafe' THEN pg_catalog.jsonb_build_object('op','update_page_slug','pageId',v_new_id,'slug','/about?x=1')
      WHEN v_before_theme='seo' THEN pg_catalog.jsonb_build_object('op','update_page_seo','pageId',v_new_id,'seo',pg_catalog.jsonb_build_object('title','Ok','meta','<script>'))
      WHEN v_before_theme='nav' THEN pg_catalog.jsonb_build_object('op','add_navigation_item','label','Bad','targetPageId','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','index',0)
      ELSE pg_catalog.jsonb_build_object('op','rename_page','pageId',v_new_id,'name','Stale') END
    )),CASE WHEN v_before_theme='stale' THEN pg_catalog.jsonb_build_object('global_version',(SELECT global_version FROM public.website_sites WHERE id=v_site.id),'pages',v_base_pages,'page_updated_at',pg_catalog.jsonb_build_object(v_new_id,'2000-01-01 00:00:00+00')) ELSE pg_catalog.jsonb_build_object('global_version',(SELECT global_version FROM public.website_sites WHERE id=v_site.id),'pages',v_base_pages,'page_updated_at',pg_catalog.jsonb_build_object(v_new_id,(SELECT updated_at::text FROM public.website_pages WHERE id=v_new_id::uuid))) END) RETURNING id INTO v_plan_id;
    BEGIN PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor); RAISE EXCEPTION 'INVALID_EDIT_ACCEPTED'; EXCEPTION WHEN OTHERS THEN IF v_before_theme='duplicate' AND SQLERRM<>'AI_EDIT_SLUG_CONFLICT' THEN RAISE; ELSIF v_before_theme='unsafe' AND SQLERRM<>'AI_EDIT_INVALID_SLUG' THEN RAISE; ELSIF v_before_theme='seo' AND SQLERRM<>'AI_EDIT_INVALID_SEO' THEN RAISE; ELSIF v_before_theme='nav' AND SQLERRM<>'AI_EDIT_NAV_TARGET_INVALID' THEN RAISE; ELSIF v_before_theme='stale' AND SQLERRM<>'AI_EDIT_STALE_PROPOSAL' THEN RAISE; END IF; END;
  END LOOP;
  IF (SELECT published_release_id FROM public.website_sites WHERE id=v_site.id) IS DISTINCT FROM v_release_id OR (SELECT release_manifest FROM public.website_releases WHERE id=v_release_id)<>v_release_manifest OR (SELECT status FROM public.website_releases WHERE id=v_release_id)<>'published' THEN RAISE EXCEPTION 'PUBLISHED_RELEASE_MUTATED'; END IF;
END;
$$;

SELECT 'PASS: page creation, temp references, sections, navigation, metadata, validation, rollback, staleness, and release immutability' AS result;

ROLLBACK;
