CREATE TABLE IF NOT EXISTS public.user_active_organization_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_active_organization_preferences_organization_id
  ON public.user_active_organization_preferences(organization_id);

ALTER TABLE public.user_active_organization_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active organization preference"
  ON public.user_active_organization_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.user_active_organization_preferences FROM anon, authenticated;
GRANT SELECT ON public.user_active_organization_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.set_active_organization(p_organization_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members AS member
    JOIN public.organizations AS organization ON organization.id = member.organization_id
    WHERE member.organization_id = p_organization_id
      AND member.user_id = v_user_id
      AND member.status = 'Active'
      AND organization.lifecycle_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active organization membership is required';
  END IF;

  INSERT INTO public.user_active_organization_preferences (user_id, organization_id, updated_at)
  VALUES (v_user_id, p_organization_id, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET organization_id = EXCLUDED.organization_id,
      updated_at = EXCLUDED.updated_at;

  RETURN p_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_active_organization()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_organization_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT preference.organization_id INTO v_organization_id
  FROM public.user_active_organization_preferences AS preference
  JOIN public.organization_members AS member
    ON member.organization_id = preference.organization_id
   AND member.user_id = v_user_id
   AND member.status = 'Active'
  JOIN public.organizations AS organization
    ON organization.id = preference.organization_id
   AND organization.lifecycle_status = 'active'
  WHERE preference.user_id = v_user_id;

  IF FOUND THEN
    RETURN v_organization_id;
  END IF;

  SELECT member.organization_id INTO v_organization_id
  FROM public.organization_members AS member
  JOIN public.organizations AS organization
    ON organization.id = member.organization_id
   AND organization.lifecycle_status = 'active'
  WHERE member.user_id = v_user_id
    AND member.status = 'Active'
  ORDER BY
    CASE WHEN member.role = 'Owner' THEN 0 ELSE 1 END,
    member.created_at ASC,
    member.organization_id ASC
  LIMIT 1;

  RETURN v_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_organization(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_active_organization(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_active_organization(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolve_active_organization() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_active_organization() FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_active_organization() TO authenticated, service_role;
