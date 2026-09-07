ALTER TABLE public.automation_action_deliveries
  DROP CONSTRAINT IF EXISTS automation_action_deliveries_action_type_check;
ALTER TABLE public.automation_action_deliveries
  ADD CONSTRAINT automation_action_deliveries_action_type_check
  CHECK (action_type IN ('outgoing_webhook', 'gmail_send_email'));
