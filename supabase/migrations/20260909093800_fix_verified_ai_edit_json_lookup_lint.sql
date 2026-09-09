DO $migration$
DECLARE
  v_definition text;
BEGIN
  v_definition := pg_catalog.pg_get_functiondef(
    'public.apply_website_agent_edit_plan(uuid,uuid,uuid)'::pg_catalog.regprocedure
  );
  IF pg_catalog.strpos(v_definition, 'v_result->''created_page_ids''->>v_operation->>''tempRef''') = 0
    OR pg_catalog.strpos(v_definition, 'v_result->''created_page_ids''->>v_operation->>''pageRef''') = 0
  THEN RAISE EXCEPTION 'Expected verified page lookup was not found'; END IF;
  v_definition := pg_catalog.replace(
    v_definition,
    'v_result->''created_page_ids''->>v_operation->>''tempRef''',
    '(v_result->''created_page_ids'')->>(v_operation->>''tempRef'')'
  );
  v_definition := pg_catalog.replace(
    v_definition,
    'v_result->''created_page_ids''->>v_operation->>''pageRef''',
    '(v_result->''created_page_ids'')->>(v_operation->>''pageRef'')'
  );
  EXECUTE v_definition;
END;
$migration$;
