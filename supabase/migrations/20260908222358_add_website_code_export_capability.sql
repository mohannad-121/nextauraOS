ALTER TABLE public.plan_capabilities
  ADD COLUMN website_code_export BOOLEAN NOT NULL DEFAULT false;

UPDATE public.plan_capabilities
SET website_code_export = plan IN ('standard', 'custom');
