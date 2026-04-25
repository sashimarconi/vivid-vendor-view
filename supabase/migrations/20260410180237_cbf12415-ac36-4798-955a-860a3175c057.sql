
-- Fix public read policies to only allow anon role (not authenticated)
-- This ensures each user only sees their own data in the dashboard

-- products
DROP POLICY IF EXISTS "Products public read" ON public.products;
CREATE POLICY "Products public read" ON public.products FOR SELECT TO anon USING (true);

-- product_images
DROP POLICY IF EXISTS "Product images public read" ON public.product_images;
CREATE POLICY "Product images public read" ON public.product_images FOR SELECT TO anon USING (true);

-- product_variants
DROP POLICY IF EXISTS "Product variants public read" ON public.product_variants;
CREATE POLICY "Product variants public read" ON public.product_variants FOR SELECT TO anon USING (true);

-- variant_groups
DROP POLICY IF EXISTS "Variant groups public read" ON public.variant_groups;
CREATE POLICY "Variant groups public read" ON public.variant_groups FOR SELECT TO anon USING (true);

-- stores
DROP POLICY IF EXISTS "Stores public read" ON public.stores;
CREATE POLICY "Stores public read" ON public.stores FOR SELECT TO anon USING (true);

-- store_products
DROP POLICY IF EXISTS "Store products public read" ON public.store_products;
CREATE POLICY "Store products public read" ON public.store_products FOR SELECT TO anon USING (true);

-- store_settings
DROP POLICY IF EXISTS "Store settings public read" ON public.store_settings;
CREATE POLICY "Store settings public read" ON public.store_settings FOR SELECT TO anon USING (true);

-- reviews
DROP POLICY IF EXISTS "Reviews public read" ON public.reviews;
CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT TO anon USING (true);

-- review_products
DROP POLICY IF EXISTS "Review products public read" ON public.review_products;
CREATE POLICY "Review products public read" ON public.review_products FOR SELECT TO anon USING (true);

-- shipping_options
DROP POLICY IF EXISTS "Shipping options public read" ON public.shipping_options;
CREATE POLICY "Shipping options public read" ON public.shipping_options FOR SELECT TO anon USING (true);

-- order_bumps
DROP POLICY IF EXISTS "Order bumps public read" ON public.order_bumps;
CREATE POLICY "Order bumps public read" ON public.order_bumps FOR SELECT TO anon USING (true);

-- order_bump_products
DROP POLICY IF EXISTS "Order bump products public read" ON public.order_bump_products;
CREATE POLICY "Order bump products public read" ON public.order_bump_products FOR SELECT TO anon USING (true);

-- trust_badges
DROP POLICY IF EXISTS "Trust badges public read" ON public.trust_badges;
CREATE POLICY "Trust badges public read" ON public.trust_badges FOR SELECT TO anon USING (true);

-- tracking_pixels
DROP POLICY IF EXISTS "Tracking pixels public read" ON public.tracking_pixels;
CREATE POLICY "Tracking pixels public read" ON public.tracking_pixels FOR SELECT TO anon USING (true);

-- checkout_settings
DROP POLICY IF EXISTS "Checkout settings public read" ON public.checkout_settings;
CREATE POLICY "Checkout settings public read" ON public.checkout_settings FOR SELECT TO anon USING (true);

-- checkout_builder_config
DROP POLICY IF EXISTS "Checkout builder config public read" ON public.checkout_builder_config;
CREATE POLICY "Checkout builder config public read" ON public.checkout_builder_config FOR SELECT TO anon USING (true);

-- product_page_builder_config
DROP POLICY IF EXISTS "Product page builder config public read" ON public.product_page_builder_config;
CREATE POLICY "Product page builder config public read" ON public.product_page_builder_config FOR SELECT TO anon USING (true);
