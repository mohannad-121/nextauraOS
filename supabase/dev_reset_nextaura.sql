-- ====================================================================
-- NEXTAURA DEVELOPMENT-ONLY SCHEMA RESET SCRIPT
-- File: supabase/dev_reset_nextaura.sql
-- ====================================================================
-- WARNING: This is a DESTRUCTIVE script for development testing.
-- It resets ONLY custom NextAura public application objects.
-- DO NOT modify or drop Supabase system schemas (auth, storage, vault, extensions, realtime).
-- NEVER drop auth.users.
-- ====================================================================

-- 1. DROP TRIGGERS
DROP TRIGGER IF EXISTS trg_protect_profile_security_fields ON public.profiles;

-- 2. DROP FUNCTIONS & RPCS
DROP FUNCTION IF EXISTS public.protect_profile_security_fields();
DROP FUNCTION IF EXISTS public.complete_initial_service_selection(UUID, UUID, TEXT[]);
DROP FUNCTION IF EXISTS public.complete_initial_service_selection(UUID, TEXT[]);
DROP FUNCTION IF EXISTS public.create_user_workspace(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_user_workspace(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.is_org_member(UUID);
DROP FUNCTION IF EXISTS public.is_platform_admin();

-- 3. DROP LEGACY PROTOTYPE TABLES (IF PRESENT)
DROP TABLE IF EXISTS public.service_request_items CASCADE;
DROP TABLE IF EXISTS public.service_requests CASCADE;

-- 4. DROP TENANT BUSINESS TABLES
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.social_posts CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP TABLE IF EXISTS public.sms_campaigns CASCADE;
DROP TABLE IF EXISTS public.email_campaigns CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;
DROP TABLE IF EXISTS public.job_openings CASCADE;
DROP TABLE IF EXISTS public.payroll_runs CASCADE;
DROP TABLE IF EXISTS public.vehicle_maintenance CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.appraisals CASCADE;
DROP TABLE IF EXISTS public.time_off_requests CASCADE;
DROP TABLE IF EXISTS public.attendance_records CASCADE;
DROP TABLE IF EXISTS public.employee_private_details CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 5. DROP SECURITY & ENTITLEMENT TABLES
DROP TABLE IF EXISTS public.platform_admins CASCADE;
DROP TABLE IF EXISTS public.login_verification_challenges CASCADE;
DROP TABLE IF EXISTS public.organization_services CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;

-- 6. DROP CORE IDENTITY & TENANT TABLES
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Reset notice
DO $$
BEGIN
    RAISE NOTICE 'NextAura custom public schema has been cleanly reset. Supabase auth.users and system schemas remain untouched.';
END $$;
