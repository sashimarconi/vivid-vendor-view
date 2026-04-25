
ALTER TABLE public.user_plans
  ADD COLUMN transaction_fee_percent numeric NOT NULL DEFAULT 2.5,
  ADD COLUMN monthly_price numeric NOT NULL DEFAULT 0;

ALTER TABLE public.user_plans
  DROP COLUMN IF EXISTS monthly_views_used,
  DROP COLUMN IF EXISTS monthly_views_limit,
  DROP COLUMN IF EXISTS views_reset_at;

DROP FUNCTION IF EXISTS public.increment_plan_views(uuid);
