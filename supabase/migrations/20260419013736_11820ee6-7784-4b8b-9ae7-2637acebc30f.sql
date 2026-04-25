-- Fix Live View tracking: visitor_sessions upsert was failing with RLS error 42501
-- because PostgREST's ON CONFLICT (upsert) requires both INSERT and SELECT permissions.
-- Anon previously had only INSERT/UPDATE policies. We add a minimal SELECT policy
-- that allows anon to read NOTHING (deny all) but satisfies PostgREST's permission
-- check for the upsert operation. Additionally, we tighten UPDATE USING to require
-- user_id IS NOT NULL for consistency.

-- Drop existing anon UPDATE policy and re-create with stricter USING
DROP POLICY IF EXISTS "Public can update own visitor session" ON public.visitor_sessions;

CREATE POLICY "Public can update visitor sessions"
  ON public.visitor_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (user_id IS NOT NULL)
  WITH CHECK (user_id IS NOT NULL);

-- Add SELECT policy for anon that returns no rows (deny all) but satisfies
-- PostgREST's permission check during upsert (ON CONFLICT DO UPDATE).
-- This does NOT leak any data — the policy returns false for every row.
CREATE POLICY "Anon can satisfy upsert select check"
  ON public.visitor_sessions
  FOR SELECT
  TO anon
  USING (false);