DO $migration$
DECLARE
  v_definition text;
BEGIN
  v_definition := pg_catalog.pg_get_functiondef(
    'public.apply_website_agent_edit_plan(uuid,uuid,uuid)'::pg_catalog.regprocedure
  );
  v_definition := pg_catalog.replace(v_definition,
    'v_operation->''section''->>''type''',
    '(v_operation->''section'')->>''type''');
  v_definition := pg_catalog.replace(v_definition,
    'v_operation->''section''->''props''',
    '(v_operation->''section'')->''props''');
  v_definition := pg_catalog.replace(v_definition,
    'v_operation->''section''->''style''',
    '(v_operation->''section'')->''style''');
  EXECUTE v_definition;
END;
$migration$;
