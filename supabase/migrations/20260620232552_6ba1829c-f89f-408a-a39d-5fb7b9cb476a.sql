
-- 1) abandoned_carts: drop overly permissive public UPDATE
DROP POLICY IF EXISTS "Public can update abandoned carts safely" ON public.abandoned_carts;

-- 2) custom_domains: drop public read (already use safe view custom_domains_public)
DROP POLICY IF EXISTS "Public can read custom domains base for view" ON public.custom_domains;

-- 3) platform_settings: drop public read; allow only authenticated read
DROP POLICY IF EXISTS "Public can read platform_settings" ON public.platform_settings;
CREATE POLICY "Authenticated can read platform_settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- 4) visitor_sessions: remove anon SELECT and UPDATE
DROP POLICY IF EXISTS "Anon can read sessions for upsert" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Public can update visitor sessions" ON public.visitor_sessions;

-- Create SECURITY DEFINER RPC for visitor tracking upsert (replaces direct anon UPDATE)
CREATE OR REPLACE FUNCTION public.upsert_visitor_session(
  _session_id text,
  _user_id uuid,
  _page_url text DEFAULT NULL,
  _city text DEFAULT NULL,
  _region text DEFAULT NULL,
  _country text DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _session_id IS NULL OR _user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.visitor_sessions (session_id, user_id, page_url, city, region, country, latitude, longitude, last_seen_at)
  VALUES (_session_id, _user_id, _page_url, _city, _region, _country, _latitude, _longitude, now())
  ON CONFLICT (session_id) DO UPDATE
  SET last_seen_at = now(),
      page_url = COALESCE(EXCLUDED.page_url, public.visitor_sessions.page_url),
      city = COALESCE(EXCLUDED.city, public.visitor_sessions.city),
      region = COALESCE(EXCLUDED.region, public.visitor_sessions.region),
      country = COALESCE(EXCLUDED.country, public.visitor_sessions.country),
      latitude = COALESCE(EXCLUDED.latitude, public.visitor_sessions.latitude),
      longitude = COALESCE(EXCLUDED.longitude, public.visitor_sessions.longitude);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_visitor_session(text, uuid, text, text, text, text, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_visitor_session(text, uuid, text, text, text, text, double precision, double precision) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.expire_visitor_session(_session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.visitor_sessions
  SET last_seen_at = now() - interval '1 minute'
  WHERE session_id = _session_id;
$$;

REVOKE ALL ON FUNCTION public.expire_visitor_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_visitor_session(text) TO anon, authenticated;

-- 5) xtracky token RPC: revoke from anon (script injection should not leak tokens to anyone)
REVOKE EXECUTE ON FUNCTION public.get_xtracky_token(uuid) FROM anon;
