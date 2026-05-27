
DROP FUNCTION IF EXISTS public.user_gateway_conversion_summary(integer);
DROP FUNCTION IF EXISTS public.user_gateway_conversion(integer);

CREATE OR REPLACE FUNCTION public.user_gateway_conversion_summary(_hours integer DEFAULT 168)
RETURNS TABLE(gateway_name text, pix_generated bigint, paid bigint, conversion_pct numeric, revenue numeric, avg_ticket numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT DISTINCT ON (g.order_id) g.gateway_name, g.order_id
    FROM public.gateway_health_logs g
    WHERE g.user_id = auth.uid()
      AND g.success = true
      AND g.order_id IS NOT NULL
      AND g.created_at >= now() - make_interval(hours => _hours)
    ORDER BY g.order_id, g.created_at ASC
  ),
  agg AS (
    SELECT b.gateway_name,
      COUNT(*)::bigint AS pix_generated,
      COUNT(*) FILTER (WHERE o.payment_status = 'paid')::bigint AS paid,
      COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS revenue
    FROM base b
    LEFT JOIN public.orders o ON o.id = b.order_id AND o.user_id = auth.uid()
    GROUP BY b.gateway_name
  )
  SELECT a.gateway_name, a.pix_generated, a.paid,
    ROUND(a.paid::numeric / NULLIF(a.pix_generated, 0) * 100, 1) AS conversion_pct,
    a.revenue,
    CASE WHEN a.paid > 0 THEN ROUND(a.revenue / a.paid, 2) ELSE 0 END AS avg_ticket
  FROM agg a
  ORDER BY conversion_pct DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.user_gateway_conversion(_hours integer DEFAULT 168)
RETURNS TABLE(gateway_name text, bucket timestamptz, unit text, pix_generated bigint, paid bigint, conversion_pct numeric, revenue numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT DISTINCT ON (g.order_id)
      g.gateway_name, g.order_id, g.created_at
    FROM public.gateway_health_logs g
    WHERE g.user_id = auth.uid()
      AND g.success = true
      AND g.order_id IS NOT NULL
      AND g.created_at >= now() - make_interval(hours => _hours)
    ORDER BY g.order_id, g.created_at ASC
  ),
  joined AS (
    SELECT b.gateway_name, b.created_at, o.payment_status, o.total
    FROM base b
    LEFT JOIN public.orders o ON o.id = b.order_id AND o.user_id = auth.uid()
  ),
  bucketed AS (
    SELECT gateway_name,
      CASE WHEN _hours <= 48 THEN date_trunc('hour', created_at) ELSE date_trunc('day', created_at) END AS bucket,
      CASE WHEN _hours <= 48 THEN 'hour' ELSE 'day' END AS unit,
      payment_status, total
    FROM joined
  )
  SELECT gateway_name, bucket, unit,
    COUNT(*)::bigint AS pix_generated,
    COUNT(*) FILTER (WHERE payment_status = 'paid')::bigint AS paid,
    ROUND(COUNT(*) FILTER (WHERE payment_status = 'paid')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS conversion_pct,
    COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS revenue
  FROM bucketed
  GROUP BY gateway_name, bucket, unit
  ORDER BY bucket DESC;
$$;
