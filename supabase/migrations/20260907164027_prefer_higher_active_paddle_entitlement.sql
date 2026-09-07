-- Keep the first atomic resolver as the event-ordering layer, then add the
-- defensive entitlement layer: separate simultaneously-active subscriptions
-- resolve to the highest plan. A normal plan change updates the same provider
-- subscription record, so its newer event remains authoritative.
ALTER FUNCTION public.apply_paddle_subscription_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TIMESTAMPTZ)
  RENAME TO apply_paddle_subscription_event_base;

CREATE FUNCTION public.apply_paddle_subscription_event(
  p_organization_id UUID, p_provider_subscription_id TEXT, p_provider_customer_id TEXT,
  p_provider_item_id TEXT, p_provider_price_id TEXT, p_plan TEXT, p_billing_cycle TEXT,
  p_status TEXT, p_seat_count INTEGER, p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ, p_next_billed_at TIMESTAMPTZ,
  p_scheduled_change JSONB, p_provider_event_occurred_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base JSONB;
  v_selected public.paddle_subscription_states%ROWTYPE;
BEGIN
  v_base := public.apply_paddle_subscription_event_base(
    p_organization_id, p_provider_subscription_id, p_provider_customer_id, p_provider_item_id,
    p_provider_price_id, p_plan, p_billing_cycle, p_status, p_seat_count,
    p_current_period_start, p_current_period_end, p_next_billed_at,
    p_scheduled_change, p_provider_event_occurred_at
  );

  SELECT * INTO v_selected
  FROM public.paddle_subscription_states
  WHERE organization_id = p_organization_id
  ORDER BY
    CASE WHEN status IN ('active', 'trialing', 'past_due') THEN 1 ELSE 0 END DESC,
    CASE plan WHEN 'custom' THEN 3 WHEN 'standard' THEN 2 ELSE 1 END DESC,
    provider_event_occurred_at DESC,
    provider_subscription_id ASC
  LIMIT 1;

  UPDATE public.paddle_subscription_states
  SET is_current = false
  WHERE organization_id = p_organization_id AND is_current AND provider_subscription_id <> v_selected.provider_subscription_id;
  UPDATE public.paddle_subscription_states
  SET is_current = true
  WHERE provider_subscription_id = v_selected.provider_subscription_id AND NOT is_current;

  UPDATE public.organization_subscriptions SET
    plan = v_selected.plan,
    billing_cycle = v_selected.billing_cycle,
    status = v_selected.status,
    seat_count = v_selected.seat_count,
    billing_provider = 'paddle',
    provider_customer_id = v_selected.provider_customer_id,
    provider_subscription_id = v_selected.provider_subscription_id,
    provider_item_id = v_selected.provider_item_id,
    provider_price_id = v_selected.provider_price_id,
    current_period_start = v_selected.current_period_start,
    current_period_end = v_selected.current_period_end,
    next_billed_at = v_selected.next_billed_at,
    scheduled_change = v_selected.scheduled_change,
    provider_event_occurred_at = v_selected.provider_event_occurred_at
  WHERE organization_id = p_organization_id;

  RETURN jsonb_build_object(
    'applied', COALESCE((v_base->>'applied')::BOOLEAN, false),
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
