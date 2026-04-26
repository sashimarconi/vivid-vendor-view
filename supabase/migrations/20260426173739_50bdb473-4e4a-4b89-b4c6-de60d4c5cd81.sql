
-- Tabela de logs de saúde do gateway (latência, sucesso/erro, fallback)
CREATE TABLE IF NOT EXISTS public.gateway_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gateway_name text NOT NULL,
  success boolean NOT NULL,
  status_code int,
  latency_ms int NOT NULL,
  error_message text,
  fallback_from text, -- preenchido se essa chamada foi um fallback
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gateway_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own gateway health logs"
  ON public.gateway_health_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Apenas service_role insere (edge function)
CREATE POLICY "Service role can insert gateway health logs"
  ON public.gateway_health_logs FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gateway_health_user_created
  ON public.gateway_health_logs (user_id, created_at DESC);

-- Coluna de prioridade nos gateways para fallback ordenado
ALTER TABLE public.gateway_settings
  ADD COLUMN IF NOT EXISTS fallback_priority int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_gateway_settings_user_priority
  ON public.gateway_settings (user_id, fallback_priority DESC);

-- Função: métricas do funil (sessões → product_view → buy_click → checkout_view → pix → paid)
CREATE OR REPLACE FUNCTION public.user_funnel_metrics(_hours int DEFAULT 24)
RETURNS TABLE (
  sessions bigint,
  product_views bigint,
  buy_clicks bigint,
  checkout_views bigint,
  pix_generated bigint,
  paid_orders bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(DISTINCT session_id) FROM public.visitor_sessions
      WHERE user_id = auth.uid() AND created_at >= now() - make_interval(hours => _hours)) AS sessions,
    (SELECT COUNT(*) FROM public.page_events
      WHERE user_id = auth.uid() AND event_type = 'page_view' AND page_url LIKE '/product/%'
      AND created_at >= now() - make_interval(hours => _hours)) AS product_views,
    (SELECT COUNT(*) FROM public.page_events
      WHERE user_id = auth.uid() AND event_type = 'buy_click'
      AND created_at >= now() - make_interval(hours => _hours)) AS buy_clicks,
    (SELECT COUNT(*) FROM public.page_events
      WHERE user_id = auth.uid() AND event_type = 'checkout_view'
      AND created_at >= now() - make_interval(hours => _hours)) AS checkout_views,
    (SELECT COUNT(*) FROM public.orders
      WHERE user_id = auth.uid()
      AND created_at >= now() - make_interval(hours => _hours)) AS pix_generated,
    (SELECT COUNT(*) FROM public.orders
      WHERE user_id = auth.uid() AND payment_status = 'paid'
      AND created_at >= now() - make_interval(hours => _hours)) AS paid_orders;
$$;

-- Função: comparação de funil hoje vs média 7 dias (alertas de queda)
CREATE OR REPLACE FUNCTION public.user_funnel_alerts()
RETURNS TABLE (
  step text,
  today_value numeric,
  avg_7d numeric,
  drop_pct numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH today AS (
    SELECT * FROM public.user_funnel_metrics(24)
  ),
  weekly AS (
    SELECT
      (SELECT COUNT(DISTINCT session_id)::numeric / 7 FROM public.visitor_sessions
        WHERE user_id = auth.uid() AND created_at >= now() - interval '7 days' AND created_at < now() - interval '24 hours') AS sessions,
      (SELECT COUNT(*)::numeric / 7 FROM public.page_events
        WHERE user_id = auth.uid() AND event_type = 'page_view' AND page_url LIKE '/product/%'
        AND created_at >= now() - interval '7 days' AND created_at < now() - interval '24 hours') AS product_views,
      (SELECT COUNT(*)::numeric / 7 FROM public.page_events
        WHERE user_id = auth.uid() AND event_type = 'buy_click'
        AND created_at >= now() - interval '7 days' AND created_at < now() - interval '24 hours') AS buy_clicks,
      (SELECT COUNT(*)::numeric / 7 FROM public.page_events
        WHERE user_id = auth.uid() AND event_type = 'checkout_view'
        AND created_at >= now() - interval '7 days' AND created_at < now() - interval '24 hours') AS checkout_views,
      (SELECT COUNT(*)::numeric / 7 FROM public.orders
        WHERE user_id = auth.uid()
        AND created_at >= now() - interval '7 days' AND created_at < now() - interval '24 hours') AS pix_generated,
      (SELECT COUNT(*)::numeric / 7 FROM public.orders
        WHERE user_id = auth.uid() AND payment_status = 'paid'
        AND created_at >= now() - interval '7 days' AND created_at < now() - interval '24 hours') AS paid_orders
  )
  SELECT step, today_value, avg_7d,
    CASE WHEN avg_7d > 0 THEN ROUND(((avg_7d - today_value) / avg_7d) * 100, 1) ELSE 0 END AS drop_pct
  FROM (
    SELECT 'Sessões' AS step, t.sessions::numeric AS today_value, w.sessions AS avg_7d FROM today t, weekly w
    UNION ALL SELECT 'Visualizações de produto', t.product_views, w.product_views FROM today t, weekly w
    UNION ALL SELECT 'Cliques em comprar', t.buy_clicks, w.buy_clicks FROM today t, weekly w
    UNION ALL SELECT 'Acessos ao checkout', t.checkout_views, w.checkout_views FROM today t, weekly w
    UNION ALL SELECT 'PIX gerados', t.pix_generated, w.pix_generated FROM today t, weekly w
    UNION ALL SELECT 'Pedidos pagos', t.paid_orders, w.paid_orders FROM today t, weekly w
  ) x;
$$;

-- Função: saúde dos gateways nas últimas N horas
CREATE OR REPLACE FUNCTION public.user_gateway_health(_hours int DEFAULT 24)
RETURNS TABLE (
  gateway_name text,
  total_calls bigint,
  success_calls bigint,
  error_calls bigint,
  avg_latency_ms numeric,
  p95_latency_ms numeric,
  error_rate_pct numeric,
  last_error text,
  last_call_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    gateway_name,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE success) AS success_calls,
    COUNT(*) FILTER (WHERE NOT success) AS error_calls,
    ROUND(AVG(latency_ms)::numeric, 0) AS avg_latency_ms,
    ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric, 0) AS p95_latency_ms,
    ROUND((COUNT(*) FILTER (WHERE NOT success))::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS error_rate_pct,
    (SELECT error_message FROM public.gateway_health_logs g2
      WHERE g2.user_id = auth.uid() AND g2.gateway_name = g.gateway_name AND NOT g2.success
      ORDER BY g2.created_at DESC LIMIT 1) AS last_error,
    MAX(created_at) AS last_call_at
  FROM public.gateway_health_logs g
  WHERE user_id = auth.uid()
    AND created_at >= now() - make_interval(hours => _hours)
  GROUP BY gateway_name
  ORDER BY total_calls DESC;
$$;

-- Função: PIX órfãos (transaction_id sem pedido salvo) - heurística
-- Conta pedidos sem transaction_id no período (falha de salvar pós-gateway)
CREATE OR REPLACE FUNCTION public.user_orphan_pix(_hours int DEFAULT 24)
RETURNS TABLE (
  orphan_count bigint,
  total_orders bigint,
  orphan_pct numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE transaction_id IS NULL OR transaction_id = '') AS orphan_count,
    COUNT(*) AS total_orders,
    ROUND((COUNT(*) FILTER (WHERE transaction_id IS NULL OR transaction_id = ''))::numeric
      / NULLIF(COUNT(*), 0) * 100, 1) AS orphan_pct
  FROM public.orders
  WHERE user_id = auth.uid()
    AND created_at >= now() - make_interval(hours => _hours);
$$;
