CREATE OR REPLACE FUNCTION public.jsonb_object_length(p_value jsonb)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = '' AS
  'SELECT count(*)::integer FROM jsonb_object_keys(p_value)';
REVOKE ALL ON FUNCTION public.jsonb_object_length(jsonb) FROM PUBLIC, anon, authenticated;
