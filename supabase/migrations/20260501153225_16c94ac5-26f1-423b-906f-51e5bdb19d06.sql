CREATE OR REPLACE FUNCTION public.get_xtracky_token(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT api_token
  FROM public.xtracky_settings
  WHERE user_id = _user_id
    AND active = true
    AND api_token IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_xtracky_token(uuid) TO anon, authenticated;