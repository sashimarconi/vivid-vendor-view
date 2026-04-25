-- Add column to track blocked users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;

-- Make user_id unique on profiles for upsert
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Function: Update user full_name (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  _target_user_id UUID,
  _full_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN 
    RAISE EXCEPTION 'Not authorized'; 
  END IF;
  
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (_target_user_id, _full_name)
  ON CONFLICT (user_id) 
  DO UPDATE SET full_name = EXCLUDED.full_name;
END;
$$;

-- Function: Toggle block status (admin only)
CREATE OR REPLACE FUNCTION public.admin_toggle_user_block(
  _target_user_id UUID,
  _blocked BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN 
    RAISE EXCEPTION 'Not authorized'; 
  END IF;
  
  INSERT INTO public.profiles (user_id, blocked)
  VALUES (_target_user_id, _blocked)
  ON CONFLICT (user_id)
  DO UPDATE SET blocked = EXCLUDED.blocked;
  
  IF _blocked THEN
    UPDATE auth.users 
    SET banned_until = 'infinity'::timestamptz
    WHERE id = _target_user_id;
  ELSE
    UPDATE auth.users 
    SET banned_until = NULL
    WHERE id = _target_user_id;
  END IF;
END;
$$;

-- Function: Delete user completely (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  _target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN 
    RAISE EXCEPTION 'Not authorized'; 
  END IF;
  
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;
  
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  DELETE FROM public.user_plans WHERE user_id = _target_user_id;
  DELETE FROM public.products WHERE user_id = _target_user_id;
  DELETE FROM public.stores WHERE user_id = _target_user_id;
  DELETE FROM public.orders WHERE user_id = _target_user_id;
  DELETE FROM public.checkout_settings WHERE user_id = _target_user_id;
  DELETE FROM public.gateway_settings WHERE user_id = _target_user_id;
  DELETE FROM public.webhooks WHERE user_id = _target_user_id;
  DELETE FROM public.tracking_pixels WHERE user_id = _target_user_id;
  DELETE FROM public.utmify_settings WHERE user_id = _target_user_id;
  DELETE FROM public.notification_settings WHERE user_id = _target_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = _target_user_id;
  DELETE FROM public.custom_domains WHERE user_id = _target_user_id;
  DELETE FROM public.abandoned_carts WHERE user_id = _target_user_id;
  DELETE FROM public.page_events WHERE user_id = _target_user_id;
  DELETE FROM public.visitor_sessions WHERE user_id = _target_user_id;
  DELETE FROM public.store_settings WHERE user_id = _target_user_id;
  DELETE FROM public.trust_badges WHERE user_id = _target_user_id;
  DELETE FROM public.reviews WHERE user_id = _target_user_id;
  DELETE FROM public.order_bumps WHERE user_id = _target_user_id;
  DELETE FROM public.shipping_options WHERE user_id = _target_user_id;
  DELETE FROM public.checkout_builder_config WHERE user_id = _target_user_id;
  DELETE FROM public.product_page_builder_config WHERE user_id = _target_user_id;
  DELETE FROM public.profiles WHERE user_id = _target_user_id;
  
  DELETE FROM auth.users WHERE id = _target_user_id;
END;
$$;

-- Drop and recreate admin_list_users with blocked column
DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  user_id uuid, 
  email text, 
  full_name text, 
  avatar_url text, 
  plan plan_type, 
  transaction_fee_percent numeric, 
  monthly_price numeric, 
  created_at timestamp with time zone,
  blocked boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    u.id as user_id, u.email::text, p.full_name, p.avatar_url,
    COALESCE(up.plan, 'free'::plan_type) as plan,
    COALESCE(up.transaction_fee_percent, 2.5) as transaction_fee_percent,
    COALESCE(up.monthly_price, 0) as monthly_price,
    u.created_at,
    COALESCE(p.blocked, false) as blocked
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_plans up ON up.user_id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY u.created_at DESC
$function$;