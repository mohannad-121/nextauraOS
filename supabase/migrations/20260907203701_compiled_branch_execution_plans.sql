ALTER TABLE public.automation_workflows
  ADD COLUMN execution_plan JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(execution_plan) = 'object' AND octet_length(execution_plan::text) <= 32768),
  ADD COLUMN execution_plan_version INTEGER NOT NULL DEFAULT 1 CHECK (execution_plan_version >= 1);
