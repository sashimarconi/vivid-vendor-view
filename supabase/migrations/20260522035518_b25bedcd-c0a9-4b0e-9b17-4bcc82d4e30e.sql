CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip)
);

CREATE INDEX idx_blocked_ips_user_ip ON public.blocked_ips(user_id, ip);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own blocked ips"
ON public.blocked_ips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own blocked ips"
ON public.blocked_ips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own blocked ips"
ON public.blocked_ips FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users update own blocked ips"
ON public.blocked_ips FOR UPDATE
USING (auth.uid() = user_id);