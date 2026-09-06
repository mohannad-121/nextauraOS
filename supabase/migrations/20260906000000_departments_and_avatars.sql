-- Migration: 20260906000000_departments_and_avatars.sql
-- Description: Ensure departments table schema, unique constraint, RLS, and employee-avatars storage bucket

-- 1. DEPARTMENTS TABLE EXTENSIONS
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    description TEXT,
    manager_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    manager_name TEXT,
    employee_count INT DEFAULT 0,
    budget NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already existed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='departments' AND column_name='description') THEN
        ALTER TABLE public.departments ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='departments' AND column_name='manager_employee_id') THEN
        ALTER TABLE public.departments ADD COLUMN manager_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='departments' AND column_name='manager_name') THEN
        ALTER TABLE public.departments ADD COLUMN manager_name TEXT;
    END IF;
END $$;

-- Unique constraint per organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'departments_org_id_name_key'
    ) THEN
        ALTER TABLE public.departments ADD CONSTRAINT departments_org_id_name_key UNIQUE (organization_id, name);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Tenant Read/Write Isolation" ON public.departments;
CREATE POLICY "Tenant Read/Write Isolation" ON public.departments FOR ALL 
USING (is_org_member(organization_id))
WITH CHECK (is_org_member(organization_id));

-- 2. EMPLOYEE AVATARS STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employee-avatars',
    'employee-avatars',
    false,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS Policies for employee-avatars
-- Select policy
DROP POLICY IF EXISTS "Org members can read employee avatars" ON storage.objects;
CREATE POLICY "Org members can read employee avatars"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    is_org_member((storage.foldername(name))[1]::uuid)
);

-- Insert policy (Owner/Admin upload)
DROP POLICY IF EXISTS "Org members can upload employee avatars" ON storage.objects;
CREATE POLICY "Org members can upload employee avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    is_org_member((storage.foldername(name))[1]::uuid)
);

-- Update policy
DROP POLICY IF EXISTS "Org members can update employee avatars" ON storage.objects;
CREATE POLICY "Org members can update employee avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    is_org_member((storage.foldername(name))[1]::uuid)
);

-- Delete policy
DROP POLICY IF EXISTS "Org members can delete employee avatars" ON storage.objects;
CREATE POLICY "Org members can delete employee avatars"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'employee-avatars' AND 
    auth.role() = 'authenticated' AND
    is_org_member((storage.foldername(name))[1]::uuid)
);
