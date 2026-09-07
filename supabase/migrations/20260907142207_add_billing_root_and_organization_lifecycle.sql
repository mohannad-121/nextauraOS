-- A NULL billing_root_organization_id means the organization is a billing root.
-- This keeps every existing organization valid without a backfill.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_root_organization_id UUID NULL,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_billing_root_organization_id_fkey'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_billing_root_organization_id_fkey
      FOREIGN KEY (billing_root_organization_id)
      REFERENCES public.organizations(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_billing_root_not_self'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_billing_root_not_self
      CHECK (
        billing_root_organization_id IS NULL
        OR billing_root_organization_id <> id
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_lifecycle_status_check'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_lifecycle_status_check
      CHECK (lifecycle_status IN ('active', 'locked', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_lifecycle_timestamps_check'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_lifecycle_timestamps_check
      CHECK (
        (lifecycle_status = 'active' AND locked_at IS NULL AND archived_at IS NULL)
        OR (lifecycle_status = 'locked' AND locked_at IS NOT NULL AND archived_at IS NULL)
        OR (lifecycle_status = 'archived' AND archived_at IS NOT NULL)
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_organizations_billing_root_organization_id
  ON public.organizations(billing_root_organization_id)
  WHERE billing_root_organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_lifecycle_status
  ON public.organizations(lifecycle_status);

-- Returns the requested organization's billing root. The one-hop invariant
-- (a child must reference a root) is checked here; Step 2 will enforce it on
-- organization creation/attachment as well.
CREATE OR REPLACE FUNCTION public.resolve_billing_root_organization_id(
  p_organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_billing_root_organization_id UUID;
  v_root_parent_id UUID;
BEGIN
  IF COALESCE((SELECT auth.role()), 'anon') <> 'service_role'
    AND (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE((SELECT auth.role()), 'anon') <> 'service_role'
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_members AS member
      WHERE member.organization_id = p_organization_id
        AND member.user_id = (SELECT auth.uid())
        AND member.status = 'Active'
    ) THEN
    RAISE EXCEPTION 'Organization access denied';
  END IF;

  SELECT organization.billing_root_organization_id
  INTO v_billing_root_organization_id
  FROM public.organizations AS organization
  WHERE organization.id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  IF v_billing_root_organization_id IS NULL THEN
    RETURN p_organization_id;
  END IF;

  SELECT root.billing_root_organization_id
  INTO v_root_parent_id
  FROM public.organizations AS root
  WHERE root.id = v_billing_root_organization_id;

  IF NOT FOUND OR v_root_parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid billing root relationship';
  END IF;

  RETURN v_billing_root_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_billing_root_organization_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_billing_root_organization_id(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_billing_root_organization_id(UUID)
  TO authenticated, service_role;
