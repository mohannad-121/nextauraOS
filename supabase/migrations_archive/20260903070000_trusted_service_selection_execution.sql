-- ====================================================================
-- NEXTAURA TRUSTED SERVICE SELECTION EXECUTION MIGRATION
-- ====================================================================

-- Drop any previous signatures of complete_initial_service_selection
DROP FUNCTION IF EXISTS public.complete_initial_service_selection(UUID, TEXT[]);
DROP FUNCTION IF EXISTS public.complete_initial_service_selection(UUID, UUID, TEXT[]);

-- 1. REFACTORED TRUSTED SERVICE SELECTION RPC FUNCTION
-- Accepts p_user_id UUID, p_organization_id UUID, p_service_keys TEXT[]
-- Executed strictly by service_role via backend Edge Function.
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
    v_is_member BOOLEAN;
    v_invalid_count INT;
    v_key TEXT;
    v_result JSONB;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User ID is required';
    END IF;

    -- Validate p_user_id exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Specified user does not exist';
    END IF;

    -- Step 1: Validate active organization membership for p_user_id
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_organization_id
        AND user_id = p_user_id
        AND status = 'Active'
    ) INTO v_is_member;

    IF NOT v_is_member THEN
        RAISE EXCEPTION 'Unauthorized: Specified user is not an active member of the organization';
    END IF;

    -- Step 2: Validate service keys array is not empty
    IF p_service_keys IS NULL OR array_length(p_service_keys, 1) IS NULL OR array_length(p_service_keys, 1) = 0 THEN
        RAISE EXCEPTION 'At least one service key must be selected';
    END IF;

    -- Step 3: Validate every service key exists in public.services catalog and is_active
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

    -- Step 5: Atomically update profile flags (Does NOT touch email_verified)
    UPDATE public.profiles
    SET initial_service_selection_completed = true,
        onboarding_completed = true,
        updated_at = NOW()
    WHERE id = p_user_id;

    SELECT jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'organization_id', p_organization_id,
        'activated_keys', p_service_keys
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Atomic service selection failed: %', SQLERRM;
END;
$$;

-- 2. LOCK RPC EXECUTION PRIVILEGES (CRITICAL SECURITY LOCK)
-- Revoke execution from public, anon, and authenticated browser users.
-- Grant execution strictly to service_role (Edge Functions).
REVOKE ALL ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) TO service_role;
