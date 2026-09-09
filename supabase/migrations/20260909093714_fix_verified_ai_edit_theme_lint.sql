DO $migration$
DECLARE
  v_definition text;
BEGIN
  v_definition := pg_catalog.pg_get_functiondef(
    'public.apply_website_agent_edit_plan(uuid,uuid,uuid)'::pg_catalog.regprocedure
  );
  IF pg_catalog.strpos(v_definition, 'page.draft_document->''theme'' @> v_operation->''theme''') = 0 THEN
    RAISE EXCEPTION 'Expected verified theme check was not found';
  END IF;
  v_definition := pg_catalog.replace(
    v_definition,
    'page.draft_document->''theme'' @> v_operation->''theme''',
    'page.draft_document->''theme'' @> (v_operation->''theme'')'
  );
  EXECUTE v_definition;
END;
$migration$;
