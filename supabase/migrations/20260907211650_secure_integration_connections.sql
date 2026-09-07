CREATE TABLE public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google','slack','meta','generic_api')),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked','error')),
  auth_type TEXT NOT NULL CHECK (auth_type IN ('api_key','oauth')),
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(scopes) = 'array'),
  account_label TEXT NULL CHECK (account_label IS NULL OR char_length(account_label) <= 255),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NULL,
  last_verified_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.integration_connection_credentials (
  connection_id UUID PRIMARY KEY REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL CHECK (char_length(ciphertext) BETWEEN 1 AND 16384),
  iv TEXT NOT NULL CHECK (char_length(iv) BETWEEN 1 AND 128),
  algorithm TEXT NOT NULL DEFAULT 'AES-GCM-256',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX integration_connections_org_created_idx ON public.integration_connections(organization_id, created_at DESC);
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connection_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_connections, public.integration_connection_credentials FROM PUBLIC, anon, authenticated;

CREATE POLICY integration_connections_member_metadata ON public.integration_connections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = integration_connections.organization_id AND m.user_id = (select auth.uid()) AND m.status = 'Active'));

GRANT SELECT ON public.integration_connections TO authenticated;
