-- Custom-plan external API keys. Raw secrets are never stored in this database.
CREATE TABLE public.organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  key_prefix TEXT NOT NULL CHECK (key_prefix ~ '^nxa_(live|test)_[A-Za-z0-9_-]{8}$'),
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL CHECK (
    cardinality(scopes) > 0
    AND scopes <@ ARRAY[
      'employees:read', 'contacts:read', 'invoices:read', 'expenses:read',
      'payroll:read', 'documents:read', 'approvals:read'
    ]::TEXT[]
  ),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  CONSTRAINT api_key_revocation_state CHECK (
    (status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE INDEX organization_api_keys_active_lookup_idx
  ON public.organization_api_keys (key_hash)
  WHERE status = 'active' AND revoked_at IS NULL;
CREATE INDEX organization_api_keys_organization_created_idx
  ON public.organization_api_keys (organization_id, created_at DESC);

-- Fixed-window, database-atomic per-key rate limit state. Not exposed to clients.
CREATE TABLE public.organization_api_key_rate_limits (
  api_key_id UUID NOT NULL REFERENCES public.organization_api_keys(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (api_key_id, window_started_at)
);

ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_api_key_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view API key metadata"
  ON public.organization_api_keys FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members member
    WHERE member.organization_id = organization_api_keys.organization_id
      AND member.user_id = auth.uid()
      AND member.status = 'Active'
      AND member.role IN ('Owner', 'Administrator')
  ));

-- The client can only read an explicit safe projection; hashes stay server-only.
CREATE VIEW public.organization_api_key_metadata
WITH (security_invoker = true) AS
SELECT id, organization_id, name, key_prefix, scopes, created_by, created_at, last_used_at, revoked_at, status
FROM public.organization_api_keys;

REVOKE ALL ON public.organization_api_keys FROM anon, authenticated;
REVOKE ALL ON public.organization_api_key_rate_limits FROM anon, authenticated;
GRANT SELECT (id, organization_id, name, key_prefix, scopes, created_by, created_at, last_used_at, revoked_at, status)
  ON public.organization_api_keys TO authenticated;
GRANT SELECT ON public.organization_api_key_metadata TO authenticated;

-- Service-role Edge Functions call this to atomically enforce 120 requests/key/minute.
CREATE OR REPLACE FUNCTION public.consume_organization_api_key_rate_limit(p_api_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket TIMESTAMPTZ := date_trunc('minute', now());
  consumed INTEGER;
BEGIN
  INSERT INTO public.organization_api_key_rate_limits (api_key_id, window_started_at, request_count)
  VALUES (p_api_key_id, bucket, 1)
  ON CONFLICT (api_key_id, window_started_at) DO UPDATE
    SET request_count = organization_api_key_rate_limits.request_count + 1
    WHERE organization_api_key_rate_limits.request_count < 120
  RETURNING request_count INTO consumed;

  RETURN consumed IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_organization_api_key_rate_limit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_organization_api_key_rate_limit(UUID) TO service_role;
