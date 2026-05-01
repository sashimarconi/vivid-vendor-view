
CREATE TABLE public.xtracky_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_token text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.xtracky_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own xtracky settings"
  ON public.xtracky_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own xtracky settings"
  ON public.xtracky_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own xtracky settings"
  ON public.xtracky_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own xtracky settings"
  ON public.xtracky_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_xtracky_settings_updated_at
  BEFORE UPDATE ON public.xtracky_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set user_id on insert (mesmo padrão das outras tabelas user-scoped)
CREATE OR REPLACE FUNCTION public.set_xtracky_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_xtracky_user_id_trigger
  BEFORE INSERT ON public.xtracky_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_xtracky_user_id();
