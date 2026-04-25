
CREATE OR REPLACE FUNCTION public.admin_update_user_fee(_target_user_id uuid, _new_fee numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.user_plans
  SET transaction_fee_percent = _new_fee, updated_at = now()
  WHERE user_id = _target_user_id;
END;
$$;
