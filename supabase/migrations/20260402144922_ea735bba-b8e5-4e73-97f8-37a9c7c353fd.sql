
DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE(user_id uuid, email text, full_name text, avatar_url text, plan plan_type, transaction_fee_percent numeric, monthly_price numeric, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    u.id as user_id, u.email::text, p.full_name, p.avatar_url,
    COALESCE(up.plan, 'free'::plan_type) as plan,
    COALESCE(up.transaction_fee_percent, 2.5) as transaction_fee_percent,
    COALESCE(up.monthly_price, 0) as monthly_price,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_plans up ON up.user_id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY u.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(_target_user_id uuid, _new_plan plan_type)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.user_plans
  SET plan = _new_plan,
      transaction_fee_percent = CASE WHEN _new_plan='free' THEN 2.5 WHEN _new_plan='pro' THEN 2.0 WHEN _new_plan='enterprise' THEN 1.5 END,
      monthly_price = CASE WHEN _new_plan='free' THEN 0 WHEN _new_plan='pro' THEN 147 WHEN _new_plan='enterprise' THEN 497 END,
      updated_at = now()
  WHERE user_id = _target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, transaction_fee_percent, monthly_price)
  VALUES (NEW.id, 'free', 2.5, 0);
  RETURN NEW;
END;
$$;
