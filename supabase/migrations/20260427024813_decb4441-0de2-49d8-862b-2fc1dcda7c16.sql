-- 1. Add fee_percent column to gateway_settings
ALTER TABLE public.gateway_settings
ADD COLUMN IF NOT EXISTS fee_percent numeric NOT NULL DEFAULT 0;

-- 2. Product costs table
CREATE TABLE IF NOT EXISTS public.product_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  product_id uuid NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage product costs"
ON public.product_costs FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_product_costs_updated_at
BEFORE UPDATE ON public.product_costs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Expenses table (with recurring support)
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_day integer,
  recurring_parent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage expenses"
ON public.expenses FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date DESC);

-- 4. Financial goals table
CREATE TABLE IF NOT EXISTS public.financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  month date NOT NULL,
  revenue_goal numeric NOT NULL DEFAULT 0,
  profit_goal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage financial goals"
ON public.financial_goals FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_financial_goals_updated_at
BEFORE UPDATE ON public.financial_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Materialize recurring expenses for the requested period
CREATE OR REPLACE FUNCTION public.materialize_recurring_expenses(_user_id uuid, _start date, _end date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  d date;
  target_day integer;
  last_day integer;
  candidate date;
BEGIN
  FOR r IN
    SELECT id, category, description, amount, recurring_day, date
    FROM public.expenses
    WHERE user_id = _user_id
      AND is_recurring = true
      AND recurring_parent_id IS NULL
  LOOP
    d := date_trunc('month', GREATEST(_start, r.date))::date;
    WHILE d <= _end LOOP
      last_day := EXTRACT(DAY FROM (date_trunc('month', d) + interval '1 month - 1 day'))::integer;
      target_day := LEAST(COALESCE(r.recurring_day, EXTRACT(DAY FROM r.date)::integer), last_day);
      candidate := (date_trunc('month', d) + ((target_day - 1) || ' days')::interval)::date;

      IF candidate >= r.date AND candidate >= _start AND candidate <= _end THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.expenses
          WHERE recurring_parent_id = r.id AND date = candidate AND user_id = _user_id
        ) AND candidate <> r.date THEN
          INSERT INTO public.expenses (user_id, date, category, description, amount, is_recurring, recurring_parent_id)
          VALUES (_user_id, candidate, r.category, r.description, r.amount, false, r.id);
        END IF;
      END IF;

      d := (date_trunc('month', d) + interval '1 month')::date;
    END LOOP;
  END LOOP;
END;
$$;

-- 6. Financial summary RPC
CREATE OR REPLACE FUNCTION public.user_financial_summary(_start date, _end date)
RETURNS TABLE(
  gross_revenue numeric,
  total_orders_paid bigint,
  gateway_fees_total numeric,
  product_costs_total numeric,
  expenses_total numeric,
  expenses_by_category jsonb,
  extra_revenue numeric,
  ads_total numeric,
  net_profit numeric,
  margin_pct numeric,
  avg_ticket numeric,
  roi numeric,
  cpa numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  PERFORM public.materialize_recurring_expenses(uid, _start, _end);

  RETURN QUERY
  WITH paid AS (
    SELECT o.id, o.product_id, o.quantity, o.total
    FROM public.orders o
    WHERE o.user_id = uid AND o.payment_status = 'paid'
      AND o.paid_at::date BETWEEN _start AND _end
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
$$;

-- 7. Daily series for chart
CREATE OR REPLACE FUNCTION public.user_financial_daily(_start date, _end date)
RETURNS TABLE(day date, revenue numeric, costs_and_fees numeric, expenses numeric, net_profit numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
      o.paid_at::date AS day,
      SUM(o.total) AS revenue,
      SUM(o.total * fee_pct / 100) AS fees,
      SUM(o.quantity * COALESCE(pc.unit_cost, 0)) AS prod_costs
    FROM public.orders o
    LEFT JOIN public.product_costs pc ON pc.product_id = o.product_id AND pc.user_id = uid
    WHERE o.user_id = uid AND o.payment_status = 'paid'
      AND o.paid_at::date BETWEEN _start AND _end
    GROUP BY o.paid_at::date
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
$$;

-- 8. Product profit ranking
CREATE OR REPLACE FUNCTION public.user_product_profit_ranking(_start date, _end date)
RETURNS TABLE(
  product_id uuid,
  title text,
  units_sold bigint,
  revenue numeric,
  product_cost numeric,
  gateway_fees numeric,
  profit numeric,
  margin_pct numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    AND o.paid_at::date BETWEEN _start AND _end
  GROUP BY p.id, p.title
  ORDER BY profit DESC NULLS LAST
  LIMIT 10;
END;
$$;