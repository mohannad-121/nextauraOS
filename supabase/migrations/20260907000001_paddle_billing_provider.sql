-- Provider-neutral billing projection. Legacy Stripe fields remain temporarily for rollback only.
ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS billing_provider TEXT CHECK (billing_provider IN ('internal', 'paddle', 'stripe')),
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_item_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
  ADD COLUMN IF NOT EXISTS next_billed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_change JSONB;

UPDATE public.organization_subscriptions
SET billing_provider = CASE WHEN plan = 'one_app_free' THEN 'internal' ELSE 'stripe' END,
    provider_customer_id = COALESCE(provider_customer_id, stripe_customer_id),
    provider_subscription_id = COALESCE(provider_subscription_id, stripe_subscription_id),
    provider_item_id = COALESCE(provider_item_id, stripe_subscription_item_id),
    provider_price_id = COALESCE(provider_price_id, stripe_price_id),
    next_billed_at = COALESCE(next_billed_at, current_period_end),
    scheduled_change = COALESCE(scheduled_change, CASE WHEN cancel_at_period_end THEN jsonb_build_object('action', 'cancel', 'effective_at', current_period_end) ELSE NULL END)
WHERE billing_provider IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_subscriptions_provider_subscription
  ON public.organization_subscriptions(provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_provider_customer
  ON public.organization_subscriptions(billing_provider, provider_customer_id);

CREATE TABLE IF NOT EXISTS public.paddle_checkout_requests (
  checkout_token UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('standard', 'custom')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  seat_count INTEGER NOT NULL CHECK (seat_count BETWEEN 1 AND 10000),
  price_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.paddle_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paddle_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paddle_checkout_requests_expires_at ON public.paddle_checkout_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_paddle_webhook_events_org ON public.paddle_webhook_events(organization_id);

ALTER TABLE public.paddle_checkout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paddle_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view Paddle billing webhook audit" ON public.paddle_webhook_events
  FOR SELECT USING (is_org_member(organization_id));
REVOKE ALL ON public.paddle_checkout_requests FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.paddle_webhook_events FROM anon, authenticated;
GRANT SELECT ON public.paddle_webhook_events TO authenticated;
