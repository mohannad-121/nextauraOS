CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_organization_id UUID;
  v_read_at TIMESTAMPTZ;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT organization_id INTO v_organization_id
  FROM public.notifications
  WHERE id = p_notification_id;
  IF NOT FOUND OR NOT public.is_org_member(v_organization_id) THEN
    RAISE EXCEPTION 'Notification access denied.';
  END IF;

  UPDATE public.notifications
  SET read_at = COALESCE(read_at, NOW())
  WHERE id = p_notification_id
  RETURNING read_at INTO v_read_at;

  RETURN v_read_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Notification access denied.';
  END IF;

  UPDATE public.notifications
  SET read_at = NOW()
  WHERE organization_id = p_organization_id
    AND read_at IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(UUID) TO authenticated;
