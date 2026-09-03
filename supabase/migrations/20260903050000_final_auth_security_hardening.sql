-- ====================================================================
-- NEXTAURA FINAL AUTH & SECURITY HARDENING MIGRATION
-- ====================================================================

-- 1. SECURE PARAMETERLESS WORKSPACE RPC (ITEM 6)
-- Derives user identity exclusively from auth.uid(). Never trusts browser input.
CREATE OR REPLACE FUNCTION public.create_user_workspace(
    p_org_name TEXT,
    p_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_slug TEXT;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User authentication required';
    END IF;

    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, full_name)
    SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
    FROM auth.users
    WHERE id = v_user_id
    ON CONFLICT (id) DO NOTHING;

    -- Generate unique slug
    IF p_slug IS NULL OR p_slug = '' THEN
        v_slug := LOWER(REGEXP_REPLACE(p_org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(v_user_id::text FROM 1 FOR 6);
    ELSE
        v_slug := p_slug;
    END IF;

    -- Step 1: Insert organization
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (p_org_name, v_slug, v_user_id)
    RETURNING id INTO v_org_id;

    -- Step 2: Insert owner member
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_user_id, 'Owner', 'Active');

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
    RAISE EXCEPTION 'Workspace creation failed: %', SQLERRM;
END;
$$;

-- 2. REMOVE DIRECT CLIENT INSERT ON ORGANIZATION_MEMBERS (ITEM 7)
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own membership" ON public.organization_members;
DROP POLICY IF EXISTS "No direct client insert on organization_members" ON public.organization_members;

CREATE POLICY "No direct client insert on organization_members"
ON public.organization_members
FOR INSERT
WITH CHECK (false);

-- 3. REMOVE DIRECT CLIENT INSERT ON ORGANIZATIONS (ITEM 8)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create orgs" ON public.organizations;
DROP POLICY IF EXISTS "No direct client insert on organizations" ON public.organizations;

CREATE POLICY "No direct client insert on organizations"
ON public.organizations
FOR INSERT
WITH CHECK (false);

-- 4. PROFILE SECURITY FIELDS TRIGGER PROTECTION (ITEM 9)
-- Prevents regular client updates from modifying security/workflow flags.
CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only service_role (Edge Functions / RPCs) can modify security flags
    IF (current_setting('role', true) <> 'service_role') THEN
        IF (OLD.email_verified IS DISTINCT FROM NEW.email_verified OR
            OLD.initial_service_selection_completed IS DISTINCT FROM NEW.initial_service_selection_completed OR
            OLD.onboarding_completed IS DISTINCT FROM NEW.onboarding_completed) THEN
            RAISE EXCEPTION 'Unauthorized: Security profile flags can only be updated by trusted Edge Functions.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_security_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_security_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();

-- 5. RE-ENFORCE DENY ALL RLS ON VERIFICATION CHALLENGES (ITEM 2)
ALTER TABLE public.login_verification_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own verification challenges" ON public.login_verification_challenges;
DROP POLICY IF EXISTS "Deny direct client access to verification challenges" ON public.login_verification_challenges;

CREATE POLICY "Deny direct client access to verification challenges"
ON public.login_verification_challenges
FOR ALL
USING (false);
