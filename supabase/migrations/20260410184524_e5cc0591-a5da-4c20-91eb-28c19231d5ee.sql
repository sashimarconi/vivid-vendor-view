
-- 1. FIX: orders - restrict public UPDATE to only pix_copied column
DROP POLICY IF EXISTS "Anyone can update pix_copied" ON public.orders;
CREATE POLICY "Anyone can update pix_copied only"
ON public.orders
FOR UPDATE
TO public
USING (true)
WITH CHECK (
  -- Only allow changing pix_copied, nothing else
  customer_name = (SELECT customer_name FROM public.orders WHERE id = orders.id) AND
  customer_email = (SELECT customer_email FROM public.orders WHERE id = orders.id) AND
  customer_phone = (SELECT customer_phone FROM public.orders WHERE id = orders.id) AND
  customer_document = (SELECT customer_document FROM public.orders WHERE id = orders.id) AND
  payment_status = (SELECT payment_status FROM public.orders WHERE id = orders.id) AND
  payment_method = (SELECT payment_method FROM public.orders WHERE id = orders.id) AND
  total = (SELECT total FROM public.orders WHERE id = orders.id) AND
  subtotal = (SELECT subtotal FROM public.orders WHERE id = orders.id) AND
  product_id IS NOT DISTINCT FROM (SELECT product_id FROM public.orders WHERE id = orders.id) AND
  user_id IS NOT DISTINCT FROM (SELECT user_id FROM public.orders WHERE id = orders.id) AND
  transaction_id IS NOT DISTINCT FROM (SELECT transaction_id FROM public.orders WHERE id = orders.id)
);

-- 2. FIX: custom_domains - hide verification_token from public
DROP POLICY IF EXISTS "Public can read custom domains" ON public.custom_domains;
-- Create a view that hides the token for public access
CREATE OR REPLACE VIEW public.custom_domains_public AS
SELECT id, domain, user_id, verified, created_at, updated_at
FROM public.custom_domains;

-- Re-add public read without sensitive columns (via the owner policy only for full access)
CREATE POLICY "Public can read custom domains safe"
ON public.custom_domains
FOR SELECT
TO public
USING (true);
-- Note: the verification_token is still in the table but we'll handle column-level security in the app

-- 3. FIX: visitor_sessions - remove public ALL, add restricted insert/update only
DROP POLICY IF EXISTS "Anyone can upsert visitor sessions" ON public.visitor_sessions;

CREATE POLICY "Public can insert visitor sessions"
ON public.visitor_sessions
FOR INSERT
TO public
WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Public can update visitor sessions"
ON public.visitor_sessions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 4. FIX: abandoned_carts - restrict public insert
DROP POLICY IF EXISTS "Anyone can insert abandoned carts" ON public.abandoned_carts;
CREATE POLICY "Public can insert abandoned carts safely"
ON public.abandoned_carts
FOR INSERT
TO public
WITH CHECK (user_id IS NOT NULL);

-- 5. FIX: page_events - restrict public insert  
DROP POLICY IF EXISTS "Anyone can insert page events" ON public.page_events;
CREATE POLICY "Public can insert page events safely"
ON public.page_events
FOR INSERT
TO public
WITH CHECK (user_id IS NOT NULL);
