-- ====================================================================
-- NEXTAURA MULTI-TENANT WORKSPACE & RLS ISOLATION MIGRATION
-- ====================================================================

-- 1. Ensure unique constraint on organization_members
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_org_user_key'
    ) THEN
        ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_org_user_key UNIQUE (organization_id, user_id);
    END IF;
END $$;

-- 2. Helper RPC function to fetch a user's authorized organizations securely
CREATE OR REPLACE FUNCTION public.get_user_organizations(p_user_id UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    user_role TEXT,
    member_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id AS organization_id,
        o.name AS organization_name,
        o.slug AS organization_slug,
        om.role AS user_role,
        om.status AS member_status
    FROM public.organizations o
    INNER JOIN public.organization_members om ON om.organization_id = o.id
    WHERE om.user_id = p_user_id AND om.status = 'Active';
END;
$$;

-- 3. RLS SECURITY POLICIES FOR TENANT ISOLATION

-- Organizations: User can view ONLY if they are an active member
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their own organizations" ON public.organizations;
CREATE POLICY "Members can view their own organizations" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.organizations.id
            AND om.user_id = auth.uid()
            AND om.status = 'Active'
        )
    );

DROP POLICY IF EXISTS "Users can create new organizations" ON public.organizations;
CREATE POLICY "Users can create new organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Organization Members: User can view members of their organizations
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
CREATE POLICY "Users can view members of their organizations" ON public.organization_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.status = 'Active'
        )
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can create membership when creating org" ON public.organization_members;
CREATE POLICY "Users can create membership when creating org" ON public.organization_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Employees: Scoped to Organization
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view employees in their organization" ON public.employees;
CREATE POLICY "Users can view employees in their organization" ON public.employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.employees.organization_id
            AND om.user_id = auth.uid()
            AND om.status = 'Active'
        )
    );

-- Invoices: Scoped to Organization
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoices in their organization" ON public.invoices;
CREATE POLICY "Users can view invoices in their organization" ON public.invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.invoices.organization_id
            AND om.user_id = auth.uid()
            AND om.status = 'Active'
        )
    );

-- Expenses: Scoped to Organization
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expenses in their organization" ON public.expenses;
CREATE POLICY "Users can view expenses in their organization" ON public.expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.expenses.organization_id
            AND om.user_id = auth.uid()
            AND om.status = 'Active'
        )
    );
