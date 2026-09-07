CREATE TABLE public.integration_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash TEXT NOT NULL UNIQUE CHECK (char_length(state_hash) = 64),
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NULL REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  redirect_path TEXT NOT NULL DEFAULT '/automations?tab=connections' CHECK (redirect_path IN ('/automations?tab=connections')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX integration_oauth_states_expiry_idx ON public.integration_oauth_states(expires_at);
ALTER TABLE public.integration_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_oauth_states FROM PUBLIC, anon, authenticated;
