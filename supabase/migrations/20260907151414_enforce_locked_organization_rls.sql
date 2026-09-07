-- Existing tenant policies consistently delegate to is_org_member(). Include
-- lifecycle here so a preserved membership cannot be used to read or mutate a
-- locked child organization through the Data API.
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_members AS member
    JOIN public.organizations AS organization
      ON organization.id = member.organization_id
    WHERE member.organization_id = target_org_id
      AND member.user_id = (SELECT auth.uid())
      AND member.status = 'Active'
      AND organization.lifecycle_status = 'active'
  );
END;
$$;
