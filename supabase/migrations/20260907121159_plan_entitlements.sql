-- Provider-neutral plan capabilities. Billing providers only write organization_subscriptions.plan.
CREATE TABLE IF NOT EXISTS public.plan_capabilities (
  plan TEXT PRIMARY KEY CHECK (plan IN ('one_app_free', 'standard', 'custom')),
  max_apps INTEGER,
  all_apps BOOLEAN NOT NULL DEFAULT false,
  max_organizations INTEGER,
  api_access BOOLEAN NOT NULL DEFAULT false,
  automation_access BOOLEAN NOT NULL DEFAULT false,
  customization_access BOOLEAN NOT NULL DEFAULT false,
  support_tier TEXT NOT NULL CHECK (support_tier IN ('community', 'standard', 'priority')),
  ai_access BOOLEAN NOT NULL DEFAULT true,
  CHECK ((all_apps AND max_apps IS NULL) OR (NOT all_apps AND max_apps IS NOT NULL)),
  CHECK ((max_organizations IS NULL) OR max_organizations >= 1)
);

INSERT INTO public.plan_capabilities (plan, max_apps, all_apps, max_organizations, api_access, automation_access, customization_access, support_tier, ai_access)
VALUES
  ('one_app_free', 1, false, 1, false, false, false, 'community', true),
  ('standard', NULL, true, 1, false, false, false, 'standard', true),
  ('custom', NULL, true, NULL, true, true, true, 'priority', true)
ON CONFLICT (plan) DO UPDATE SET
  max_apps = EXCLUDED.max_apps,
  all_apps = EXCLUDED.all_apps,
  max_organizations = EXCLUDED.max_organizations,
  api_access = EXCLUDED.api_access,
  automation_access = EXCLUDED.automation_access,
  customization_access = EXCLUDED.customization_access,
  support_tier = EXCLUDED.support_tier,
  ai_access = EXCLUDED.ai_access;

-- Every currently shipped business service is included in Standard. Future Custom-only
-- services can be classified without changing subscription or checkout code.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS minimum_plan TEXT NOT NULL DEFAULT 'standard'
  CHECK (minimum_plan IN ('standard', 'custom'));

UPDATE public.services SET minimum_plan = 'standard' WHERE minimum_plan IS NULL;

ALTER TABLE public.plan_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read plan capabilities" ON public.plan_capabilities
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.plan_capabilities TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.plan_capabilities FROM anon, authenticated;

-- The effective plan is subscription-backed. A workspace with no subscription record is
-- treated as Free during onboarding; a canceled/paused subscription has no app access.
CREATE OR REPLACE FUNCTION public.organization_entitlement_snapshot(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription public.organization_subscriptions%ROWTYPE;
  v_capability public.plan_capabilities%ROWTYPE;
  v_plan TEXT := 'one_app_free';
  v_access_active BOOLEAN := true;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Unauthorized organization access';
  END IF;

  SELECT * INTO v_subscription FROM public.organization_subscriptions
  WHERE organization_id = p_organization_id;

  IF FOUND THEN
    v_plan := v_subscription.plan;
    v_access_active := v_subscription.status IN ('active', 'trialing', 'past_due');
  END IF;

  SELECT * INTO v_capability FROM public.plan_capabilities WHERE plan = v_plan;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unsupported subscription plan'; END IF;

  RETURN jsonb_build_object(
    'plan', v_plan,
    'access_active', v_access_active,
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
GRANT EXECUTE ON FUNCTION public.organization_entitlement_snapshot(UUID) TO authenticated, service_role;

-- Server-side, atomic service activation. It cannot be bypassed by changing client state.
CREATE OR REPLACE FUNCTION public.complete_initial_service_selection(
  p_user_id UUID,
  p_organization_id UUID,
  p_service_keys TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT := 'one_app_free';
  v_status TEXT;
  v_max_apps INTEGER;
  v_all_apps BOOLEAN;
  v_is_member BOOLEAN;
  v_invalid_count INTEGER;
  v_selected_count INTEGER;
  v_key TEXT;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: specified user does not exist';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = p_organization_id AND user_id = p_user_id AND status = 'Active') INTO v_is_member;
  IF NOT v_is_member THEN RAISE EXCEPTION 'Unauthorized: user is not an active organization member'; END IF;
  IF p_service_keys IS NULL OR cardinality(p_service_keys) = 0 THEN RAISE EXCEPTION 'At least one service must be selected'; END IF;

  SELECT plan, status INTO v_plan, v_status FROM public.organization_subscriptions WHERE organization_id = p_organization_id;
  IF FOUND AND v_status NOT IN ('active', 'trialing', 'past_due') THEN
    RAISE EXCEPTION 'Your subscription is not active. Choose or reactivate a plan to enable services.';
  END IF;
  v_plan := COALESCE(v_plan, 'one_app_free');
  SELECT max_apps, all_apps INTO v_max_apps, v_all_apps FROM public.plan_capabilities WHERE plan = v_plan;

  SELECT COUNT(*) INTO v_invalid_count
  FROM UNNEST(p_service_keys) AS requested(key)
  LEFT JOIN public.services service ON service.key = requested.key AND service.is_active = true
  WHERE service.key IS NULL OR (v_plan = 'one_app_free' AND service.minimum_plan <> 'standard') OR (v_plan = 'standard' AND service.minimum_plan = 'custom');
  IF v_invalid_count > 0 THEN RAISE EXCEPTION 'One or more services are unavailable on your current plan. Upgrade to Custom for Custom-only services.'; END IF;

  IF NOT v_all_apps THEN
    SELECT COUNT(*) INTO v_selected_count FROM (
      SELECT service_key FROM public.organization_services WHERE organization_id = p_organization_id AND status = 'active'
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
    ON CONFLICT (organization_id, service_key) DO UPDATE SET status = 'active', activated_at = NOW();
  END LOOP;

  UPDATE public.profiles SET initial_service_selection_completed = true, onboarding_completed = true, updated_at = NOW() WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'organization_id', p_organization_id, 'activated_keys', p_service_keys, 'plan', v_plan);
END;
$$;

-- Only Custom may create a second workspace. First workspace remains available to new users.
CREATE OR REPLACE FUNCTION public.create_user_workspace(p_org_name TEXT, p_slug TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_slug TEXT;
  v_existing_org_count INTEGER;
  v_has_custom BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized: user authentication required'; END IF;
  SELECT COUNT(*) INTO v_existing_org_count FROM public.organization_members WHERE user_id = v_user_id AND status = 'Active';
  IF v_existing_org_count > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members member
      JOIN public.organization_subscriptions subscription ON subscription.organization_id = member.organization_id
      WHERE member.user_id = v_user_id AND member.status = 'Active'
        AND subscription.plan = 'custom' AND subscription.status IN ('active', 'trialing', 'past_due')
    ) INTO v_has_custom;
    IF NOT v_has_custom THEN RAISE EXCEPTION 'Your current plan includes one workspace. Upgrade to Custom to create another organization.'; END IF;
  END IF;
  INSERT INTO public.profiles (id, email, full_name)
  SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email) FROM auth.users WHERE id = v_user_id ON CONFLICT (id) DO NOTHING;
  v_slug := COALESCE(NULLIF(p_slug, ''), LOWER(REGEXP_REPLACE(p_org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(v_user_id::text FROM 1 FOR 6));
  INSERT INTO public.organizations (name, slug, created_by) VALUES (p_org_name, v_slug, v_user_id) RETURNING id INTO v_org_id;
  INSERT INTO public.organization_members (organization_id, user_id, role, status) VALUES (v_org_id, v_user_id, 'Owner', 'Active');
  RETURN (SELECT jsonb_build_object('id', id, 'name', name, 'slug', slug, 'created_by', created_by, 'created_at', created_at) FROM public.organizations WHERE id = v_org_id);
END;
$$;
