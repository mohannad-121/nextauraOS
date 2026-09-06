-- Migration: 20260906000002_payroll_and_manager_relationship.sql
-- Description: Add manager_employee_id to employees, expand payroll_runs schema, and create tenant-isolated payslips table

-- 1. Add manager_employee_id to public.employees
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='manager_employee_id') THEN
        ALTER TABLE public.employees ADD COLUMN manager_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Extend public.payroll_runs table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payroll_runs' AND column_name='period_start') THEN
        ALTER TABLE public.payroll_runs ADD COLUMN period_start DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payroll_runs' AND column_name='period_end') THEN
        ALTER TABLE public.payroll_runs ADD COLUMN period_end DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payroll_runs' AND column_name='employer_costs_total') THEN
        ALTER TABLE public.payroll_runs ADD COLUMN employer_costs_total NUMERIC(12,2) DEFAULT 0;
    END IF;
END $$;

-- 3. Create public.payslips table
CREATE TABLE IF NOT EXISTS public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    department TEXT,
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    allowances_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    bonus_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
    insurance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
    other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payslips
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS policy
DROP POLICY IF EXISTS "Tenant Read/Write Isolation" ON public.payslips;
CREATE POLICY "Tenant Read/Write Isolation" ON public.payslips FOR ALL
USING (is_org_member(organization_id))
WITH CHECK (is_org_member(organization_id));
