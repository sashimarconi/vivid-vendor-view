
-- Fix security definer view
DROP VIEW IF EXISTS public.custom_domains_public;
CREATE VIEW public.custom_domains_public
WITH (security_invoker = true) AS
SELECT id, domain, user_id, verified, created_at, updated_at
FROM public.custom_domains;

-- Fix visitor_sessions public update - restrict what can be changed
DROP POLICY IF EXISTS "Public can update visitor sessions" ON public.visitor_sessions;
CREATE POLICY "Public can update visitor sessions"
ON public.visitor_sessions
FOR UPDATE
TO public
USING (true)
WITH CHECK (
  session_id = (SELECT session_id FROM public.visitor_sessions WHERE id = visitor_sessions.id) AND
  user_id IS NOT DISTINCT FROM (SELECT user_id FROM public.visitor_sessions WHERE id = visitor_sessions.id) AND
  created_at = (SELECT created_at FROM public.visitor_sessions WHERE id = visitor_sessions.id)
);
