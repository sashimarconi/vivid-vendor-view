DROP POLICY IF EXISTS "Anon can satisfy upsert select check" ON public.visitor_sessions;

-- Allow anon to read sessions so PostgREST upsert (ON CONFLICT) works.
-- Data exposed: session_id, page_url, city/region/country, lat/lng — all
-- non-sensitive analytics data already insertable by anon.
CREATE POLICY "Anon can read sessions for upsert"
  ON public.visitor_sessions
  FOR SELECT
  TO anon
  USING (user_id IS NOT NULL);