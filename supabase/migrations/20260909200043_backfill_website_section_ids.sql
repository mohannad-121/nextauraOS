-- Older Website Agent initial drafts copied section objects without IDs. The
-- visual editor and AI edit APIs require stable UUID identities, so repair only
-- affected drafts. This is draft metadata maintenance: publishing pointers and
-- immutable release snapshots are deliberately untouched.
DO $$
DECLARE
  v_page public.website_pages;
  v_section jsonb;
  v_sections jsonb;
  v_section_id text;
  v_seen_ids text[];
  v_changed boolean;
  v_next_version integer;
BEGIN
  FOR v_page IN
    SELECT page.*
    FROM public.website_pages AS page
    WHERE pg_catalog.jsonb_typeof(page.draft_document->'sections') = 'array'
    ORDER BY page.id
    FOR UPDATE
  LOOP
    v_sections := '[]'::jsonb;
    v_seen_ids := ARRAY[]::text[];
    v_changed := false;

    FOR v_section IN
      SELECT item.value
      FROM pg_catalog.jsonb_array_elements(v_page.draft_document->'sections') AS item(value)
    LOOP
      v_section_id := v_section->>'id';
      IF v_section_id IS NULL
        OR v_section_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        OR v_section_id = ANY(v_seen_ids)
      THEN
        v_section_id := extensions.gen_random_uuid()::text;
        v_section := pg_catalog.jsonb_set(
          v_section,
          '{id}',
          pg_catalog.to_jsonb(v_section_id),
          true
        );
        v_changed := true;
      END IF;
      v_seen_ids := pg_catalog.array_append(v_seen_ids, v_section_id);
      v_sections := v_sections || pg_catalog.jsonb_build_array(v_section);
    END LOOP;

    IF v_changed THEN
      v_next_version := v_page.draft_version + 1;
      v_page.draft_document := pg_catalog.jsonb_set(
        v_page.draft_document,
        '{sections}',
        v_sections,
        false
      );

      UPDATE public.website_pages
      SET draft_document = v_page.draft_document,
          draft_version = v_next_version,
          updated_at = pg_catalog.now()
      WHERE id = v_page.id;

      INSERT INTO public.website_page_versions (
        organization_id,
        site_id,
        page_id,
        version_number,
        document,
        created_by,
        change_summary
      ) VALUES (
        v_page.organization_id,
        v_page.site_id,
        v_page.id,
        v_next_version,
        v_page.draft_document,
        v_page.created_by,
        'Backfill stable section IDs for Website AI translations'
      );

      INSERT INTO public.audit_logs (
        organization_id,
        user_name,
        action,
        details
      ) VALUES (
        v_page.organization_id,
        v_page.created_by,
        'website.section_ids_backfilled',
        pg_catalog.jsonb_build_object(
          'site_id', v_page.site_id,
          'page_id', v_page.id,
          'draft_version', v_next_version
        )::text
      );
    END IF;
  END LOOP;
END;
$$;
