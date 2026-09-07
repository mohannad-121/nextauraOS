CREATE TABLE public.automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'employee.created',
    'contact.created',
    'expense.status_changed'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('employee', 'contact', 'expense')),
  entity_id UUID NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 8192
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dedupe_key TEXT NOT NULL CHECK (char_length(dedupe_key) BETWEEN 1 AND 512),
  causation_id UUID NULL,
  root_run_id UUID NULL,
  chain_depth INTEGER NOT NULL DEFAULT 0 CHECK (chain_depth >= 0),
  source TEXT NOT NULL DEFAULT 'database' CHECK (source = 'database'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT automation_events_dedupe_key_unique UNIQUE (dedupe_key)
);

CREATE INDEX idx_automation_events_organization_occurred
  ON public.automation_events(organization_id, occurred_at ASC);
CREATE INDEX idx_automation_events_type_occurred
  ON public.automation_events(event_type, occurred_at ASC);

ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.automation_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.emit_automation_employee_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.automation_events (
    organization_id, event_type, entity_type, entity_id, payload, dedupe_key
  ) VALUES (
    NEW.organization_id,
    'employee.created',
    'employee',
    NEW.id,
    jsonb_build_object(
      'id', NEW.id,
      'employee_number', NEW.employee_number,
      'name', NEW.name,
      'email', NEW.email,
      'job_title', NEW.job_title,
      'department', NEW.department,
      'employment_type', NEW.employment_type,
      'status', NEW.status
    ),
    format('employee.created:%s', NEW.id)
  ) ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_automation_contact_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.automation_events (
    organization_id, event_type, entity_type, entity_id, payload, dedupe_key
  ) VALUES (
    NEW.organization_id,
    'contact.created',
    'contact',
    NEW.id,
    jsonb_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'email', NEW.email,
      'phone', NEW.phone,
      'company_name', NEW.company_name,
      'type', NEW.type,
      'status', NEW.status
    ),
    format('contact.created:%s', NEW.id)
  ) ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_automation_expense_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.automation_events (
    organization_id, event_type, entity_type, entity_id, payload, dedupe_key
  ) VALUES (
    NEW.organization_id,
    'expense.status_changed',
    'expense',
    NEW.id,
    jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'category', NEW.category,
      'amount', NEW.amount,
      'currency', NEW.currency,
      'old_status', OLD.status,
      'new_status', NEW.status
    ),
    format('expense.status_changed:%s:%s:%s:%s', NEW.id, OLD.status, NEW.status, txid_current())
  ) ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_automation_employee_created ON public.employees;
CREATE TRIGGER trg_automation_employee_created
  AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.emit_automation_employee_created();

DROP TRIGGER IF EXISTS trg_automation_contact_created ON public.contacts;
CREATE TRIGGER trg_automation_contact_created
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.emit_automation_contact_created();

DROP TRIGGER IF EXISTS trg_automation_expense_status_changed ON public.expenses;
CREATE TRIGGER trg_automation_expense_status_changed
  AFTER UPDATE OF status ON public.expenses
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.emit_automation_expense_status_changed();

REVOKE EXECUTE ON FUNCTION public.emit_automation_employee_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.emit_automation_contact_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.emit_automation_expense_status_changed() FROM PUBLIC, anon, authenticated;
