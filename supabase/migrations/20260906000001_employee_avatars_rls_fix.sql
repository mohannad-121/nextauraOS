-- Migration: 20260906000001_employee_avatars_rls_fix.sql
-- Description: Enforce Owner/Admin server-side authorization for employee avatar uploads, updates, and deletes while allowing org member read access

-- 1. Helper function for Org Owner/Admin server-side role check
CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF target_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = target_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'Active'
        AND om.role IN ('Owner', 'Admin', 'Administrator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to validate path structure and perform org member check
CREATE OR REPLACE FUNCTION public.is_org_member_for_path(object_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    org_id_text TEXT;
BEGIN
    IF object_path IS NULL THEN
        RETURN FALSE;
    END IF;

    org_id_text := (storage.foldername(object_path))[1];

    IF org_id_text IS NULL OR NOT (org_id_text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN
        RETURN FALSE;
    END IF;

    RETURN public.is_org_member(org_id_text::uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to validate path structure and perform org admin check
CREATE OR REPLACE FUNCTION public.is_org_admin_for_path(object_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    org_id_text TEXT;
BEGIN
    IF object_path IS NULL THEN
        RETURN FALSE;
    END IF;

    org_id_text := (storage.foldername(object_path))[1];

    IF org_id_text IS NULL OR NOT (org_id_text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN
        RETURN FALSE;
    END IF;

    RETURN public.is_org_admin(org_id_text::uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop old employee-avatars storage policies
DROP POLICY IF EXISTS "Org members can read employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can upload employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update employee avatars" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete employee avatars" ON storage.objects;

-- 3. Create updated storage RLS policies
-- SELECT / READ: All active members of the tenant organization may read avatars
CREATE POLICY "Org members can read employee avatars"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    public.is_org_member_for_path(name)
);

-- INSERT / UPLOAD: Only Owner/Admin of the tenant organization may upload avatars to valid org UUID paths
CREATE POLICY "Org admins can upload employee avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    public.is_org_admin_for_path(name)
);

-- UPDATE / REPLACE: Only Owner/Admin may update avatars, enforced with both USING and WITH CHECK for path integrity
CREATE POLICY "Org admins can update employee avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    public.is_org_admin_for_path(name)
)
WITH CHECK (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    public.is_org_admin_for_path(name)
);

-- DELETE / REMOVE: Only Owner/Admin of the tenant organization may delete avatar objects
CREATE POLICY "Org admins can delete employee avatars"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    public.is_org_admin_for_path(name)
);
