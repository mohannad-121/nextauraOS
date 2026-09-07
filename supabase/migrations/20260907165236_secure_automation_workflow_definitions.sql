CREATE TABLE public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT NULL CHECK (description IS NULL OR char_length(description) <= 1000),
  enabled BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'employee.created', 'contact.created', 'expense.status_changed', 'incoming_webhook', 'schedule'
  )),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(trigger_config) = 'object'),
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(conditions) = 'array'),
  actions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(actions) = 'array'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_enabled_at TIMESTAMPTZ NULL,
  disabled_at TIMESTAMPTZ NULL,
  CONSTRAINT automation_workflows_payload_size_check CHECK (
    octet_length(trigger_config::text) <= 4096
    AND octet_length(conditions::text) <= 12288
    AND octet_length(actions::text) <= 16384
  )
);

CREATE INDEX idx_automation_workflows_organization_updated
  ON public.automation_workflows(organization_id, updated_at DESC);
CREATE INDEX idx_automation_workflows_organization_enabled
  ON public.automation_workflows(organization_id, enabled) WHERE enabled;

CREATE TRIGGER trg_automation_workflows_updated_at
  BEFORE UPDATE ON public.automation_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can read automation workflows"
  ON public.automation_workflows
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

REVOKE ALL ON public.automation_workflows FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.automation_workflows FROM authenticated;
GRANT SELECT ON public.automation_workflows TO authenticated;
