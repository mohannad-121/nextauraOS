-- ====================================================================
-- NEXTAURA SCHEMA VALIDATION SCRIPT
-- File: supabase/validate_nextaura_schema.sql
-- ====================================================================

DO $$
DECLARE
    v_missing_tables TEXT[] := ARRAY[]::TEXT[];
    v_table TEXT;
    v_expected_tables TEXT[] := ARRAY[
        'profiles', 'organizations', 'organization_members', 'services', 
        'organization_services', 'login_verification_challenges', 'platform_admins', 
        'audit_logs', 'departments', 'employees', 'employee_private_details', 
        'attendance_records', 'time_off_requests', 'appraisals', 'vehicles', 
        'vehicle_maintenance', 'payroll_runs', 'job_openings', 'candidates', 
        'contacts', 'invoices', 'expenses', 'journal_entries', 'email_campaigns', 
        'sms_campaigns', 'surveys', 'social_posts', 'calendar_events'
    ];
    v_services_count INT;
    v_legacy_count INT;
    v_rls_disabled_count INT;
    v_rpc_anon_perm INT;
    v_rec RECORD;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'STARTING NEXTAURA SCHEMA VALIDATION';
    RAISE NOTICE '==================================================';

    -- 1. Check all required tables exist
    FOREACH v_table IN ARRAY v_expected_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            v_missing_tables := array_append(v_missing_tables, v_table);
        END IF;
    END LOOP;

    IF array_length(v_missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAIL: Missing tables: %', array_to_string(v_missing_tables, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All 28 NextAura public tables exist.';
    END IF;

    -- 2. Verify Legacy Tables DO NOT Exist
    SELECT COUNT(*) INTO v_legacy_count
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name IN ('service_requests', 'service_request_items');

    IF v_legacy_count > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAIL: Legacy service request approval tables still exist in public schema.';
    ELSE
        RAISE NOTICE 'SUCCESS: Legacy service request approval tables are absent.';
    END IF;

    -- 3. Verify Services Catalog is Populated (20 items)
    SELECT COUNT(*) INTO v_services_count FROM public.services WHERE is_active = true;
    IF v_services_count < 20 THEN
        RAISE EXCEPTION 'VALIDATION FAIL: Services catalog incomplete. Found % rows, expected at least 20.', v_services_count;
    ELSE
        RAISE NOTICE 'SUCCESS: Services catalog correctly populated with % active services.', v_services_count;
    END IF;

    -- 4. Verify RLS Enabled on All Application Tables
    SELECT COUNT(*) INTO v_rls_disabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = ANY(v_expected_tables)
    AND rowsecurity = false;

    IF v_rls_disabled_count > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAIL: % tables have RLS disabled.', v_rls_disabled_count;
    ELSE
        RAISE NOTICE 'SUCCESS: Row Level Security (RLS) is enabled on all 28 tables.';
    END IF;

    -- 5. Verify OTP Table direct client execution is denied
    IF EXISTS (
        SELECT 1 FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
        AND table_name = 'login_verification_challenges'
        AND grantee IN ('anon', 'authenticated')
        AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    ) THEN
        RAISE EXCEPTION 'VALIDATION FAIL: Direct client table grants found on login_verification_challenges!';
    ELSE
        RAISE NOTICE 'SUCCESS: login_verification_challenges has ZERO direct client privileges.';
    END IF;

    -- 6. Verify RPC Privileged Execution Revoked from authenticated
    SELECT COUNT(*) INTO v_rpc_anon_perm
    FROM information_schema.routine_privileges
    WHERE specific_schema = 'public'
    AND routine_name = 'complete_initial_service_selection'
    AND grantee IN ('PUBLIC', 'anon', 'authenticated')
    AND privilege_type = 'EXECUTE';

    IF v_rpc_anon_perm > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAIL: EXECUTE on complete_initial_service_selection is granted to PUBLIC/anon/authenticated!';
    ELSE
        RAISE NOTICE 'SUCCESS: complete_initial_service_selection EXECUTE is restricted to service_role.';
    END IF;

    -- 7. Check Canonical Functions Exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_user_workspace') THEN
        RAISE EXCEPTION 'VALIDATION FAIL: Function create_user_workspace missing.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'protect_profile_security_fields') THEN
        RAISE EXCEPTION 'VALIDATION FAIL: Trigger function protect_profile_security_fields missing.';
    END IF;

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'ALL VALIDATION CHECKS PASSED SUCCESSFULLY!';
    RAISE NOTICE '==================================================';
END $$;
