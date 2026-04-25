
-- Create plan type enum
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'enterprise');

-- Create user_plans table
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan plan_type NOT NULL DEFAULT 'free',
  monthly_views_limit INTEGER DEFAULT 200,
  monthly_views_used INTEGER DEFAULT 0,
  views_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Users can read their own plan
CREATE POLICY "Users can read own plan" ON public.user_plans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own plan (for views counter)
CREATE POLICY "Users can update own plan" ON public.user_plans
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert own plan
CREATE POLICY "Users can insert own plan" ON public.user_plans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Security definer function to get user plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS plan_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.user_plans WHERE user_id = _user_id),
    'free'::plan_type
  );
$$;

-- Function to auto-create plan on signup (update existing trigger or add new one)
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- Function to increment views (called from page tracking)
CREATE OR REPLACE FUNCTION public.increment_plan_views(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_plans
  SET monthly_views_used = monthly_views_used + 1,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Reset if past reset date
  UPDATE public.user_plans
  SET monthly_views_used = 0,
      views_reset_at = date_trunc('month', now()) + interval '1 month',
      updated_at = now()
  WHERE user_id = _user_id AND now() >= views_reset_at;
END;
$$;

-- Assign existing user to free plan if not already assigned
INSERT INTO public.user_plans (user_id, plan)
SELECT id, 'free'::plan_type FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
