-- ====================================================================
-- NEXTAURA CLEAN MULTI-TENANT & AUTHENTICATION ARCHITECTURE
-- ====================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    initial_service_selection_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initial_service_selection_completed BOOLEAN DEFAULT false;

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    legal_name TEXT,
    tax_id TEXT,
    logo_url TEXT,
    base_currency TEXT NOT NULL DEFAULT 'USD',
    country TEXT DEFAULT 'United States',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORGANIZATION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Owner',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 4. SERVICES CATALOG TABLE
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

-- Populate Master Catalog
INSERT INTO public.services (key, name, category, description, icon_name, display_order)
VALUES
('invoicing', 'Invoicing & Payments', 'finance', 'Create multi-currency invoices, manage billing, and track customer receivables.', 'CreditCard', 1),
('accounting', 'Accounting & General Ledger', 'finance', 'Double-entry general ledger, chart of accounts, bank reconciliation, and financial reports.', 'CreditCard', 2),
('expenses', 'Expenses & Corporate Cards', 'finance', 'Employee expense reporting, approval workflows, and receipt matching.', 'CreditCard', 3),
('sign', 'NextAura Sign (E-Signature)', 'finance', 'Legally binding e-signatures, document preparation, and audit trail logging.', 'FileSignature', 4),
('equity', 'Equity & Cap Table', 'finance', 'Cap table tracking, share issuance, ESOP option grants management, and dilution simulator.', 'PieChart', 5),
('esg', 'ESG & Carbon Accounting', 'finance', 'Corporate sustainability tracking, Scope 1-3 carbon calculator, and ESG scorecard.', 'Leaf', 6),
('employees', 'Employee Directory & Org Chart', 'hr', 'Centralized employee profiles, compensation history, and organizational chart.', 'Users', 7),
('attendance', 'Attendance & Kiosk Tracking', 'hr', 'Real-time time clock, break tracking, kiosk mode, and overtime calculations.', 'Clock', 8),
('recruitment', 'Recruitment & ATS Pipeline', 'hr', 'Applicant tracking system (ATS), Kanban hiring pipeline, and candidate onboarding.', 'UserPlus', 9),
('time_off', 'Time Off & Leave Management', 'hr', 'Vacation request approvals, leave balance tracking, and team holiday calendar.', 'Calendar', 10),
('appraisals', 'Appraisals & Goals (OKRs)', 'hr', 'Performance review cycles, 360-degree reviews, goal tracking, and OKR scorecards.', 'Award', 11),
('fleet', 'Fleet & Asset Management', 'hr', 'Company vehicle assignments, mileage log, maintenance scheduling, and vendor tracking.', 'Car', 12),
('payroll', 'Payroll Processing & GL Sync', 'hr', 'Monthly payroll runs, gross-to-net tax calculations, payslips, and GL posting.', 'Wallet', 13),
('email_marketing', 'Email Marketing & Campaigns', 'marketing', 'Rich HTML email builder, audience segmentation, campaign scheduling, and analytics.', 'Mail', 14),
('sms_marketing', 'SMS Marketing & Broadcasts', 'marketing', 'Direct mobile SMS messaging campaigns, short-code delivery, and response metrics.', 'MessageSquare', 15),
('surveys', 'Surveys & CSAT Feedback', 'marketing', 'Interactive feedback surveys, Net Promoter Score (NPS) tracking, and analytics.', 'ClipboardList', 16),
('social_marketing', 'Social Marketing & Scheduling', 'marketing', 'Multi-platform social media post scheduler (LinkedIn, Twitter, Facebook) and analytics.', 'Share2', 17),
('contacts', 'Contacts Directory', 'global', 'Unified customer, vendor, partner, and lead directory.', 'Contact', 18),
('documents', 'Document Vault', 'global', 'Secure enterprise file storage, document categorization, and vault search.', 'FileText', 19),
('analytics', 'Analytics Center', 'global', 'Cross-module executive business intelligence and growth metrics.', 'BarChart3', 20)
ON CONFLICT (key) DO UPDATE SET 
name = EXCLUDED.name,
description = EXCLUDED.description,
category = EXCLUDED.category;

-- 5. ORGANIZATION SERVICES TABLE (ACTIVE ENTITLEMENTS)
CREATE TABLE IF NOT EXISTS public.organization_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, service_key)
);

-- 6. LOGIN VERIFICATION CHALLENGES TABLE (6-DIGIT OTP)
CREATE TABLE IF NOT EXISTS public.login_verification_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES FOR SECURE ACCESS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_verification_challenges ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view & update their own profile
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles
    FOR ALL USING (id = auth.uid());

-- Organizations: Members can view their orgs
DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
CREATE POLICY "Members can view their orgs" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.organizations.id
            AND om.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create orgs" ON public.organizations;
CREATE POLICY "Users can create orgs" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Organization Members: Members can view members of their orgs
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
CREATE POLICY "Members can view org members" ON public.organization_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.organization_members.organization_id
            AND om.user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can insert own membership" ON public.organization_members;
CREATE POLICY "Users can insert own membership" ON public.organization_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Organization Services: Members can view active services
DROP POLICY IF EXISTS "Members can view org services" ON public.organization_services;
CREATE POLICY "Members can view org services" ON public.organization_services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.organization_services.organization_id
            AND om.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can insert org services" ON public.organization_services;
CREATE POLICY "Members can insert org services" ON public.organization_services
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = public.organization_services.organization_id
            AND om.user_id = auth.uid()
        )
    );

-- Verification Challenges: User can view & manage own challenges
DROP POLICY IF EXISTS "Users can manage own verification challenges" ON public.login_verification_challenges;
CREATE POLICY "Users can manage own verification challenges" ON public.login_verification_challenges
    FOR ALL USING (user_id = auth.uid());
