ALTER TABLE public.automation_action_deliveries
  ADD COLUMN provider_error_code TEXT NULL CHECK (char_length(provider_error_code) <= 128),
  ADD COLUMN provider_error_reason TEXT NULL CHECK (char_length(provider_error_reason) <= 256);
