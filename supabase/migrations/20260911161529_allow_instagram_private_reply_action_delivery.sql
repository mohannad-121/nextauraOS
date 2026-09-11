ALTER TABLE public.automation_action_deliveries
  DROP CONSTRAINT IF EXISTS automation_action_deliveries_action_type_check;

ALTER TABLE public.automation_action_deliveries
  ADD CONSTRAINT automation_action_deliveries_action_type_check
  CHECK (action_type IN ('outgoing_webhook', 'gmail_send_email', 'facebook_comment_reply', 'instagram_private_reply'));

ALTER TABLE public.automation_action_deliveries
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_action_deliveries_idempotency
  ON public.automation_action_deliveries(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
