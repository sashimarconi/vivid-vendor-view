-- Recreate user_financial_summary using America/Sao_Paulo timezone
CREATE OR REPLACE FUNCTION public.user_financial_summary(_start date, _end date)
 RETURNS TABLE(gross_revenue numeric, total_orders_paid bigint, gateway_fees_total numeric, product_costs_total numeric, expenses_total numeric, expenses_by_category jsonb, extra_revenue numeric, ads_total numeric, net_profit numeric, margin_pct numeric, avg_ticket numeric, roi numeric, cpa numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  PERFORM public.materialize_recurring_expenses(uid, _start, _end);

  RETURN QUERY
  WITH paid AS (
    SELECT o.id, o.product_id, o.quantity, o.total
    FROM public.orders o
    WHERE o.user_id = uid AND o.payment_status = 'paid'
      AND (o.paid_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _start AND _end
  ),
  rev AS (
    SELECT COALESCE(SUM(total), 0) AS gross, COUNT(*) AS qty FROM paid
  ),
  costs AS (
    SELECT COALESCE(SUM(p.quantity * COALESCE(pc.unit_cost, 0)), 0) AS total
    FROM paid p
    LEFT JOIN public.product_costs pc ON pc.product_id = p.product_id AND pc.user_id = uid
  ),
  fees AS (
    SELECT COALESCE(SUM(p.total * COALESCE(gs.fee_percent, 0) / 100), 0) AS total
    FROM paid p
    LEFT JOIN public.gateway_settings gs ON gs.user_id = uid AND gs.active = true
    WHERE gs.id = (SELECT id FROM public.gateway_settings WHERE user_id = uid AND active = true ORDER BY fallback_priority ASC LIMIT 1)
  ),
  exp_agg AS (
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE category <> 'extra_revenue'), 0) AS exp_total,
      COALESCE(SUM(amount) FILTER (WHERE category = 'extra_revenue'), 0) AS extra_rev,
      COALESCE(SUM(amount) FILTER (WHERE category IN ('marketing_facebook','marketing_tiktok','marketing_google')), 0) AS ads,
      COALESCE(jsonb_object_agg(category, total) FILTER (WHERE category IS NOT NULL), '{}'::jsonb) AS by_cat
    FROM (
      SELECT category, SUM(amount) AS total, SUM(amount) AS amount
      FROM public.expenses
      WHERE user_id = uid AND date BETWEEN _start AND _end
      GROUP BY category
    ) x
  )
  SELECT
    rev.gross,
    rev.qty,
    fees.total,
    costs.total,
    exp_agg.exp_total,
    exp_agg.by_cat,
    exp_agg.extra_rev,
    exp_agg.ads,
    (rev.gross + exp_agg.extra_rev - fees.total - costs.total - exp_agg.exp_total) AS net,
    CASE WHEN rev.gross > 0 THEN ROUND(((rev.gross + exp_agg.extra_rev - fees.total - costs.total - exp_agg.exp_total) / rev.gross) * 100, 2) ELSE 0 END,
    CASE WHEN rev.qty > 0 THEN ROUND(rev.gross / rev.qty, 2) ELSE 0 END,
    CASE WHEN exp_agg.ads > 0 THEN ROUND(((rev.gross + exp_agg.extra_rev - fees.total - costs.total - exp_agg.exp_total) / exp_agg.ads) * 100, 2) ELSE 0 END,
    CASE WHEN rev.qty > 0 THEN ROUND(exp_agg.ads / rev.qty, 2) ELSE 0 END
  FROM rev, costs, fees, exp_agg;
END;
$function$;

-- Recreate user_financial_daily using America/Sao_Paulo timezone
CREATE OR REPLACE FUNCTION public.user_financial_daily(_start date, _end date)
 RETURNS TABLE(day date, revenue numeric, costs_and_fees numeric, expenses numeric, net_profit numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  fee_pct numeric;
BEGIN
  PERFORM public.materialize_recurring_expenses(uid, _start, _end);

  SELECT COALESCE(fee_percent, 0) INTO fee_pct
  FROM public.gateway_settings
  WHERE user_id = uid AND active = true
  ORDER BY fallback_priority ASC LIMIT 1;

  fee_pct := COALESCE(fee_pct, 0);

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(_start, _end, '1 day'::interval)::date AS day
  ),
  daily_orders AS (
    SELECT
      (o.paid_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
      SUM(o.total) AS revenue,
      SUM(o.total * fee_pct / 100) AS fees,
      SUM(o.quantity * COALESCE(pc.unit_cost, 0)) AS prod_costs
    FROM public.orders o
    LEFT JOIN public.product_costs pc ON pc.product_id = o.product_id AND pc.user_id = uid
    WHERE o.user_id = uid AND o.payment_status = 'paid'
      AND (o.paid_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _start AND _end
    GROUP BY (o.paid_at AT TIME ZONE 'America/Sao_Paulo')::date
  ),
  daily_expenses AS (
    SELECT date AS day,
      SUM(amount) FILTER (WHERE category <> 'extra_revenue') AS exp,
      SUM(amount) FILTER (WHERE category = 'extra_revenue') AS extra
    FROM public.expenses
    WHERE user_id = uid AND date BETWEEN _start AND _end
    GROUP BY date
  )
  SELECT
    s.day,
    COALESCE(d.revenue, 0) + COALESCE(e.extra, 0) AS revenue,
    COALESCE(d.fees, 0) + COALESCE(d.prod_costs, 0) AS costs_and_fees,
    COALESCE(e.exp, 0) AS expenses,
    (COALESCE(d.revenue, 0) + COALESCE(e.extra, 0) - COALESCE(d.fees, 0) - COALESCE(d.prod_costs, 0) - COALESCE(e.exp, 0)) AS net_profit
  FROM series s
  LEFT JOIN daily_orders d ON d.day = s.day
  LEFT JOIN daily_expenses e ON e.day = s.day
  ORDER BY s.day;
END;
$function$;

-- Recreate user_product_profit_ranking using America/Sao_Paulo timezone
CREATE OR REPLACE FUNCTION public.user_product_profit_ranking(_start date, _end date)
 RETURNS TABLE(product_id uuid, title text, units_sold bigint, revenue numeric, product_cost numeric, gateway_fees numeric, profit numeric, margin_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  fee_pct numeric;
BEGIN
  SELECT COALESCE(fee_percent, 0) INTO fee_pct
  FROM public.gateway_settings
  WHERE user_id = uid AND active = true
  ORDER BY fallback_priority ASC LIMIT 1;
  fee_pct := COALESCE(fee_pct, 0);

  RETURN QUERY
  SELECT
    p.id,
    p.title,
    SUM(o.quantity)::bigint,
    SUM(o.total),
    SUM(o.quantity * COALESCE(pc.unit_cost, 0)),
    SUM(o.total * fee_pct / 100),
    SUM(o.total - (o.quantity * COALESCE(pc.unit_cost, 0)) - (o.total * fee_pct / 100)),
    CASE WHEN SUM(o.total) > 0
      THEN ROUND((SUM(o.total - (o.quantity * COALESCE(pc.unit_cost, 0)) - (o.total * fee_pct / 100)) / SUM(o.total)) * 100, 2)
      ELSE 0 END
  FROM public.orders o
  JOIN public.products p ON p.id = o.product_id
  LEFT JOIN public.product_costs pc ON pc.product_id = o.product_id AND pc.user_id = uid
  WHERE o.user_id = uid AND o.payment_status = 'paid'
    AND (o.paid_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _start AND _end
  GROUP BY p.id, p.title
  ORDER BY profit DESC NULLS LAST
  LIMIT 10;
END;
$function$;