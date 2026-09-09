-- Preserve the deployed, security-reviewed RPC verbatim while correcting its
-- two theme merges. PostgreSQL JSONB concatenation is strict, so a page without
-- a theme made NULL || patch collapse the page-document accumulator to NULL.
DO $migration$
DECLARE
  v_definition text;
  v_corrected text;
  v_old constant text := '(v_doc->''theme'')||v_theme_patch';
  v_new constant text := 'COALESCE(v_doc->''theme'',''{}''::jsonb)||v_theme_patch';
BEGIN
  v_definition := pg_catalog.pg_get_functiondef(
    'public.apply_website_agent_edit_plan(uuid,uuid,uuid)'::pg_catalog.regprocedure
  );

  IF pg_catalog.strpos(v_definition, v_old) = 0 THEN
    RAISE EXCEPTION 'Expected AI edit theme merge was not found';
  END IF;

  v_corrected := pg_catalog.replace(v_definition, v_old, v_new);
  EXECUTE v_corrected;
END;
$migration$;
