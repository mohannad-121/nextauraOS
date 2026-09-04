-- ====================================================================
-- NEXTAURA ONBOARDING ATOMICITY & FAIL-CLOSED SECURITY MIGRATION
-- ====================================================================

-- 1. ATOMIC SERVICE SELECTION RPC FUNCTION (BLOCKER 1)
-- Atomically activates organization services AND completes profile onboarding flags.
-- Automatically rolls back EVERYTHING if any step fails.
CREATE OR REPLACE FUNCTION public.complete_initial_service_selection(
    p_organization_id UUID,
    p_service_keys TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_is_member BOOLEAN;
    v_invalid_count INT;
    v_key TEXT;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User authentication required';
    END IF;

    -- Step 1: Validate active organization membership
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_organization_id
        AND user_id = v_user_id
        AND status = 'Active'
    ) INTO v_is_member;

    IF NOT v_is_member THEN
        RAISE EXCEPTION 'Unauthorized: User is not an active member of the specified organization';
    END IF;

    -- Step 2: Validate service keys array
    IF p_service_keys IS NULL OR array_length(p_service_keys, 1) IS NULL OR array_length(p_service_keys, 1) = 0 THEN
        RAISE EXCEPTION 'At least one service key must be selected';
    END IF;

    -- Step 3: Validate every service key exists in public.services catalog
    SELECT COUNT(*) INTO v_invalid_count
    FROM UNNEST(p_service_keys) AS k
    WHERE k NOT IN (SELECT key FROM public.services WHERE is_active = true);

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'One or more selected service keys are invalid or inactive';
    END IF;

    -- Step 4: Upsert active entitlements into organization_services
    FOREACH v_key IN ARRAY p_service_keys LOOP
        INSERT INTO public.organization_services (organization_id, service_key, status, activated_at)
        VALUES (p_organization_id, v_key, 'active', NOW())
        ON CONFLICT (organization_id, service_key) 
        DO UPDATE SET status = 'active', activated_at = NOW();
    END LOOP;

    -- Step 5: Atomically update profile flags (Does NOT modify email_verified)
    UPDATE public.profiles
    SET initial_service_selection_completed = true,
        onboarding_completed = true,
        updated_at = NOW()
    WHERE id = v_user_id;

    SELECT jsonb_build_object(
        'success', true,
        'organization_id', p_organization_id,
        'activated_keys', p_service_keys
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Atomic service selection failed: %', SQLERRM;
END;
$$;

-- 2. REMOVE DIRECT CLIENT MUTATIONS ON ORGANIZATION_SERVICES (SERVICE ACTIVATION RLS)
ALTER TABLE public.organization_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can insert org services" ON public.organization_services;
DROP POLICY IF EXISTS "Members can view org services" ON public.organization_services;
DROP POLICY IF EXISTS "No direct client mutation on organization_services" ON public.organization_services;

-- Allow SELECT for active organization members
CREATE POLICY "Members can view org services" 
ON public.organization_services
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = public.organization_services.organization_id
        AND om.user_id = auth.uid()
    )
);

-- Explicitly DENY raw client INSERT, UPDATE, DELETE (Mutations must use RPC / Edge Function)
CREATE POLICY "No direct client mutation on organization_services" 
ON public.organization_services
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "No direct client update on organization_services" 
ON public.organization_services
FOR UPDATE 
USING (false);

CREATE POLICY "No direct client delete on organization_services" 
ON public.organization_services
FOR DELETE 
USING (false);
