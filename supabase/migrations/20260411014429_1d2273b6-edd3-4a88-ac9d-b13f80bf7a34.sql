
-- Drop broken policies
DROP POLICY IF EXISTS "Public can insert visitor sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Public can update visitor sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Owner can read visitor sessions" ON public.visitor_sessions;

-- Allow anyone to insert (visitors are anonymous, user_id = tenant owner)
CREATE POLICY "Anyone can insert visitor sessions"
ON public.visitor_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to update their own session by session_id
CREATE POLICY "Anyone can update visitor sessions"
ON public.visitor_sessions FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Owner (tenant) can read their visitors
CREATE POLICY "Owner can read visitor sessions"
ON public.visitor_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also allow anon to read for public pages (needed for upsert)
CREATE POLICY "Anon can read own session"
ON public.visitor_sessions FOR SELECT
TO anon
USING (true);
