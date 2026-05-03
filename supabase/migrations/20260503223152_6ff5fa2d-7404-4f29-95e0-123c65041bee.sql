CREATE OR REPLACE FUNCTION public.user_gateway_conversion(_days integer DEFAULT 7)
RETURNS TABLE(
  gateway_name text,
  day date,
  pix_generated bigint,
  paid bigint,
  conversion_pct numeric,
  revenue numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT DISTINCT ON (g.order_id)
      g.gateway_name,
      (g.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
      g.order_id
    FROM public.gateway_health_logs g
    WHERE g.user_id = auth.uid()
      AND g.success = true
      AND g.order_id IS NOT NULL
      AND g.created_at >= now() - make_interval(days => _days)
    ORDER BY g.order_id, g.created_at ASC
  )
  SELECT
    b.gateway_name,
    b.day,
    COUNT(*)::bigint AS pix_generated,
    COUNT(*) FILTER (WHERE o.payment_status = 'paid')::bigint AS paid,
    ROUND(COUNT(*) FILTER (WHERE o.payment_status = 'paid')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS conversion_pct,
    COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS revenue
  FROM base b
  LEFT JOIN public.orders o ON o.id = b.order_id AND o.user_id = auth.uid()
  GROUP BY b.gateway_name, b.day
  ORDER BY b.day DESC, b.gateway_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.user_gateway_conversion_summary(_days integer DEFAULT 7)
RETURNS TABLE(
  gateway_name text,
  pix_generated bigint,
  paid bigint,
  conversion_pct numeric,
  revenue numeric,
  avg_ticket numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT DISTINCT ON (g.order_id)
      g.gateway_name,
      g.order_id
    FROM public.gateway_health_logs g
    WHERE g.user_id = auth.uid()
      AND g.success = true
      AND g.order_id IS NOT NULL
      AND g.created_at >= now() - make_interval(days => _days)
    ORDER BY g.order_id, g.created_at ASC
  ),
  agg AS (
    SELECT
      b.gateway_name,
      COUNT(*)::bigint AS pix_generated,
      COUNT(*) FILTER (WHERE o.payment_status = 'paid')::bigint AS paid,
      COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS revenue
    FROM base b
    LEFT JOIN public.orders o ON o.id = b.order_id AND o.user_id = auth.uid()
    GROUP BY b.gateway_name
  )
  SELECT
    a.gateway_name,
    a.pix_generated,
    a.paid,
    ROUND(a.paid::numeric / NULLIF(a.pix_generated, 0) * 100, 1) AS conversion_pct,
    a.revenue,
    CASE WHEN a.paid > 0 THEN ROUND(a.revenue / a.paid, 2) ELSE 0 END AS avg_ticket
  FROM agg a
  ORDER BY conversion_pct DESC NULLS LAST;
$$;