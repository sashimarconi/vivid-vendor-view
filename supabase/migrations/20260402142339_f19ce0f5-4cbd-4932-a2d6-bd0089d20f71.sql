
-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: only admins can read user_roles
CREATE POLICY "Admins can read user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: only admins can manage user_roles
CREATE POLICY "Admins can manage user_roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Assign admin role to sashidoblack@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('9677f142-19ef-4e6d-b194-08ee5e9abe69', 'admin');

-- Function to list all users (admin only, security definer)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  plan plan_type,
  monthly_views_used integer,
  monthly_views_limit integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id as user_id,
    u.email::text,
    p.full_name,
    p.avatar_url,
    COALESCE(up.plan, 'free'::plan_type) as plan,
    COALESCE(up.monthly_views_used, 0) as monthly_views_used,
    COALESCE(up.monthly_views_limit, 200) as monthly_views_limit,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_plans up ON up.user_id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY u.created_at DESC
$$;

-- Function to get SaaS metrics (admin only)
CREATE OR REPLACE FUNCTION public.admin_saas_metrics()
RETURNS TABLE(
  total_users bigint,
  total_products bigint,
  total_stores bigint,
  total_orders bigint,
  total_revenue numeric,
  free_users bigint,
  pro_users bigint,
  enterprise_users bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM auth.users) as total_users,
    (SELECT count(*) FROM public.products) as total_products,
    (SELECT count(*) FROM public.stores) as total_stores,
    (SELECT count(*) FROM public.orders) as total_orders,
    (SELECT COALESCE(sum(total), 0) FROM public.orders WHERE payment_status = 'paid') as total_revenue,
    (SELECT count(*) FROM public.user_plans WHERE plan = 'free') as free_users,
    (SELECT count(*) FROM public.user_plans WHERE plan = 'pro') as pro_users,
    (SELECT count(*) FROM public.user_plans WHERE plan = 'enterprise') as enterprise_users
  WHERE public.has_role(auth.uid(), 'admin')
$$;

-- Function to update user plan (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user_plan(_target_user_id uuid, _new_plan plan_type)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  UPDATE public.user_plans
  SET plan = _new_plan,
      monthly_views_limit = CASE
        WHEN _new_plan = 'free' THEN 200
        WHEN _new_plan = 'pro' THEN NULL
        WHEN _new_plan = 'enterprise' THEN NULL
      END,
      updated_at = now()
  WHERE user_id = _target_user_id;
END;
$$;
