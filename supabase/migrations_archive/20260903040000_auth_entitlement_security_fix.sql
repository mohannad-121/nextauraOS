-- ====================================================================
-- NEXTAURA SECURITY & CORRECTNESS FIX MIGRATION
-- ====================================================================

-- 1. Ensure all expected columns exist on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initial_service_selection_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- 2. Platform Admins Table (Strict access, no fail-open)
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins viewable by authenticated user" ON public.platform_admins;
CREATE POLICY "Platform admins viewable by authenticated user" ON public.platform_admins
    FOR SELECT USING (user_id = auth.uid());

-- 3. Atomic Workspace Creation RPC Function (CRITICAL 11)
CREATE OR REPLACE FUNCTION public.create_user_workspace(
    p_user_id UUID,
    p_org_name TEXT,
    p_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_slug TEXT;
    v_result JSONB;
BEGIN
    -- Ensure user profile exists
    INSERT INTO public.profiles (id, email, full_name)
    SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
    FROM auth.users
    WHERE id = p_user_id
    ON CONFLICT (id) DO NOTHING;

    -- Generate unique slug
    IF p_slug IS NULL OR p_slug = '' THEN
        v_slug := LOWER(REGEXP_REPLACE(p_org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(p_user_id::text FROM 1 FOR 6);
    ELSE
        v_slug := p_slug;
    END IF;

    -- Transaction step 1: Create organization
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (p_org_name, v_slug, p_user_id)
    RETURNING id INTO v_org_id;

    -- Transaction step 2: Create owner membership
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, p_user_id, 'Owner', 'Active');

    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'created_by', created_by,
        'created_at', created_at
    ) INTO v_result
    FROM public.organizations
    WHERE id = v_org_id;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Atomic workspace creation failed: %', SQLERRM;
END;
$$;

-- 4. REMOVE CLIENT ACCESS TO OTP TABLE (CRITICAL 2)
ALTER TABLE public.login_verification_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own verification challenges" ON public.login_verification_challenges;
DROP POLICY IF EXISTS "Deny direct client access to verification challenges" ON public.login_verification_challenges;

-- Explicitly DENY all direct anon & authenticated client access
CREATE POLICY "Deny direct client access to verification challenges" 
ON public.login_verification_challenges 
FOR ALL 
USING (false);

-- Grant privileges exclusively to service_role (Edge Functions)
REVOKE ALL ON public.login_verification_challenges FROM anon, authenticated;
GRANT ALL ON public.login_verification_challenges TO service_role;

-- 5. SERVICES CATALOG SECURITY (CRITICAL 14)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read services catalog" ON public.services;
DROP POLICY IF EXISTS "Only service_role can modify services catalog" ON public.services;
DROP POLICY IF EXISTS "Users can read services" ON public.services;

CREATE POLICY "Anyone can read services catalog" 
ON public.services 
FOR SELECT 
USING (true);

CREATE POLICY "Only service_role can modify services catalog" 
ON public.services 
FOR ALL 
USING (auth.role() = 'service_role');
