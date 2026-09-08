BEGIN;

DO $$
DECLARE
  v_site public.website_sites;
  v_page public.website_pages;
  v_actor uuid;
  v_plan_id uuid;
  v_release_id uuid := extensions.gen_random_uuid();
  v_release_version integer;
  v_release_manifest jsonb := pg_catalog.jsonb_build_object('version', 1, 'fixture', 'immutable published release');
  v_release_count bigint;
  v_base_pages jsonb;
  v_before_pages jsonb;
  v_before_globals jsonb;
  v_before_global_version integer;
  v_before_name text;
  v_before_locale text;
  v_after_site public.website_sites;
  v_section_id constant text := '11111111-1111-4111-8111-111111111111';
BEGIN
  SELECT s.* INTO v_site
  FROM public.website_sites s
  WHERE s.archived_at IS NULL
    AND EXISTS (SELECT 1 FROM public.website_pages p WHERE p.site_id = s.id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = s.organization_id
        AND m.status = 'Active' AND m.role IN ('Owner','Admin')
    )
  ORDER BY s.created_at LIMIT 1;
  IF v_site.id IS NULL THEN RAISE EXCEPTION 'TEST_FIXTURE_MISSING'; END IF;

  SELECT m.user_id INTO v_actor
  FROM public.organization_members m
  WHERE m.organization_id = v_site.organization_id
    AND m.status = 'Active' AND m.role IN ('Owner','Admin')
  ORDER BY m.created_at LIMIT 1;
  SELECT * INTO v_page FROM public.website_pages
  WHERE site_id = v_site.id AND organization_id = v_site.organization_id
  ORDER BY created_at LIMIT 1;

  -- Normalize only transactional test data to the currently supported builder schemas.
  UPDATE public.website_pages
  SET draft_document = pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(draft_document, '{theme}', pg_catalog.jsonb_build_object(
      'primaryColor','#2563eb','secondaryColor','#4f46e5','surfaceColor','#f8fafc',
      'mutedTextColor','#64748b','backgroundColor','#ffffff','textColor','#0f172a',
      'headingFont','Manrope','bodyFont','Inter','radius','md','direction','ltr','preset','minimal'
    ), true),
    '{sections}',
    CASE WHEN id = v_page.id THEN pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'id',v_section_id,'type','text','props',pg_catalog.jsonb_build_object('heading','Original','body','Body'),
      'style',pg_catalog.jsonb_build_object('backgroundColor','#ffffff','textColor','#0f172a','paddingY',48)
    )) ELSE draft_document->'sections' END,
    false
  )
  WHERE site_id = v_site.id AND organization_id = v_site.organization_id;

  UPDATE public.website_sites
  SET name = 'AI Global Test', default_locale = 'en',
      global_sections = pg_catalog.jsonb_build_object(
        'version',1,'navigation','[]'::jsonb,
        'header',pg_catalog.jsonb_build_object(
          'id','22222222-2222-4222-8222-222222222222','type','header',
          'props',pg_catalog.jsonb_build_object('siteName','AI Global Test','ctaLabel','Start','ctaUrl','#','sticky',false),
          'style',pg_catalog.jsonb_build_object('backgroundColor','#ffffff','textColor','#0f172a','transparent',false)
        ),
        'footer',pg_catalog.jsonb_build_object(
          'id','33333333-3333-4333-8333-333333333333','type','footer',
          'props',pg_catalog.jsonb_build_object('siteName','AI Global Test','description','Description','copyright','© AI Global Test'),
          'style',pg_catalog.jsonb_build_object('backgroundColor','#0f172a','textColor','#ffffff')
        )
      )
  WHERE id = v_site.id RETURNING * INTO v_site;

  SELECT COALESCE(pg_catalog.max(version_number),0) + 1 INTO v_release_version
  FROM public.website_releases WHERE site_id = v_site.id;
  UPDATE public.website_releases SET status='superseded' WHERE site_id=v_site.id AND status='published';
  INSERT INTO public.website_releases(id,organization_id,site_id,version_number,status,release_manifest,created_by,published_at)
  VALUES(v_release_id,v_site.organization_id,v_site.id,v_release_version,'published',v_release_manifest,v_actor,pg_catalog.now());
  UPDATE public.website_sites SET published_release_id=v_release_id,status='published' WHERE id=v_site.id RETURNING * INTO v_site;
  SELECT pg_catalog.count(*) INTO v_release_count FROM public.website_releases WHERE site_id=v_site.id;

  -- A. Theme changes merge into every page draft and are versioned once per page.
  SELECT pg_catalog.jsonb_object_agg(id::text,draft_version) INTO v_base_pages FROM public.website_pages WHERE site_id=v_site.id;
  v_before_global_version := v_site.global_version;
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Update theme',
    pg_catalog.jsonb_build_object('version',1,'summary','Theme update','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_site_theme','theme',pg_catalog.jsonb_build_object('primaryColor','#123456','radius','lg'))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages',v_base_pages)) RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
  SELECT * INTO v_site FROM public.website_sites WHERE id=v_site.id;
  IF v_site.global_version <> v_before_global_version + 1
    OR EXISTS (SELECT 1 FROM public.website_pages WHERE site_id=v_site.id AND draft_document->'theme'->>'primaryColor' <> '#123456')
    OR EXISTS (SELECT 1 FROM public.website_pages WHERE site_id=v_site.id AND draft_document->'theme'->>'radius' <> 'lg')
  THEN RAISE EXCEPTION 'VALID_THEME_FAILED'; END IF;

  -- B/C/D. Invalid color, font, and unknown fields are rejected without mutation.
  FOREACH v_before_name IN ARRAY ARRAY['gold','#FFF','Comic Sans','unknown-field'] LOOP
    SELECT pg_catalog.jsonb_object_agg(id::text,draft_version) INTO v_base_pages FROM public.website_pages WHERE site_id=v_site.id;
    INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
    VALUES(v_site.organization_id,v_site.id,v_actor,'Invalid theme',
      pg_catalog.jsonb_build_object('version',1,'summary','Invalid theme','operations',pg_catalog.jsonb_build_array(
        CASE WHEN v_before_name = 'Comic Sans' THEN pg_catalog.jsonb_build_object('op','update_site_theme','theme',pg_catalog.jsonb_build_object('headingFont',v_before_name))
             WHEN v_before_name = 'unknown-field' THEN pg_catalog.jsonb_build_object('op','update_site_theme','theme',pg_catalog.jsonb_build_object('customCss','body{}'))
             ELSE pg_catalog.jsonb_build_object('op','update_site_theme','theme',pg_catalog.jsonb_build_object('primaryColor',v_before_name)) END
      )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages',v_base_pages)) RETURNING id INTO v_plan_id;
    BEGIN
      PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
      RAISE EXCEPTION 'INVALID_THEME_ACCEPTED';
    EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_INVALID_THEME' THEN RAISE; END IF; END;
  END LOOP;

  -- E/F. Safe metadata succeeds; protected fields are rejected.
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Update metadata',
    pg_catalog.jsonb_build_object('version',1,'summary','Metadata update','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_site_metadata','changes',pg_catalog.jsonb_build_object('name','Updated Site','language','en'))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages','{}'::jsonb)) RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
  SELECT * INTO v_site FROM public.website_sites WHERE id=v_site.id;
  IF v_site.name <> 'Updated Site' OR v_site.default_locale <> 'en' THEN RAISE EXCEPTION 'VALID_METADATA_FAILED'; END IF;

  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Protected metadata',
    pg_catalog.jsonb_build_object('version',1,'summary','Protected metadata','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_site_metadata','changes',pg_catalog.jsonb_build_object('published_release_id',NULL))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages','{}'::jsonb)) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'PROTECTED_METADATA_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_INVALID_METADATA' THEN RAISE; END IF; END;

  -- G/H. Header changes succeed; dangerous and unknown style content is rejected.
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Update header',
    pg_catalog.jsonb_build_object('version',1,'summary','Header update','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_global_header','changes',pg_catalog.jsonb_build_object(
        'props',pg_catalog.jsonb_build_object('siteName','Header Brand','ctaLabel','Explore','ctaUrl','/about','sticky',true),
        'style',pg_catalog.jsonb_build_object('backgroundColor','#fafafa','transparent',false)))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages','{}'::jsonb)) RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
  SELECT * INTO v_site FROM public.website_sites WHERE id=v_site.id;
  IF v_site.global_sections#>>'{header,props,siteName}' <> 'Header Brand' OR v_site.global_sections#>>'{header,props,ctaUrl}' <> '/about' THEN RAISE EXCEPTION 'VALID_HEADER_FAILED'; END IF;

  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Invalid header',
    pg_catalog.jsonb_build_object('version',1,'summary','Invalid header','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_global_header','changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('ctaLabel','<script>alert(1)</script>'),'style',pg_catalog.jsonb_build_object('customCss','position:fixed')))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages','{}'::jsonb)) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'INVALID_HEADER_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_INVALID_GLOBAL_SECTION' THEN RAISE; END IF; END;

  -- I/J. Footer changes succeed and dangerous content is rejected.
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Update footer',
    pg_catalog.jsonb_build_object('version',1,'summary','Footer update','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_global_footer','changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('description','A safe footer','copyright','© Updated'),'style',pg_catalog.jsonb_build_object('backgroundColor','#111827')))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages','{}'::jsonb)) RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
  SELECT * INTO v_site FROM public.website_sites WHERE id=v_site.id;
  IF v_site.global_sections#>>'{footer,props,description}' <> 'A safe footer' THEN RAISE EXCEPTION 'VALID_FOOTER_FAILED'; END IF;

  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Invalid footer',
    pg_catalog.jsonb_build_object('version',1,'summary','Invalid footer','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_global_footer','changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('description','javascript:alert(1)')))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages','{}'::jsonb)) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'INVALID_FOOTER_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_INVALID_GLOBAL_SECTION' THEN RAISE; END IF; END;

  -- K. Global optimistic concurrency rejects stale proposals.
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Stale global',
    pg_catalog.jsonb_build_object('version',1,'summary','Stale global','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_site_metadata','changes',pg_catalog.jsonb_build_object('name','Stale'))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version-1,'pages','{}'::jsonb)) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'STALE_GLOBAL_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_STALE_PROPOSAL' THEN RAISE; END IF; END;

  -- L. Mixed global and section operations apply in order with one write/version per page.
  SELECT pg_catalog.jsonb_object_agg(id::text,draft_version) INTO v_base_pages FROM public.website_pages WHERE site_id=v_site.id;
  v_before_global_version := v_site.global_version;
  SELECT * INTO v_page FROM public.website_pages WHERE id=v_page.id;
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Mixed edit',
    pg_catalog.jsonb_build_object('version',1,'summary','Mixed edit','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_site_theme','theme',pg_catalog.jsonb_build_object('secondaryColor','#be123c')),
      pg_catalog.jsonb_build_object('op','update_global_header','changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('ctaLabel','Mixed'))),
      pg_catalog.jsonb_build_object('op','update_section','pageId',v_page.id,'sectionId',v_section_id,'changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('heading','Mixed heading'))),
      pg_catalog.jsonb_build_object('op','update_global_footer','changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('description','Mixed footer')))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages',v_base_pages)) RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
  SELECT * INTO v_site FROM public.website_sites WHERE id=v_site.id;
  SELECT * INTO v_page FROM public.website_pages WHERE id=v_page.id;
  IF v_site.global_version <> v_before_global_version + 1
    OR v_page.draft_version <> (v_base_pages->>v_page.id::text)::integer + 1
    OR v_page.draft_document#>>'{sections,0,props,heading}' <> 'Mixed heading'
    OR v_site.global_sections#>>'{header,props,ctaLabel}' <> 'Mixed'
    OR v_site.global_sections#>>'{footer,props,description}' <> 'Mixed footer'
  THEN RAISE EXCEPTION 'MIXED_OPERATION_FAILED'; END IF;

  -- M. An invalid final operation rolls all prior global and page changes back.
  SELECT pg_catalog.jsonb_object_agg(id::text,pg_catalog.jsonb_build_object('version',draft_version,'document',draft_document)) INTO v_before_pages FROM public.website_pages WHERE site_id=v_site.id;
  v_before_globals := v_site.global_sections; v_before_global_version := v_site.global_version; v_before_name := v_site.name; v_before_locale := v_site.default_locale;
  SELECT pg_catalog.jsonb_object_agg(id::text,draft_version) INTO v_base_pages FROM public.website_pages WHERE site_id=v_site.id;
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Atomic rollback',
    pg_catalog.jsonb_build_object('version',1,'summary','Atomic rollback','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_site_theme','theme',pg_catalog.jsonb_build_object('primaryColor','#abcdef')),
      pg_catalog.jsonb_build_object('op','update_global_header','changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('siteName','Must rollback'))),
      pg_catalog.jsonb_build_object('op','update_section','pageId',v_page.id,'sectionId',v_section_id,'changes',pg_catalog.jsonb_build_object('props',pg_catalog.jsonb_build_object('heading','Must rollback'))),
      pg_catalog.jsonb_build_object('op','update_global_footer','changes',pg_catalog.jsonb_build_object('style',pg_catalog.jsonb_build_object('arbitraryCss','display:none')))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages',v_base_pages)) RETURNING id INTO v_plan_id;
  BEGIN
    PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
    RAISE EXCEPTION 'INVALID_FINAL_OPERATION_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'AI_EDIT_INVALID_GLOBAL_SECTION' THEN RAISE; END IF; END;
  SELECT * INTO v_after_site FROM public.website_sites WHERE id=v_site.id;
  IF v_after_site.global_sections <> v_before_globals OR v_after_site.global_version <> v_before_global_version OR v_after_site.name <> v_before_name OR v_after_site.default_locale <> v_before_locale
    OR (SELECT pg_catalog.jsonb_object_agg(id::text,pg_catalog.jsonb_build_object('version',draft_version,'document',draft_document)) FROM public.website_pages WHERE site_id=v_site.id) <> v_before_pages
  THEN RAISE EXCEPTION 'MIXED_ROLLBACK_FAILED'; END IF;

  -- P. Arabic locale, RTL direction, and allowlisted Arabic fonts validate together.
  SELECT pg_catalog.jsonb_object_agg(id::text,draft_version) INTO v_base_pages FROM public.website_pages WHERE site_id=v_site.id;
  INSERT INTO public.website_agent_edit_plans(organization_id,site_id,created_by,instruction,plan_json,base_versions)
  VALUES(v_site.organization_id,v_site.id,v_actor,'Arabic RTL',
    pg_catalog.jsonb_build_object('version',1,'summary','Arabic RTL','operations',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('op','update_site_metadata','changes',pg_catalog.jsonb_build_object('language','ar')),
      pg_catalog.jsonb_build_object('op','update_site_theme','theme',pg_catalog.jsonb_build_object('direction','rtl','headingFont','IBM Plex Sans Arabic','bodyFont','Noto Sans Arabic'))
    )),pg_catalog.jsonb_build_object('global_version',v_site.global_version,'pages',v_base_pages)) RETURNING id INTO v_plan_id;
  PERFORM public.apply_website_agent_edit_plan(v_plan_id,v_site.organization_id,v_actor);
  SELECT * INTO v_site FROM public.website_sites WHERE id=v_site.id;
  IF v_site.default_locale <> 'ar'
    OR EXISTS (SELECT 1 FROM public.website_pages WHERE site_id=v_site.id AND (draft_document#>>'{theme,direction}' <> 'rtl' OR draft_document#>>'{theme,headingFont}' <> 'IBM Plex Sans Arabic' OR draft_document#>>'{theme,bodyFont}' <> 'Noto Sans Arabic'))
  THEN RAISE EXCEPTION 'ARABIC_RTL_FAILED'; END IF;
  PERFORM public.validate_website_agent_global_section(v_site.global_sections->'header','header');
  PERFORM public.validate_website_agent_global_section(v_site.global_sections->'footer','footer');

  -- N/O. The active release pointer, immutable manifest, status, and row count never change.
  IF v_site.published_release_id IS DISTINCT FROM v_release_id THEN RAISE EXCEPTION 'PUBLISHED_RELEASE_POINTER_CHANGED'; END IF;
  IF (SELECT release_manifest FROM public.website_releases WHERE id=v_release_id) <> v_release_manifest THEN RAISE EXCEPTION 'ACTIVE_RELEASE_MANIFEST_CHANGED'; END IF;
  IF (SELECT status FROM public.website_releases WHERE id=v_release_id) <> 'published' THEN RAISE EXCEPTION 'ACTIVE_RELEASE_STATUS_CHANGED'; END IF;
  IF (SELECT pg_catalog.count(*) FROM public.website_releases WHERE site_id=v_site.id) <> v_release_count THEN RAISE EXCEPTION 'WEBSITE_RELEASE_CREATED'; END IF;
END;
$$;

SELECT 'PASS: site theme, metadata, globals, concurrency, atomicity, RTL, and published-release immutability' AS result;
ROLLBACK;
