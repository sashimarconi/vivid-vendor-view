CREATE OR REPLACE FUNCTION public.admin_user_details(_target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  plan plan_type,
  transaction_fee_percent numeric,
  monthly_price numeric,
  user_created_at timestamp with time zone,
  total_products bigint,
  total_orders bigint,
  total_paid_orders bigint,
  total_revenue numeric,
  total_pending_revenue numeric,
  total_stores bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    u.id as user_id,
    u.email::text,
    p.full_name,
    p.avatar_url,
    COALESCE(up.plan, 'free'::plan_type) as plan,
    COALESCE(up.transaction_fee_percent, 2.5) as transaction_fee_percent,
    COALESCE(up.monthly_price, 0) as monthly_price,
    u.created_at as user_created_at,
    (SELECT COUNT(*) FROM public.products WHERE user_id = u.id) as total_products,
    (SELECT COUNT(*) FROM public.orders WHERE user_id = u.id) as total_orders,
    (SELECT COUNT(*) FROM public.orders WHERE user_id = u.id AND payment_status = 'paid') as total_paid_orders,
    (SELECT COALESCE(SUM(total),0) FROM public.orders WHERE user_id = u.id AND payment_status = 'paid') as total_revenue,
    (SELECT COALESCE(SUM(total),0) FROM public.orders WHERE user_id = u.id AND payment_status = 'pending') as total_pending_revenue,
    (SELECT COUNT(*) FROM public.stores WHERE user_id = u.id) as total_stores
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_plans up ON up.user_id = u.id
  WHERE u.id = _target_user_id
    AND public.has_role(auth.uid(), 'admin')
$function$;

CREATE OR REPLACE FUNCTION public.admin_user_products(_target_user_id uuid)
RETURNS TABLE(
  product_id uuid,
  title text,
  slug text,
  sale_price numeric,
  original_price numeric,
  active boolean,
  created_at timestamp with time zone,
  thumbnail_url text,
  total_orders bigint,
  total_paid_orders bigint,
  total_revenue numeric,
  total_pending_revenue numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id as product_id,
    p.title,
    p.slug,
    p.sale_price,
    p.original_price,
    p.active,
    p.created_at,
    (SELECT url FROM public.product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as thumbnail_url,
    (SELECT COUNT(*) FROM public.orders WHERE product_id = p.id) as total_orders,
    (SELECT COUNT(*) FROM public.orders WHERE product_id = p.id AND payment_status = 'paid') as total_paid_orders,
    (SELECT COALESCE(SUM(total),0) FROM public.orders WHERE product_id = p.id AND payment_status = 'paid') as total_revenue,
    (SELECT COALESCE(SUM(total),0) FROM public.orders WHERE product_id = p.id AND payment_status = 'pending') as total_pending_revenue
  FROM public.products p
  WHERE p.user_id = _target_user_id
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
$function$;