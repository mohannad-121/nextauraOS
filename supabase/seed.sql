-- ====================================================================
-- NEXTAURA SEED DATA FOR DEMO & PRODUCTION INITIALIZATION
-- ====================================================================

-- Master Organization
INSERT INTO public.organizations (id, name, slug, legal_name, tax_id, base_currency, country, timezone)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'NextAura Inc.',
    'nextaura',
    'NextAura Technologies Inc.',
    'US-994827104',
    'USD',
    'United States',
    'America/Los_Angeles'
) ON CONFLICT (id) DO NOTHING;

-- Demo HR Employees
INSERT INTO public.employees (id, organization_id, employee_number, name, email, phone, avatar, job_title, department, start_date, base_salary, status)
VALUES
(
    'e1111111-1111-1111-1111-111111111111',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'EMP-001',
    'Mohannad Abuayyash',
    'mohannad@nextaura.ai',
    '+1 (415) 890-1234',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'Chief Executive Officer',
    'Executive Committee',
    '2024-01-15',
    18500.00,
    'Active'
),
(
    'e2222222-2222-2222-2222-222222222222',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'EMP-002',
    'Elena Rostova',
    'elena@nextaura.ai',
    '+1 (415) 890-5678',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'VP of Engineering',
    'Engineering',
    '2024-03-01',
    14200.00,
    'Active'
) ON CONFLICT (id) DO NOTHING;

-- Demo Vehicles
INSERT INTO public.vehicles (id, organization_id, name, make, model, year, license_plate, assigned_employee_name, odometer_km, monthly_cost, status)
VALUES
(
    'v1111111-1111-1111-1111-111111111111',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Executive Fleet Tesla Model Y',
    'Tesla',
    'Model Y Long Range',
    2025,
    'SF-440-EV',
    'Mohannad Abuayyash',
    28450,
    950.00,
    'Assigned'
) ON CONFLICT (id) DO NOTHING;
