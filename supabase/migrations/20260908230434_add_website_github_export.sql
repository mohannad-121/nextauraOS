ALTER TABLE public.plan_capabilities
  ADD COLUMN website_github_export BOOLEAN NOT NULL DEFAULT false;

UPDATE public.plan_capabilities
SET website_github_export = plan IN ('standard', 'custom');

ALTER TABLE public.integration_connections
  DROP CONSTRAINT integration_connections_provider_check,
  ADD CONSTRAINT integration_connections_provider_check
    CHECK (provider IN ('google','github','slack','meta','generic_api'));

ALTER TABLE public.integration_oauth_states
  DROP CONSTRAINT integration_oauth_states_provider_check,
  ADD CONSTRAINT integration_oauth_states_provider_check
    CHECK (provider IN ('google','github'));
