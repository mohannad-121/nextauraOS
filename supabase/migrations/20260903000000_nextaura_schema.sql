-- ====================================================================
-- NEXTAURA BUSINESS OPERATING SYSTEM — MASTER DATABASE SCHEMA & RLS
-- ====================================================================

-- 1. CORE MULTI-TENANT ARCHITECTURE
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    legal_name TEXT,
    tax_id TEXT,
    logo_url TEXT,
    base_currency TEXT NOT NULL DEFAULT 'USD',
    country TEXT DEFAULT 'United States',
    timezone TEXT DEFAULT 'America/Los_Angeles',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    locale TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'America/Los_Angeles',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Employee',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 2. HUMAN RESOURCES TABLES
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
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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

-- 3. RECRUITMENT ATS TABLES
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

-- 4. FINANCE TABLES
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    type TEXT NOT NULL DEFAULT 'Customer', -- Customer, Vendor, Employee, Partner
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
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Sent, Paid, Overdue
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
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected, Reimbursed
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
    source_module TEXT NOT NULL DEFAULT 'Manual', -- Manual, Payroll, Fleet, Invoicing
    total_debit NUMERIC(12,2) NOT NULL,
    total_credit NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Posted',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT double_entry_balance_check CHECK (total_debit = total_credit)
);

-- 5. MARKETING TABLES
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

-- 6. GLOBAL PLATFORM TABLES
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

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address TEXT DEFAULT '127.0.0.1',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — MULTI-TENANT ISOLATION
-- ====================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic Tenant Access Helper Function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic Org Member Policy Macro
CREATE POLICY "Tenant Read/Write Isolation" ON public.employees FOR ALL USING (is_org_member(organization_id));
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
CREATE POLICY "Tenant Read/Write Isolation" ON public.audit_logs FOR ALL USING (is_org_member(organization_id));

-- INDEXES FOR HIGH-PERFORMANCE MULTI-TENANT QUERIES
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_org ON public.candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_journals_org ON public.journal_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_org ON public.calendar_events(organization_id);
