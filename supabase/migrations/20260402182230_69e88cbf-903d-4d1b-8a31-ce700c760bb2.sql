
-- Platform settings table for SaaS owner to configure dashboard branding
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage platform settings
CREATE POLICY "Admins can manage platform_settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Everyone can read platform settings (for banner display etc)
CREATE POLICY "Public can read platform_settings"
ON public.platform_settings
FOR SELECT
TO public
USING (true);

-- Insert default keys
INSERT INTO public.platform_settings (key, value) VALUES
  ('sidebar_logo_open', null),
  ('sidebar_logo_collapsed', null),
  ('dashboard_banner_url', null),
  ('dashboard_banner_link', null);

-- Insert default trust badges for new users via a trigger
CREATE OR REPLACE FUNCTION public.create_default_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trust_badges (user_id, title, description, icon, color, sort_order) VALUES
    (NEW.user_id, 'Compra Segura', 'Seus dados estão protegidos', 'shield', 'blue', 0),
    (NEW.user_id, 'Entrega Garantida', 'Receba ou devolvemos seu dinheiro', 'truck', 'green', 1),
    (NEW.user_id, 'Suporte 24h', 'Atendimento rápido e eficiente', 'headphones', 'purple', 2),
    (NEW.user_id, 'Satisfação Garantida', '7 dias para troca ou devolução', 'check-circle', 'emerald', 3);
  RETURN NEW;
END;
$$;

-- Trigger: when a new profile is created, create default badges
CREATE TRIGGER trg_create_default_badges
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_badges();
