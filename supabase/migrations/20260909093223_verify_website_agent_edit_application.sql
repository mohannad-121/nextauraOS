-- Keep the existing, security-reviewed mutation implementation intact and put
-- its result behind a verified transactional boundary. Any verification error
-- aborts this statement, so the inner mutation (including its proposal status)
-- rolls back with it.
ALTER FUNCTION public.apply_website_agent_edit_plan(uuid, uuid, uuid)
  RENAME TO apply_website_agent_edit_plan_unverified;

CREATE OR REPLACE FUNCTION public.apply_website_agent_edit_plan(
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
  v_plan public.website_agent_edit_plans;
  v_site public.website_sites;
  v_page public.website_pages;
  v_before_state jsonb;
  v_after_state jsonb;
  v_before_page jsonb;
  v_result jsonb;
  v_operation jsonb;
  v_operation_name text;
  v_page_id uuid;
  v_page_key text;
  v_section jsonb;
  v_expected jsonb;
  v_index integer;
  v_affected_pages jsonb := '[]'::jsonb;
  v_global_changed boolean;
  v_verified_operations integer := 0;
BEGIN
  SELECT * INTO v_plan
  FROM public.website_agent_edit_plans
  WHERE id = p_plan_id
    AND organization_id = p_organization_id
    AND created_by = p_actor_id
  FOR UPDATE;

  -- Preserve the existing RPC's authorization/error contract for missing and
  -- ineligible proposals; this early lookup only supplies a stable snapshot.
  IF NOT FOUND THEN
    RETURN public.apply_website_agent_edit_plan_unverified(
      p_plan_id, p_organization_id, p_actor_id
    );
  END IF;

  SELECT * INTO v_site
  FROM public.website_sites
  WHERE id = v_plan.site_id
    AND organization_id = p_organization_id
    AND archived_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN public.apply_website_agent_edit_plan_unverified(
      p_plan_id, p_organization_id, p_actor_id
    );
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'site', pg_catalog.jsonb_build_object(
      'name', v_site.name,
      'defaultLocale', v_site.default_locale,
      'globalSections', v_site.global_sections,
      'publishedReleaseId', v_site.published_release_id
    ),
    'pages', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', page.id,
        'name', page.name,
        'slug', page.slug,
        'seoTitle', page.seo_title,
        'seoDescription', page.seo_description,
        'draftDocument', page.draft_document,
        'draftVersion', page.draft_version
      ) ORDER BY page.id)
      FROM public.website_pages AS page
      WHERE page.site_id = v_site.id
        AND page.organization_id = p_organization_id
    ), '[]'::jsonb)
  ) INTO v_before_state;

  v_result := public.apply_website_agent_edit_plan_unverified(
    p_plan_id, p_organization_id, p_actor_id
  );

  SELECT * INTO v_site
  FROM public.website_sites
  WHERE id = v_plan.site_id
    AND organization_id = p_organization_id;
  IF NOT FOUND OR v_site.published_release_id IS DISTINCT FROM
    (v_before_state->'site'->'publishedReleaseId' #>> '{}')::uuid
  THEN
    RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED';
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'site', pg_catalog.jsonb_build_object(
      'name', v_site.name,
      'defaultLocale', v_site.default_locale,
      'globalSections', v_site.global_sections,
      'publishedReleaseId', v_site.published_release_id
    ),
    'pages', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', page.id,
        'name', page.name,
        'slug', page.slug,
        'seoTitle', page.seo_title,
        'seoDescription', page.seo_description,
        'draftDocument', page.draft_document,
        'draftVersion', page.draft_version
      ) ORDER BY page.id)
      FROM public.website_pages AS page
      WHERE page.site_id = v_site.id
        AND page.organization_id = p_organization_id
    ), '[]'::jsonb)
  ) INTO v_after_state;

  IF v_after_state = v_before_state THEN
    RAISE EXCEPTION 'AI_EDIT_NO_EFFECT';
  END IF;

  -- Confirm each operation's requested, persisted effect. The original
  -- implementation remains responsible for strict shape/authorization checks;
  -- this layer proves the committed draft actually reflects that operation.
  FOR v_operation IN
    SELECT value FROM pg_catalog.jsonb_array_elements(v_plan.plan_json->'operations')
  LOOP
    v_operation_name := v_operation->>'op';
    IF v_operation_name IN ('update_site_metadata', 'update_site_theme',
      'update_global_header', 'update_global_footer', 'add_navigation_item',
      'update_navigation_item', 'remove_navigation_item') THEN
      IF v_operation_name = 'update_site_metadata' AND NOT (
        v_site.name = COALESCE(v_operation->'changes'->>'name', v_site.name)
        AND v_site.default_locale = COALESCE(v_operation->'changes'->>'language', v_site.default_locale)
      ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
      IF v_operation_name = 'update_global_header' AND NOT (
        v_site.global_sections->'header'->'props' @> COALESCE(v_operation->'changes'->'props','{}'::jsonb)
        AND v_site.global_sections->'header'->'style' @> COALESCE(v_operation->'changes'->'style','{}'::jsonb)
      ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
      IF v_operation_name = 'update_global_footer' AND NOT (
        v_site.global_sections->'footer'->'props' @> COALESCE(v_operation->'changes'->'props','{}'::jsonb)
        AND v_site.global_sections->'footer'->'style' @> COALESCE(v_operation->'changes'->'style','{}'::jsonb)
      ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
      IF v_operation_name = 'update_site_theme' AND EXISTS (
        SELECT 1 FROM public.website_pages AS page
        WHERE page.site_id = v_site.id AND page.organization_id = p_organization_id
          AND NOT (page.draft_document->'theme' @> v_operation->'theme')
      ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
      IF v_operation_name = 'remove_navigation_item' AND EXISTS (
        SELECT 1 FROM pg_catalog.jsonb_array_elements(v_site.global_sections->'navigation') AS item
        WHERE item->>'id' = v_operation->>'navigationId'
      ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
      v_verified_operations := v_verified_operations + 1;
      CONTINUE;
    END IF;

    IF v_operation_name = 'create_page' THEN
      v_page_id := (v_result->'created_page_ids'->>v_operation->>'tempRef')::uuid;
    ELSE
      v_page_id := COALESCE(
        NULLIF(v_operation->>'pageId','')::uuid,
        NULLIF(v_result->'created_page_ids'->>v_operation->>'pageRef','')::uuid
      );
    END IF;
    SELECT * INTO v_page FROM public.website_pages
    WHERE id = v_page_id AND site_id = v_site.id AND organization_id = p_organization_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;

    IF v_operation_name = 'create_page' AND NOT (
      v_page.name = v_operation->>'name' AND v_page.slug = v_operation->>'slug'
    ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
    IF v_operation_name = 'rename_page' AND v_page.name <> v_operation->>'name'
      THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
    IF v_operation_name = 'update_page_slug' AND v_page.slug <> v_operation->>'slug'
      THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
    IF v_operation_name = 'update_page_seo' AND NOT (
      (NOT (v_operation->'seo' ? 'title') OR v_page.seo_title = v_operation->'seo'->>'title')
      AND (NOT (v_operation->'seo' ? 'description') OR v_page.seo_description = v_operation->'seo'->>'description')
    ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;

    IF v_operation_name = 'add_section' THEN
      v_index := (v_operation->>'index')::integer;
      v_section := v_page.draft_document #> ARRAY['sections', v_index::text];
      IF v_section IS NULL OR v_section->>'type' <> v_operation->'section'->>'type'
        OR NOT (v_section->'props' @> v_operation->'section'->'props')
        OR NOT (v_section->'style' @> v_operation->'section'->'style')
      THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
    ELSIF v_operation_name = 'update_section' THEN
      SELECT value INTO v_section FROM pg_catalog.jsonb_array_elements(v_page.draft_document->'sections') AS item(value)
      WHERE value->>'id' = v_operation->>'sectionId';
      IF v_section IS NULL
        OR NOT (v_section->'props' @> COALESCE(v_operation->'changes'->'props','{}'::jsonb))
        OR NOT (v_section->'style' @> COALESCE(v_operation->'changes'->'style','{}'::jsonb))
      THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
    ELSIF v_operation_name = 'remove_section' AND EXISTS (
      SELECT 1 FROM pg_catalog.jsonb_array_elements(v_page.draft_document->'sections') AS item
      WHERE item->>'id' = v_operation->>'sectionId'
    ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED';
    ELSIF v_operation_name = 'move_section' AND
      (v_page.draft_document #>> ARRAY['sections',(v_operation->>'index'),'id']) <> v_operation->>'sectionId'
    THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;
    v_verified_operations := v_verified_operations + 1;
  END LOOP;

  FOR v_page IN
    SELECT * FROM public.website_pages
    WHERE site_id = v_site.id AND organization_id = p_organization_id
    ORDER BY id
  LOOP
    SELECT value INTO v_before_page
    FROM pg_catalog.jsonb_array_elements(v_before_state->'pages') AS item(value)
    WHERE value->>'id' = v_page.id::text;
    IF v_before_page IS NULL OR v_before_page->'draftDocument' IS DISTINCT FROM v_page.draft_document THEN
      v_affected_pages := v_affected_pages || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'pageId', v_page.id,
          'previousDraftVersion', COALESCE((v_before_page->>'draftVersion')::integer, 0),
          'newDraftVersion', v_page.draft_version
        )
      );
    END IF;
  END LOOP;
  v_global_changed := v_before_state->'site' IS DISTINCT FROM v_after_state->'site';

  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(v_affected_pages) AS page
    WHERE (page->>'newDraftVersion')::integer <= (page->>'previousDraftVersion')::integer
  ) THEN RAISE EXCEPTION 'AI_EDIT_VERIFICATION_FAILED'; END IF;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'proposalId', v_plan.id,
    'siteId', v_site.id,
    'affectedPages', v_affected_pages,
    'globalChanged', v_global_changed,
    'operationCount', v_verified_operations,
    'createdPageIds', COALESCE(v_result->'created_page_ids','{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_website_agent_edit_plan(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_website_agent_edit_plan_unverified(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_website_agent_edit_plan(uuid, uuid, uuid)
  TO service_role;
