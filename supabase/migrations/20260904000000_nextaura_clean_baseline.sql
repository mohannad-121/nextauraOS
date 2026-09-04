-- ====================================================================
-- NEXTAURA BUSINESS OPERATING SYSTEM — CLEAN BASELINE ARCHITECTURE
-- Migration: 20260904000000_nextaura_clean_baseline.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. IDENTITY & CORE MULTI-TENANT TABLES
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    locale TEXT DEFAULT 'en',
    email_verified BOOLEAN DEFAULT false,
    initial_service_selection_completed BOOLEAN DEFAULT false,
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    legal_name TEXT,
    tax_id TEXT,
    logo_url TEXT,
    base_currency TEXT DEFAULT 'USD',
    country TEXT DEFAULT 'United States',
    timezone TEXT DEFAULT 'America/Los_Angeles',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Owner',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- --------------------------------------------------------------------
-- 2. SERVICE CATALOG & ENTITLEMENTS
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'CreditCard',
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate Service Catalog from authoritative appRegistry
INSERT INTO public.services (key, name, category, description, icon_name, display_order)
VALUES
('invoicing', 'Invoicing & Payments', 'finance', 'Create multi-currency invoices, manage billing, track customer receivables, and automate payment reminders.', 'CreditCard', 1),
('accounting', 'Accounting & General Ledger', 'finance', 'Double-entry general ledger, chart of accounts, automated journal entries, bank reconciliation, and financial reports.', 'CreditCard', 2),
('expenses', 'Expenses & Corporate Cards', 'finance', 'Employee expense reporting, multi-level approval workflows, card management, and receipt OCR matching.', 'CreditCard', 3),
('sign', 'NextAura Sign (E-Signature)', 'finance', 'Legally binding e-signatures, document preparation, audit trail logging, and customer agreement workflows.', 'FileSignature', 4),
('equity', 'Equity & Cap Table', 'finance', 'Cap table tracking, share issuance, ESOP option grants management, and interactive funding dilution simulator.', 'PieChart', 5),
('esg', 'ESG & Carbon Accounting', 'finance', 'Corporate sustainability tracking, Scope 1-3 carbon calculator, ESG scorecard, and regulatory compliance reports.', 'Leaf', 6),
('employees', 'Employee Directory & Org Chart', 'hr', 'Centralized employee profiles, compensation history, private compliance details, and interactive organizational chart.', 'Users', 7),
('attendance', 'Attendance & Kiosk Tracking', 'hr', 'Real-time time clock, break tracking, kiosk mode, overtime calculations, and daily workforce presence board.', 'Clock', 8),
('recruitment', 'Recruitment & ATS Pipeline', 'hr', 'Applicant tracking system (ATS), Kanban hiring pipeline, job openings publisher, and atomic candidate onboarding.', 'UserPlus', 9),
('time_off', 'Time Off & Leave Management', 'hr', 'Vacation request approvals, leave balance tracking, team holiday calendar, and automatic global calendar sync.', 'Calendar', 10),
('appraisals', 'Appraisals & Goals (OKRs)', 'hr', 'Performance review cycles, 360-degree self & manager reviews, goal tracking, and OKR alignment scorecards.', 'Award', 11),
('fleet', 'Fleet & Asset Management', 'hr', 'Company vehicle assignments, mileage log, maintenance scheduling, vendor tracking, and automated expense logging.', 'Car', 12),
('payroll', 'Payroll Processing & GL Sync', 'hr', 'Monthly payroll runs, gross-to-net tax calculations, automated payslip generation, and GL journal entry posting.', 'Wallet', 13),
('email_marketing', 'Email Marketing & Campaigns', 'marketing', 'Rich HTML email builder, audience segmentation, campaign scheduling, open/click rate tracking, and template vault.', 'Mail', 14),
('sms_marketing', 'SMS Marketing & Broadcasts', 'marketing', 'Direct mobile SMS messaging campaigns, short-code delivery, customer engagement, and analytics reporting.', 'MessageSquare', 15),
('surveys', 'Surveys & CSAT Feedback', 'marketing', 'Interactive feedback surveys, Net Promoter Score (NPS) tracking, customer satisfaction metrics, and response analytics.', 'ClipboardList', 16),
('social_marketing', 'Social Marketing & Scheduling', 'marketing', 'Multi-platform social media post scheduler (LinkedIn, Twitter, Facebook), account connection, and engagement metrics.', 'Share2', 17),
('contacts', 'Contacts & CRM Directory', 'global', 'Unified customer, vendor, partner, and lead directory with activity timelines and account balances.', 'Contact', 18),
('documents', 'Document Vault & Vault Search', 'global', 'Secure enterprise file storage, document categorization, version control, and instant search.', 'FileText', 19),
('analytics', 'Analytics Center', 'global', 'Cross-module executive business intelligence, revenue analytics, workforce metrics, and growth forecasts.', 'BarChart3', 20)
ON CONFLICT (key) DO UPDATE SET 
name = EXCLUDED.name,
description = EXCLUDED.description,
category = EXCLUDED.category,
display_order = EXCLUDED.display_order;

CREATE TABLE IF NOT EXISTS public.organization_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service_key TEXT NOT NULL REFERENCES public.services(key) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, service_key)
);

-- --------------------------------------------------------------------
-- 3. SECURITY & CHALLENGES TABLES
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.login_verification_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_user_session ON public.login_verification_challenges(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON public.login_verification_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_verified ON public.login_verification_challenges(verified_at);

CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address TEXT DEFAULT '127.0.0.1',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. TENANT BUSINESS TABLES
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    head_name TEXT,
    employee_count INT DEFAULT 0,
    budget NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_number TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar TEXT,
    job_title TEXT NOT NULL,
    department TEXT NOT NULL,
    work_location TEXT NOT NULL DEFAULT 'HQ',
    start_date DATE NOT NULL,
    employment_type TEXT NOT NULL DEFAULT 'Full-time',
    status TEXT NOT NULL DEFAULT 'Active',
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    pay_frequency TEXT DEFAULT 'Monthly',
    manager_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_private_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    legal_name TEXT,
    personal_email TEXT,
    dob DATE,
    nationality TEXT,
    national_id TEXT,
    ssn TEXT,
    bank_account_number TEXT,
    bank_routing_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    employee_avatar TEXT,
    department TEXT,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    total_hours NUMERIC(4,2) DEFAULT 0,
    overtime_hours NUMERIC(4,2) DEFAULT 0,
    break_duration_mins INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Working',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    employee_avatar TEXT,
    department TEXT,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appraisals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    employee_avatar TEXT,
    job_title TEXT,
    department TEXT,
    cycle_name TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'Self Review',
    self_rating NUMERIC(3,1) DEFAULT 0,
    self_notes TEXT,
    manager_rating NUMERIC(3,1) DEFAULT 0,
    manager_notes TEXT,
    overall_rating NUMERIC(3,1) DEFAULT 0,
    goals_on_track_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'In Progress',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    vin TEXT UNIQUE,
    assigned_employee_name TEXT,
    odometer_km INT DEFAULT 0,
    monthly_cost NUMERIC(10,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Assigned',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_name TEXT NOT NULL,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    vendor TEXT NOT NULL,
    cost NUMERIC(10,2) NOT NULL,
    odometer_km INT DEFAULT 0,
    next_service_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    pay_date DATE NOT NULL,
    employee_count INT NOT NULL DEFAULT 0,
    total_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_net NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Full-time',
    applicants_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar TEXT,
    role_applied TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'Applied',
    score NUMERIC(3,1) DEFAULT 0,
    interview_date TIMESTAMPTZ,
    offer_salary NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    type TEXT NOT NULL DEFAULT 'Customer',
    roles TEXT[] DEFAULT '{}',
    balance NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID,
    employee_name TEXT NOT NULL,
    employee_avatar TEXT,
    title TEXT NOT NULL,
    merchant TEXT NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'Pending',
    payment_method TEXT DEFAULT 'Corporate Card',
    receipt_url TEXT,
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    entry_number TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    source_module TEXT NOT NULL DEFAULT 'Manual',
    total_debit NUMERIC(12,2) NOT NULL,
    total_credit NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Posted',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT double_entry_balance_check CHECK (total_debit = total_credit)
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    sender_name TEXT DEFAULT 'NextAura Team',
    sender_email TEXT DEFAULT 'marketing@nextaura.ai',
    status TEXT NOT NULL DEFAULT 'Scheduled',
    target_segment TEXT DEFAULT 'All Subscribers',
    recipient_count INT DEFAULT 0,
    delivery_rate NUMERIC(5,2) DEFAULT 99.5,
    open_rate NUMERIC(5,2) DEFAULT 0,
    click_rate NUMERIC(5,2) DEFAULT 0,
    unsubscribe_rate NUMERIC(5,2) DEFAULT 0,
    scheduled_for TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    target_audience TEXT DEFAULT 'VIP Clients',
    recipient_count INT DEFAULT 0,
    delivery_rate NUMERIC(5,2) DEFAULT 98.9,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'CSAT',
    status TEXT NOT NULL DEFAULT 'Active',
    questions_count INT DEFAULT 4,
    responses_count INT DEFAULT 0,
    completion_rate NUMERIC(5,2) DEFAULT 0,
    avg_score NUMERIC(3,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    platforms TEXT[] NOT NULL DEFAULT '{LinkedIn}',
    status TEXT NOT NULL DEFAULT 'Scheduled',
    scheduled_for TIMESTAMPTZ,
    engagement_rate NUMERIC(5,2) DEFAULT 0,
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT DEFAULT '09:00',
    type TEXT NOT NULL DEFAULT 'General',
    module TEXT NOT NULL DEFAULT 'Global',
    color TEXT DEFAULT '#06b6d4',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for multi-tenant isolation performance
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_org ON public.candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_journals_org ON public.journal_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_org ON public.calendar_events(organization_id);

-- --------------------------------------------------------------------
-- 5. HELPER FUNCTIONS & CANONICAL RPCS
-- --------------------------------------------------------------------

-- Tenant Access Helper Function
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = target_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Platform Admin Helper Function
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins pa
        WHERE pa.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CANONICAL WORKSPACE CREATION RPC
-- Derives user identity exclusively from auth.uid(). Never trusts browser parameter for user_id.
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

    -- Step 1: Create organization
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (p_org_name, v_slug, v_user_id)
    RETURNING id INTO v_org_id;

    -- Step 2: Create owner membership
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

-- CANONICAL PRIVILEGED SERVICE SELECTION RPC
-- Executed strictly by service_role via backend Edge Function complete-service-selection.
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

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Specified user does not exist';
    END IF;

    -- Validate active organization membership for p_user_id
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_organization_id
        AND user_id = p_user_id
        AND status = 'Active'
    ) INTO v_is_member;

    IF NOT v_is_member THEN
        RAISE EXCEPTION 'Unauthorized: Specified user is not an active member of the organization';
    END IF;

    -- Validate service keys array is non-empty
    IF p_service_keys IS NULL OR array_length(p_service_keys, 1) IS NULL OR array_length(p_service_keys, 1) = 0 THEN
        RAISE EXCEPTION 'At least one service key must be selected';
    END IF;

    -- Validate every service key exists in public.services catalog and is_active
    SELECT COUNT(*) INTO v_invalid_count
    FROM UNNEST(p_service_keys) AS k
    WHERE k NOT IN (SELECT key FROM public.services WHERE is_active = true);

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'One or more selected service keys are invalid or inactive';
    END IF;

    -- Upsert active entitlements into organization_services
    FOREACH v_key IN ARRAY p_service_keys LOOP
        INSERT INTO public.organization_services (organization_id, service_key, status, activated_at)
        VALUES (p_organization_id, v_key, 'active', NOW())
        ON CONFLICT (organization_id, service_key) 
        DO UPDATE SET status = 'active', activated_at = NOW();
    END LOOP;

    -- Update profile flags (Does NOT modify email_verified)
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

-- LOCK RPC EXECUTION PRIVILEGES (CRITICAL SECURITY LOCK)
REVOKE ALL ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.complete_initial_service_selection(UUID, UUID, TEXT[]) TO service_role;

-- PROFILE SECURITY FIELDS TRIGGER PROTECTION
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

-- --------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_verification_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view & update safe fields on own profile
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (id = auth.uid());

-- Organizations: Members can view their orgs. Direct client INSERT DENIED (Must use create_user_workspace RPC).
CREATE POLICY "Members can view their orgs" ON public.organizations FOR SELECT USING (is_org_member(id));
CREATE POLICY "No direct client insert on organizations" ON public.organizations FOR INSERT WITH CHECK (false);

-- Organization Members: Members can view org members. Direct client INSERT DENIED.
CREATE POLICY "Members can view org members" ON public.organization_members FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "No direct client insert on organization_members" ON public.organization_members FOR INSERT WITH CHECK (false);

-- Services Catalog: Anyone authenticated can read catalog. Modification restricted to service_role.
CREATE POLICY "Anyone can read services catalog" ON public.services FOR SELECT USING (true);
CREATE POLICY "Only service_role can modify services catalog" ON public.services FOR ALL USING (auth.role() = 'service_role');

-- Organization Services (Entitlements): Members can view active services. Direct client mutations DENIED.
CREATE POLICY "Members can view org services" ON public.organization_services FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "No direct client insert on organization_services" ON public.organization_services FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct client update on organization_services" ON public.organization_services FOR UPDATE USING (false);
CREATE POLICY "No direct client delete on organization_services" ON public.organization_services FOR DELETE USING (false);

-- OTP Challenges Table: DENY ALL DIRECT CLIENT ACCESS. Accessible only by service_role via Edge Functions.
CREATE POLICY "Deny direct client access to verification challenges" ON public.login_verification_challenges FOR ALL USING (false);
REVOKE ALL ON public.login_verification_challenges FROM anon, authenticated;
GRANT ALL ON public.login_verification_challenges TO service_role;

-- Platform Admins: Viewable by user if user is platform admin.
CREATE POLICY "Platform admins viewable by authenticated user" ON public.platform_admins FOR SELECT USING (user_id = auth.uid());

-- Business Tables: Strict Tenant Read/Write Isolation via is_org_member(organization_id)
CREATE POLICY "Tenant Read/Write Isolation" ON public.audit_logs FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.departments FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.employees FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.employee_private_details FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.attendance_records FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.time_off_requests FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.appraisals FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.vehicles FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.vehicle_maintenance FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.payroll_runs FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.job_openings FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.candidates FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.contacts FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.invoices FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.expenses FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.journal_entries FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.email_campaigns FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.sms_campaigns FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.surveys FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.social_posts FOR ALL USING (is_org_member(organization_id));
CREATE POLICY "Tenant Read/Write Isolation" ON public.calendar_events FOR ALL USING (is_org_member(organization_id));
