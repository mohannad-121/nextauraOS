-- Preserve every Paddle subscription state while retaining the existing
-- one-row organization_subscriptions table as the canonical billing projection.
-- This avoids breaking legacy billing consumers that intentionally read one row
-- per billing root.
ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS provider_event_occurred_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.paddle_subscription_states (
  provider_subscription_id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_customer_id TEXT,
  provider_item_id TEXT,
  provider_price_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('one_app_free', 'standard', 'custom')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'unknown')),
  seat_count INTEGER NOT NULL CHECK (seat_count BETWEEN 1 AND 10000),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_billed_at TIMESTAMPTZ,
  scheduled_change JSONB,
  provider_event_occurred_at TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_paddle_subscription_states_one_current_per_org
  ON public.paddle_subscription_states(organization_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_paddle_subscription_states_org_event
  ON public.paddle_subscription_states(organization_id, provider_event_occurred_at DESC);

-- Preserve the already-canonical Paddle projection as the initial current
-- record. Other historical subscriptions are intentionally added only by their
-- verified Paddle events; the migration never invents or deletes provider data.
INSERT INTO public.paddle_subscription_states (
  provider_subscription_id, organization_id, provider_customer_id, provider_item_id, provider_price_id,
  plan, billing_cycle, status, seat_count, current_period_start, current_period_end,
  next_billed_at, scheduled_change, provider_event_occurred_at, is_current
)
SELECT
  provider_subscription_id, organization_id, provider_customer_id, provider_item_id, provider_price_id,
  plan, billing_cycle, status, seat_count, current_period_start, current_period_end,
  next_billed_at, scheduled_change, COALESCE(provider_event_occurred_at, updated_at, created_at), true
FROM public.organization_subscriptions
WHERE billing_provider = 'paddle' AND provider_subscription_id IS NOT NULL
ON CONFLICT (provider_subscription_id) DO NOTHING;

ALTER TABLE public.paddle_subscription_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paddle_subscription_states FROM anon, authenticated;

-- Service-role-only atomic state application. The advisory lock serializes
-- different Paddle subscription events for a single billing root; the stored
-- provider event timestamp rejects stale re-deliveries for the same subscription.
CREATE OR REPLACE FUNCTION public.apply_paddle_subscription_event(
  p_organization_id UUID,
  p_provider_subscription_id TEXT,
  p_provider_customer_id TEXT,
  p_provider_item_id TEXT,
  p_provider_price_id TEXT,
  p_plan TEXT,
  p_billing_cycle TEXT,
  p_status TEXT,
  p_seat_count INTEGER,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_next_billed_at TIMESTAMPTZ,
  p_scheduled_change JSONB,
  p_provider_event_occurred_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.paddle_subscription_states%ROWTYPE;
  v_current public.paddle_subscription_states%ROWTYPE;
  v_selected public.paddle_subscription_states%ROWTYPE;
  v_existing_found BOOLEAN := false;
  v_applied BOOLEAN := false;
BEGIN
  IF p_organization_id IS NULL OR p_provider_subscription_id IS NULL OR p_provider_event_occurred_at IS NULL THEN
    RAISE EXCEPTION 'Paddle subscription event identity and occurred_at are required';
  END IF;
  IF p_plan NOT IN ('one_app_free', 'standard', 'custom') OR p_status NOT IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'unknown') THEN
    RAISE EXCEPTION 'Unsupported Paddle subscription state';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));
  SELECT * INTO v_existing FROM public.paddle_subscription_states WHERE provider_subscription_id = p_provider_subscription_id FOR UPDATE;
  v_existing_found := FOUND;
  SELECT * INTO v_current FROM public.paddle_subscription_states WHERE organization_id = p_organization_id AND is_current FOR UPDATE;

  IF v_existing_found AND v_existing.provider_event_occurred_at > p_provider_event_occurred_at THEN
    v_selected := v_current;
  ELSE
    INSERT INTO public.paddle_subscription_states (
      provider_subscription_id, organization_id, provider_customer_id, provider_item_id, provider_price_id,
      plan, billing_cycle, status, seat_count, current_period_start, current_period_end,
      next_billed_at, scheduled_change, provider_event_occurred_at, is_current
    ) VALUES (
      p_provider_subscription_id, p_organization_id, p_provider_customer_id, p_provider_item_id, p_provider_price_id,
      p_plan, p_billing_cycle, p_status, p_seat_count, p_current_period_start, p_current_period_end,
      p_next_billed_at, p_scheduled_change, p_provider_event_occurred_at, false
    ) ON CONFLICT (provider_subscription_id) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      provider_customer_id = EXCLUDED.provider_customer_id,
      provider_item_id = EXCLUDED.provider_item_id,
      provider_price_id = EXCLUDED.provider_price_id,
      plan = EXCLUDED.plan,
      billing_cycle = EXCLUDED.billing_cycle,
      status = EXCLUDED.status,
      seat_count = EXCLUDED.seat_count,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      next_billed_at = EXCLUDED.next_billed_at,
      scheduled_change = EXCLUDED.scheduled_change,
      provider_event_occurred_at = EXCLUDED.provider_event_occurred_at,
      updated_at = NOW();

    SELECT * INTO v_existing FROM public.paddle_subscription_states WHERE provider_subscription_id = p_provider_subscription_id;
    IF v_current.provider_subscription_id IS NULL
      OR v_current.provider_subscription_id = p_provider_subscription_id
      OR p_provider_event_occurred_at >= v_current.provider_event_occurred_at THEN
      UPDATE public.paddle_subscription_states SET is_current = false WHERE organization_id = p_organization_id AND is_current;
      UPDATE public.paddle_subscription_states SET is_current = true WHERE provider_subscription_id = p_provider_subscription_id;
      v_selected := v_existing;
    ELSE
      v_selected := v_current;
    END IF;
    v_applied := true;
  END IF;

  -- A state table without a current pointer can occur only during a historical
  -- backfill. Prefer the highest active entitlement, then latest provider event.
  IF v_selected.provider_subscription_id IS NULL THEN
    SELECT * INTO v_selected
    FROM public.paddle_subscription_states
    WHERE organization_id = p_organization_id
    ORDER BY
      CASE WHEN status IN ('active', 'trialing', 'past_due') THEN 1 ELSE 0 END DESC,
      CASE plan WHEN 'custom' THEN 3 WHEN 'standard' THEN 2 ELSE 1 END DESC,
      provider_event_occurred_at DESC,
      provider_subscription_id ASC
    LIMIT 1;
    UPDATE public.paddle_subscription_states SET is_current = (provider_subscription_id = v_selected.provider_subscription_id)
    WHERE organization_id = p_organization_id;
  END IF;

  INSERT INTO public.organization_subscriptions (
    organization_id, plan, billing_cycle, status, seat_count, billing_provider,
    provider_customer_id, provider_subscription_id, provider_item_id, provider_price_id,
    current_period_start, current_period_end, next_billed_at, scheduled_change, provider_event_occurred_at
  ) VALUES (
    p_organization_id, v_selected.plan, v_selected.billing_cycle, v_selected.status, v_selected.seat_count, 'paddle',
    v_selected.provider_customer_id, v_selected.provider_subscription_id, v_selected.provider_item_id, v_selected.provider_price_id,
    v_selected.current_period_start, v_selected.current_period_end, v_selected.next_billed_at, v_selected.scheduled_change, v_selected.provider_event_occurred_at
  ) ON CONFLICT (organization_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    billing_cycle = EXCLUDED.billing_cycle,
    status = EXCLUDED.status,
    seat_count = EXCLUDED.seat_count,
    billing_provider = EXCLUDED.billing_provider,
    provider_customer_id = EXCLUDED.provider_customer_id,
    provider_subscription_id = EXCLUDED.provider_subscription_id,
    provider_item_id = EXCLUDED.provider_item_id,
    provider_price_id = EXCLUDED.provider_price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    next_billed_at = EXCLUDED.next_billed_at,
    scheduled_change = EXCLUDED.scheduled_change,
    provider_event_occurred_at = EXCLUDED.provider_event_occurred_at;

  RETURN jsonb_build_object(
    'applied', v_applied,
    'plan', v_selected.plan,
    'status', v_selected.status,
    'provider_subscription_id', v_selected.provider_subscription_id,
    'provider_event_occurred_at', v_selected.provider_event_occurred_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_paddle_subscription_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_paddle_subscription_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_paddle_subscription_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TIMESTAMPTZ) TO service_role;
