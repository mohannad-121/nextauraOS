-- Preserve why a company is locked so only plan-driven locks are eligible for
-- automatic restoration. Existing locked rows deliberately remain NULL.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lock_reason TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_lock_reason_requires_locked_status'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_lock_reason_requires_locked_status
      CHECK (lock_reason IS NULL OR lifecycle_status = 'locked');
  END IF;
END;
$$;

-- Internal lifecycle reconciler for a billing-root family. It is deliberately
-- not callable by browser roles: trusted billing paths invoke it with the
-- service role after the root subscription projection has been updated.
CREATE OR REPLACE FUNCTION public.reconcile_organization_family_for_plan(
  p_billing_root_organization_id UUID,
  p_effective_plan TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_root_lifecycle_status TEXT;
  v_locked_count INTEGER := 0;
  v_restored_count INTEGER := 0;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  IF p_effective_plan NOT IN ('one_app_free', 'standard', 'custom') THEN
    RAISE EXCEPTION 'Unsupported effective plan';
  END IF;

  SELECT lifecycle_status INTO v_root_lifecycle_status
  FROM public.organizations
  WHERE id = p_billing_root_organization_id
    AND billing_root_organization_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billing root organization not found or is not a root';
  END IF;

  -- A manually locked or archived root is not changed by plan reconciliation.
  -- Its children are already unusable through the inherited root lifecycle.
  IF v_root_lifecycle_status <> 'active' THEN
    RETURN jsonb_build_object(
      'billing_root_organization_id', p_billing_root_organization_id,
      'effective_plan', p_effective_plan,
      'root_lifecycle_status', v_root_lifecycle_status,
      'locked_children', 0,
      'restored_children', 0
    );
  END IF;

  IF p_effective_plan = 'custom' THEN
    UPDATE public.organizations
    SET lifecycle_status = 'active',
        locked_at = NULL,
        lock_reason = NULL
    WHERE billing_root_organization_id = p_billing_root_organization_id
      AND lifecycle_status = 'locked'
      AND lock_reason = 'plan_downgrade';
    GET DIAGNOSTICS v_restored_count = ROW_COUNT;
  ELSE
    UPDATE public.organizations
    SET lifecycle_status = 'locked',
        locked_at = NOW(),
        lock_reason = 'plan_downgrade'
    WHERE billing_root_organization_id = p_billing_root_organization_id
      AND lifecycle_status = 'active';
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'billing_root_organization_id', p_billing_root_organization_id,
    'effective_plan', p_effective_plan,
    'root_lifecycle_status', v_root_lifecycle_status,
    'locked_children', v_locked_count,
    'restored_children', v_restored_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_organization_family_for_plan(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_organization_family_for_plan(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_organization_family_for_plan(UUID, TEXT) TO service_role;
