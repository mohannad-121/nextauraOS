CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  type TEXT NOT NULL DEFAULT 'automation' CHECK (type = 'automation'),
  source TEXT NOT NULL DEFAULT 'automation' CHECK (source = 'automation'),
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  automation_run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  automation_action_index INTEGER NOT NULL CHECK (automation_action_index >= 0),
  CONSTRAINT notifications_automation_action_unique UNIQUE (automation_run_id, automation_action_index)
);

CREATE INDEX idx_notifications_organization_created
  ON public.notifications(organization_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active organization members can read notifications"
  ON public.notifications
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_automation_notification_organization_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.automation_runs AS run
    WHERE run.id = NEW.automation_run_id
      AND run.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Notification organization must match its automation run.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notifications_organization_consistency
  BEFORE INSERT OR UPDATE OF organization_id, automation_run_id ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.assert_automation_notification_organization_consistency();

REVOKE EXECUTE ON FUNCTION public.assert_automation_notification_organization_consistency() FROM PUBLIC, anon, authenticated;
