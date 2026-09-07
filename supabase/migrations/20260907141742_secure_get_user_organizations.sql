-- Restrict this SECURITY DEFINER helper to the authenticated caller's own
-- memberships.  It was previously executable by anon and accepted arbitrary
-- user IDs, allowing it to bypass organization_members RLS.
CREATE OR REPLACE FUNCTION public.get_user_organizations(p_user_id UUID)
RETURNS TABLE(
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  user_role TEXT,
  member_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized organization access';
  END IF;

  RETURN QUERY
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    om.role AS user_role,
    om.status AS member_status
  FROM public.organizations AS o
  INNER JOIN public.organization_members AS om ON om.organization_id = o.id
  WHERE om.user_id = p_user_id
    AND om.status = 'Active';
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_organizations(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_organizations(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_organizations(UUID) TO authenticated, service_role;
