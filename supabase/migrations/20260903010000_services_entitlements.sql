-- ====================================================================
-- NEXTAURA SERVICES & ENTITLEMENT AUTHORIZATION SCHEMA
-- ====================================================================

-- Add Onboarding & Verification fields to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- 1. SERVICES MASTER CATALOG
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'CreditCard',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate Master Catalog
INSERT INTO public.services (key, name, category, description, icon_name)
VALUES
('invoicing', 'Invoicing & Payments', 'finance', 'Create multi-currency invoices, manage billing, track customer receivables, and automate payment reminders.', 'CreditCard'),
('accounting', 'Accounting & General Ledger', 'finance', 'Double-entry general ledger, chart of accounts, automated journal entries, bank reconciliation, and financial reports.', 'CreditCard'),
('expenses', 'Expenses & Corporate Cards', 'finance', 'Employee expense reporting, multi-level approval workflows, card management, and receipt OCR matching.', 'CreditCard'),
('sign', 'NextAura Sign (E-Signature)', 'finance', 'Legally binding e-signatures, document preparation, audit trail logging, and customer agreement workflows.', 'FileSignature'),
('equity', 'Equity & Cap Table', 'finance', 'Cap table tracking, share issuance, ESOP option grants management, and interactive funding dilution simulator.', 'PieChart'),
('esg', 'ESG & Carbon Accounting', 'finance', 'Corporate sustainability tracking, Scope 1-3 carbon calculator, ESG scorecard, and regulatory compliance reports.', 'Leaf'),
('employees', 'Employee Directory & Org Chart', 'hr', 'Centralized employee profiles, compensation history, private compliance details, and interactive organizational chart.', 'Users'),
('attendance', 'Attendance & Kiosk Tracking', 'hr', 'Real-time time clock, break tracking, kiosk mode, overtime calculations, and daily workforce presence board.', 'Clock'),
('recruitment', 'Recruitment & ATS Pipeline', 'hr', 'Applicant tracking system (ATS), Kanban hiring pipeline, job openings publisher, and atomic candidate onboarding.', 'UserPlus'),
('time_off', 'Time Off & Leave Management', 'hr', 'Vacation request approvals, leave balance tracking, team holiday calendar, and automatic global calendar sync.', 'Calendar'),
('appraisals', 'Appraisals & Goals (OKRs)', 'hr', 'Performance review cycles, 360-degree self & manager reviews, goal tracking, and OKR alignment scorecards.', 'Award'),
('fleet', 'Fleet & Asset Management', 'hr', 'Company vehicle assignments, mileage log, maintenance scheduling, vendor tracking, and automated expense logging.', 'Car'),
('payroll', 'Payroll Processing & GL Sync', 'hr', 'Monthly payroll runs, gross-to-net tax calculations, automated payslip generation, and GL journal entry posting.', 'Wallet'),
('email_marketing', 'Email Marketing & Campaigns', 'marketing', 'Rich HTML email builder, audience segmentation, campaign scheduling, open/click rate tracking, and template vault.', 'Mail'),
('sms_marketing', 'SMS Marketing & Broadcasts', 'marketing', 'Direct mobile SMS messaging campaigns, short-code delivery, customer engagement, and analytics reporting.', 'MessageSquare'),
('surveys', 'Surveys & CSAT Feedback', 'marketing', 'Interactive feedback surveys, Net Promoter Score (NPS) tracking, customer satisfaction metrics, and response analytics.', 'ClipboardList'),
('social_marketing', 'Social Marketing & Scheduling', 'marketing', 'Multi-platform social media post scheduler (LinkedIn, Twitter, Facebook), account connection, and engagement metrics.', 'Share2')
ON CONFLICT (key) DO UPDATE SET
name = EXCLUDED.name,
category = EXCLUDED.category,
description = EXCLUDED.description;

-- 2. ORGANIZATION SERVICES (ENTITLEMENTS)
CREATE TABLE IF NOT EXISTS public.organization_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service_key TEXT NOT NULL REFERENCES public.services(key) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended'
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_by UUID REFERENCES public.profiles(id),
    UNIQUE(organization_id, service_key)
);

-- 3. SERVICE REQUESTS
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'partially_approved', 'approved', 'rejected'
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id)
);

-- 4. SERVICE REQUEST ITEMS
CREATE TABLE IF NOT EXISTS public.service_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    service_key TEXT NOT NULL REFERENCES public.services(key) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    rejection_reason TEXT,
    UNIQUE(service_request_id, service_key)
);

-- 5. PLATFORM ADMINS
CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant Default Entitlements to Master Org NextAura Inc.
INSERT INTO public.organization_services (organization_id, service_key, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, key, 'active'
FROM public.services
ON CONFLICT (organization_id, service_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if User is NextAura Platform Admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins pa
        WHERE pa.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Public Services Read" ON public.services FOR SELECT USING (true);
CREATE POLICY "Org Services Read" ON public.organization_services FOR SELECT USING (is_org_member(organization_id) OR is_platform_admin());
CREATE POLICY "Platform Admin Manage Org Services" ON public.organization_services FOR ALL USING (is_platform_admin());

CREATE POLICY "Org Member Read Service Requests" ON public.service_requests FOR SELECT USING (is_org_member(organization_id) OR is_platform_admin());
CREATE POLICY "Org Member Insert Service Requests" ON public.service_requests FOR INSERT WITH CHECK (is_org_member(organization_id));
CREATE POLICY "Platform Admin Update Service Requests" ON public.service_requests FOR UPDATE USING (is_platform_admin());

CREATE POLICY "Org Member Read Service Request Items" ON public.service_request_items FOR SELECT USING (true);
CREATE POLICY "Org Member Insert Service Request Items" ON public.service_request_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Platform Admin Update Service Request Items" ON public.service_request_items FOR UPDATE USING (is_platform_admin());
