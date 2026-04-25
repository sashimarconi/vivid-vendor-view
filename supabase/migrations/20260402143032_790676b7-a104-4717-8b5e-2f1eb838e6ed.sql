
-- Daily orders for last 30 days (admin only)
CREATE OR REPLACE FUNCTION public.admin_daily_orders(days integer DEFAULT 30)
RETURNS TABLE(day date, order_count bigint, revenue numeric, paid_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d::date as day,
    COUNT(o.id) as order_count,
    COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) as revenue,
    COUNT(CASE WHEN o.payment_status = 'paid' THEN 1 END) as paid_count
  FROM generate_series(
    (current_date - (days || ' days')::interval)::date,
    current_date,
    '1 day'
  ) d
  LEFT JOIN public.orders o ON o.created_at::date = d::date
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY d::date
  ORDER BY d::date
$$;

-- Daily signups for last 30 days (admin only)
CREATE OR REPLACE FUNCTION public.admin_daily_signups(days integer DEFAULT 30)
RETURNS TABLE(day date, signup_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d::date as day,
    COUNT(u.id) as signup_count
  FROM generate_series(
    (current_date - (days || ' days')::interval)::date,
    current_date,
    '1 day'
  ) d
  LEFT JOIN auth.users u ON u.created_at::date = d::date
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY d::date
  ORDER BY d::date
$$;

-- List all orders (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_orders(
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0,
  _status text DEFAULT NULL
)
RETURNS TABLE(
  order_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  product_title text,
  product_variant text,
  quantity integer,
  total numeric,
  payment_status text,
  payment_method text,
  pix_copied boolean,
  created_at timestamptz,
  owner_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id as order_id,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    p.title as product_title,
    o.product_variant,
    o.quantity,
    o.total,
    o.payment_status,
    o.payment_method,
    o.pix_copied,
    o.created_at,
    u.email::text as owner_email
  FROM public.orders o
  LEFT JOIN public.products p ON p.id = o.product_id
  LEFT JOIN auth.users u ON u.id = o.user_id
  WHERE public.has_role(auth.uid(), 'admin')
    AND (_status IS NULL OR o.payment_status = _status)
  ORDER BY o.created_at DESC
  LIMIT _limit OFFSET _offset
$$;

-- Aggregated analytics (admin only)
CREATE OR REPLACE FUNCTION public.admin_analytics_summary(days integer DEFAULT 30)
RETURNS TABLE(
  total_page_views bigint,
  total_sessions bigint,
  total_abandoned_carts bigint,
  total_orders_period bigint,
  total_revenue_period numeric,
  conversion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.page_events WHERE created_at >= current_date - (days || ' days')::interval) as total_page_views,
    (SELECT COUNT(DISTINCT session_id) FROM public.visitor_sessions WHERE created_at >= current_date - (days || ' days')::interval) as total_sessions,
    (SELECT COUNT(*) FROM public.abandoned_carts WHERE created_at >= current_date - (days || ' days')::interval) as total_abandoned_carts,
    (SELECT COUNT(*) FROM public.orders WHERE created_at >= current_date - (days || ' days')::interval) as total_orders_period,
    (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE payment_status = 'paid' AND created_at >= current_date - (days || ' days')::interval) as total_revenue_period,
    CASE
      WHEN (SELECT COUNT(DISTINCT session_id) FROM public.visitor_sessions WHERE created_at >= current_date - (days || ' days')::interval) > 0
      THEN ROUND(
        (SELECT COUNT(*)::numeric FROM public.orders WHERE created_at >= current_date - (days || ' days')::interval) /
        (SELECT COUNT(DISTINCT session_id)::numeric FROM public.visitor_sessions WHERE created_at >= current_date - (days || ' days')::interval) * 100,
        2
      )
      ELSE 0
    END as conversion_rate
  WHERE public.has_role(auth.uid(), 'admin')
$$;
