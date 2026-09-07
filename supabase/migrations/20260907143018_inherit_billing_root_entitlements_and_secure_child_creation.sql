-- Resolve plans from the billing root while retaining the requested organization
-- as the tenant context. A locked or archived child/root has no active access.
CREATE OR REPLACE FUNCTION public.organization_entitlement_snapshot(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target public.organizations%ROWTYPE;
  v_root public.organizations%ROWTYPE;
  v_subscription public.organization_subscriptions%ROWTYPE;
  v_capability public.plan_capabilities%ROWTYPE;
  v_plan TEXT := 'one_app_free';
  v_access_active BOOLEAN := true;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Unauthorized organization access';
  END IF;

  SELECT * INTO v_target
  FROM public.organizations
  WHERE id = p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;

  SELECT * INTO v_root
  FROM public.organizations
  WHERE id = COALESCE(v_target.billing_root_organization_id, v_target.id);
  IF NOT FOUND OR v_root.billing_root_organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid billing root relationship';
  END IF;

  SELECT * INTO v_subscription
  FROM public.organization_subscriptions
  WHERE organization_id = v_root.id;
  IF FOUND THEN
    v_plan := v_subscription.plan;
    v_access_active := v_subscription.status IN ('active', 'trialing', 'past_due');
  END IF;

  SELECT * INTO v_capability
  FROM public.plan_capabilities
  WHERE plan = v_plan;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unsupported subscription plan'; END IF;

  v_access_active := v_access_active
    AND v_target.lifecycle_status = 'active'
    AND v_root.lifecycle_status = 'active';

  RETURN jsonb_build_object(
    'plan', v_plan,
    'access_active', v_access_active,
    'organization_id', v_target.id,
    'billing_root_organization_id', v_root.id,
    'organization_lifecycle_status', v_target.lifecycle_status,
    'billing_root_lifecycle_status', v_root.lifecycle_status,
    'max_apps', v_capability.max_apps,
    'all_apps', v_capability.all_apps,
    'max_organizations', v_capability.max_organizations,
    'api_access', v_capability.api_access,
    'automation_access', v_capability.automation_access,
    'customization_access', v_capability.customization_access,
    'support_tier', v_capability.support_tier,
    'ai_access', v_capability.ai_access
  );
END;
$$;

REVOKE ALL ON FUNCTION public.organization_entitlement_snapshot(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.organization_entitlement_snapshot(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.organization_entitlement_snapshot(UUID) TO authenticated, service_role;

-- Service activation uses the child organization for records but its billing
-- root for plan capabilities and subscription status.
CREATE OR REPLACE FUNCTION public.complete_initial_service_selection(
  p_user_id UUID,
  p_organization_id UUID,
  p_service_keys TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target public.organizations%ROWTYPE;
  v_root public.organizations%ROWTYPE;
  v_plan TEXT := 'one_app_free';
  v_status TEXT;
  v_max_apps INTEGER;
  v_all_apps BOOLEAN;
  v_invalid_count INTEGER;
  v_selected_count INTEGER;
  v_key TEXT;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: specified user does not exist';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = p_user_id AND status = 'Active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user is not an active organization member';
  END IF;
  IF p_service_keys IS NULL OR cardinality(p_service_keys) = 0 THEN
    RAISE EXCEPTION 'At least one service must be selected';
  END IF;

  SELECT * INTO v_target FROM public.organizations WHERE id = p_organization_id;
  IF NOT FOUND OR v_target.lifecycle_status <> 'active' THEN
    RAISE EXCEPTION 'This organization is locked or archived.';
  END IF;
  SELECT * INTO v_root FROM public.organizations
  WHERE id = COALESCE(v_target.billing_root_organization_id, v_target.id);
  IF NOT FOUND OR v_root.billing_root_organization_id IS NOT NULL OR v_root.lifecycle_status <> 'active' THEN
    RAISE EXCEPTION 'The billing root is not active.';
  END IF;

  SELECT plan, status INTO v_plan, v_status
  FROM public.organization_subscriptions
  WHERE organization_id = v_root.id;
  IF FOUND AND v_status NOT IN ('active', 'trialing', 'past_due') THEN
    RAISE EXCEPTION 'Your subscription is not active. Choose or reactivate a plan to enable services.';
  END IF;
  v_plan := COALESCE(v_plan, 'one_app_free');
  SELECT max_apps, all_apps INTO v_max_apps, v_all_apps
  FROM public.plan_capabilities WHERE plan = v_plan;

  SELECT COUNT(*) INTO v_invalid_count
  FROM UNNEST(p_service_keys) AS requested(key)
  LEFT JOIN public.services service ON service.key = requested.key AND service.is_active = true
  WHERE service.key IS NULL
    OR (v_plan = 'one_app_free' AND service.minimum_plan <> 'standard')
    OR (v_plan = 'standard' AND service.minimum_plan = 'custom');
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'One or more services are unavailable on your current plan. Upgrade to Custom for Custom-only services.';
  END IF;

  IF NOT v_all_apps THEN
    SELECT COUNT(*) INTO v_selected_count FROM (
      SELECT service_key FROM public.organization_services
      WHERE organization_id = p_organization_id AND status = 'active'
      UNION
      SELECT UNNEST(p_service_keys)
    ) active_or_requested;
    IF v_selected_count > v_max_apps THEN
      RAISE EXCEPTION 'Free includes one enabled business app. Upgrade to Standard to enable another app.';
    END IF;
  END IF;

  FOREACH v_key IN ARRAY p_service_keys LOOP
    INSERT INTO public.organization_services (organization_id, service_key, status, activated_at)
    VALUES (p_organization_id, v_key, 'active', NOW())
    ON CONFLICT (organization_id, service_key)
    DO UPDATE SET status = 'active', activated_at = NOW();
  END LOOP;

  UPDATE public.profiles
  SET initial_service_selection_completed = true, onboarding_completed = true, updated_at = NOW()
  WHERE id = p_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', p_organization_id,
    'billing_root_organization_id', v_root.id,
    'activated_keys', p_service_keys,
    'plan', v_plan
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) TO service_role;

-- Replaces the old arbitrary-Custom-membership rule. The no-root path remains
-- for first-time onboarding only; additional companies require an explicit,
-- active Custom billing root owned by the caller.
DROP FUNCTION IF EXISTS public.create_user_workspace(TEXT, TEXT);

CREATE FUNCTION public.create_user_workspace(
  p_org_name TEXT,
  p_slug TEXT DEFAULT NULL,
  p_billing_root_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_slug TEXT;
  v_existing_org_count INTEGER;
  v_root public.organizations%ROWTYPE;
  v_root_role TEXT;
  v_root_plan TEXT;
  v_root_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized: user authentication required'; END IF;
  IF NULLIF(BTRIM(p_org_name), '') IS NULL THEN RAISE EXCEPTION 'Organization name is required'; END IF;

  SELECT COUNT(*) INTO v_existing_org_count
  FROM public.organization_members
  WHERE user_id = v_user_id AND status = 'Active';

  IF v_existing_org_count = 0 THEN
    IF p_billing_root_organization_id IS NOT NULL THEN
      RAISE EXCEPTION 'A first organization cannot be attached to a billing root.';
    END IF;
  ELSE
    IF p_billing_root_organization_id IS NULL THEN
      RAISE EXCEPTION 'Select an active Custom billing root to create another organization.';
    END IF;

    SELECT * INTO v_root
    FROM public.organizations
    WHERE id = p_billing_root_organization_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Billing root organization not found'; END IF;
    IF v_root.billing_root_organization_id IS NOT NULL THEN
      RAISE EXCEPTION 'A child organization cannot authorize another company.';
    END IF;
    IF v_root.lifecycle_status <> 'active' THEN
      RAISE EXCEPTION 'The billing root is locked or archived.';
    END IF;

    SELECT role INTO v_root_role
    FROM public.organization_members
    WHERE organization_id = v_root.id AND user_id = v_user_id AND status = 'Active';
    IF NOT FOUND OR v_root_role <> 'Owner' THEN
      RAISE EXCEPTION 'Only the billing root Owner can create another organization.';
    END IF;

    SELECT plan, status INTO v_root_plan, v_root_status
    FROM public.organization_subscriptions
    WHERE organization_id = v_root.id;
    IF NOT FOUND OR v_root_plan <> 'custom' OR v_root_status NOT IN ('active', 'trialing', 'past_due') THEN
      RAISE EXCEPTION 'An active Custom plan is required to create another organization.';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
  FROM auth.users WHERE id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  v_slug := COALESCE(NULLIF(p_slug, ''), LOWER(REGEXP_REPLACE(p_org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(v_user_id::text FROM 1 FOR 6));
  INSERT INTO public.organizations (name, slug, created_by, billing_root_organization_id)
  VALUES (p_org_name, v_slug, v_user_id, p_billing_root_organization_id)
  RETURNING id INTO v_org_id;
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, 'Owner', 'Active');

  IF p_billing_root_organization_id IS NOT NULL THEN
    INSERT INTO public.organization_services (organization_id, service_key, status, activated_at)
    SELECT v_org_id, service.key, 'active', NOW()
    FROM public.services AS service
    WHERE service.is_active = true
      AND service.minimum_plan IN ('standard', 'custom')
    ON CONFLICT (organization_id, service_key)
    DO UPDATE SET status = 'active', activated_at = NOW();
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'slug', slug,
      'created_by', created_by,
      'created_at', created_at,
      'billing_root_organization_id', billing_root_organization_id,
      'lifecycle_status', lifecycle_status
    )
    FROM public.organizations
    WHERE id = v_org_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_workspace(TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_user_workspace(TEXT, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_user_workspace(TEXT, TEXT, UUID) TO authenticated, service_role;
