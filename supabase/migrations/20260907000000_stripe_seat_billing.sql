-- NextAura production billing persistence. Stripe remains the source of truth for paid state;
-- this schema is a tenant-scoped projection written only by trusted Edge Functions.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS requested_seats INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_requested_seats_check CHECK (requested_seats BETWEEN 1 AND 10000);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seat_count_configured BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('one_app_free', 'standard', 'custom')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'unknown')),
  seat_count INTEGER NOT NULL DEFAULT 1 CHECK (seat_count BETWEEN 1 AND 10000),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_subscription_item_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_customer ON public.organization_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON public.organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_events_org ON public.stripe_webhook_events(organization_id);

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization subscription" ON public.organization_subscriptions
  FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY "Members can view billing webhook audit" ON public.stripe_webhook_events
  FOR SELECT USING (is_org_member(organization_id));

REVOKE INSERT, UPDATE, DELETE ON public.organization_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stripe_webhook_events FROM anon, authenticated;
GRANT SELECT ON public.organization_subscriptions, public.stripe_webhook_events TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_subscriptions_updated_at ON public.organization_subscriptions;
CREATE TRIGGER trg_org_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
