
CREATE TABLE public.utmify_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  api_token text NOT NULL,
  platform_name text NOT NULL DEFAULT 'VoidTok',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.utmify_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage utmify_settings"
  ON public.utmify_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
