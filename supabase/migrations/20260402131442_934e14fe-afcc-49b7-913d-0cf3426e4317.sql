
-- 1. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text DEFAULT '',
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. Add user_id to owner-managed tables
ALTER TABLE products ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE product_images ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE product_variants ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE variant_groups ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE reviews ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE review_products ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE trust_badges ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE stores ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE store_products ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE store_settings ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE shipping_options ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE order_bumps ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE order_bump_products ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE gateway_settings ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE tracking_pixels ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE webhooks ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE checkout_settings ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE checkout_builder_config ADD COLUMN user_id uuid DEFAULT auth.uid();
ALTER TABLE product_page_builder_config ADD COLUMN user_id uuid DEFAULT auth.uid();

-- Public-insert tables (nullable user_id)
ALTER TABLE orders ADD COLUMN user_id uuid;
ALTER TABLE abandoned_carts ADD COLUMN user_id uuid;
ALTER TABLE page_events ADD COLUMN user_id uuid;
ALTER TABLE visitor_sessions ADD COLUMN user_id uuid;

-- 3. Trigger to auto-set user_id on orders from product owner
CREATE OR REPLACE FUNCTION public.set_order_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL AND NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_user_id_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_user_id();

CREATE TRIGGER set_abandoned_cart_user_id_trigger
  BEFORE INSERT ON public.abandoned_carts
  FOR EACH ROW EXECUTE FUNCTION public.set_order_user_id();

-- 4. Drop ALL old RLS policies
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage product images" ON product_images;
DROP POLICY IF EXISTS "Product images are publicly readable" ON product_images;
DROP POLICY IF EXISTS "Authenticated users can manage product variants" ON product_variants;
DROP POLICY IF EXISTS "Product variants are publicly readable" ON product_variants;
DROP POLICY IF EXISTS "Authenticated users can manage variant groups" ON variant_groups;
DROP POLICY IF EXISTS "Variant groups are publicly readable" ON variant_groups;
DROP POLICY IF EXISTS "Authenticated users can manage reviews" ON reviews;
DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can manage review products" ON review_products;
DROP POLICY IF EXISTS "Review products are publicly readable" ON review_products;
DROP POLICY IF EXISTS "Authenticated users can manage trust badges" ON trust_badges;
DROP POLICY IF EXISTS "Trust badges are publicly readable" ON trust_badges;
DROP POLICY IF EXISTS "Authenticated users can manage stores" ON stores;
DROP POLICY IF EXISTS "Stores are publicly readable" ON stores;
DROP POLICY IF EXISTS "Authenticated users can manage store products" ON store_products;
DROP POLICY IF EXISTS "Store products are publicly readable" ON store_products;
DROP POLICY IF EXISTS "Authenticated users can insert store settings" ON store_settings;
DROP POLICY IF EXISTS "Authenticated users can update store settings" ON store_settings;
DROP POLICY IF EXISTS "Store settings are publicly readable" ON store_settings;
DROP POLICY IF EXISTS "Authenticated users can manage shipping options" ON shipping_options;
DROP POLICY IF EXISTS "Shipping options are publicly readable" ON shipping_options;
DROP POLICY IF EXISTS "Authenticated users can manage order bumps" ON order_bumps;
DROP POLICY IF EXISTS "Order bumps are publicly readable" ON order_bumps;
DROP POLICY IF EXISTS "Authenticated users can manage order bump products" ON order_bump_products;
DROP POLICY IF EXISTS "Order bump products are publicly readable" ON order_bump_products;
DROP POLICY IF EXISTS "Authenticated users can manage gateway settings" ON gateway_settings;
DROP POLICY IF EXISTS "Authenticated users can manage tracking pixels" ON tracking_pixels;
DROP POLICY IF EXISTS "Tracking pixels are publicly readable" ON tracking_pixels;
DROP POLICY IF EXISTS "Authenticated users can manage webhooks" ON webhooks;
DROP POLICY IF EXISTS "Authenticated users can manage checkout settings" ON checkout_settings;
DROP POLICY IF EXISTS "Checkout settings are publicly readable" ON checkout_settings;
DROP POLICY IF EXISTS "Authenticated users can manage checkout builder config" ON checkout_builder_config;
DROP POLICY IF EXISTS "Checkout builder config is publicly readable" ON checkout_builder_config;
DROP POLICY IF EXISTS "Authenticated users can manage product page builder config" ON product_page_builder_config;
DROP POLICY IF EXISTS "Product page builder config is publicly readable" ON product_page_builder_config;
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON orders;
DROP POLICY IF EXISTS "Orders can be created by anyone" ON orders;
DROP POLICY IF EXISTS "Anyone can update pix_copied on orders" ON orders;
DROP POLICY IF EXISTS "Anyone can insert abandoned carts" ON abandoned_carts;
DROP POLICY IF EXISTS "Authenticated users can manage abandoned carts" ON abandoned_carts;
DROP POLICY IF EXISTS "Anyone can insert page events" ON page_events;
DROP POLICY IF EXISTS "Authenticated users can read page events" ON page_events;
DROP POLICY IF EXISTS "Anyone can upsert visitor sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Authenticated users can read visitor sessions" ON visitor_sessions;

-- 5. Create new tenant-isolated RLS policies

-- Products
CREATE POLICY "Owner can manage products" ON products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Products public read" ON products FOR SELECT TO public USING (true);

-- Product images
CREATE POLICY "Owner can manage product images" ON product_images FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Product images public read" ON product_images FOR SELECT TO public USING (true);

-- Product variants
CREATE POLICY "Owner can manage product variants" ON product_variants FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Product variants public read" ON product_variants FOR SELECT TO public USING (true);

-- Variant groups
CREATE POLICY "Owner can manage variant groups" ON variant_groups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Variant groups public read" ON variant_groups FOR SELECT TO public USING (true);

-- Reviews
CREATE POLICY "Owner can manage reviews" ON reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reviews public read" ON reviews FOR SELECT TO public USING (true);

-- Review products
CREATE POLICY "Owner can manage review products" ON review_products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Review products public read" ON review_products FOR SELECT TO public USING (true);

-- Trust badges
CREATE POLICY "Owner can manage trust badges" ON trust_badges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Trust badges public read" ON trust_badges FOR SELECT TO public USING (true);

-- Stores
CREATE POLICY "Owner can manage stores" ON stores FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Stores public read" ON stores FOR SELECT TO public USING (true);

-- Store products
CREATE POLICY "Owner can manage store products" ON store_products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Store products public read" ON store_products FOR SELECT TO public USING (true);

-- Store settings
CREATE POLICY "Owner can manage store settings" ON store_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Store settings public read" ON store_settings FOR SELECT TO public USING (true);

-- Shipping options
CREATE POLICY "Owner can manage shipping options" ON shipping_options FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shipping options public read" ON shipping_options FOR SELECT TO public USING (true);

-- Order bumps
CREATE POLICY "Owner can manage order bumps" ON order_bumps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Order bumps public read" ON order_bumps FOR SELECT TO public USING (true);

-- Order bump products
CREATE POLICY "Owner can manage order bump products" ON order_bump_products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Order bump products public read" ON order_bump_products FOR SELECT TO public USING (true);

-- Gateway settings (NO public read - contains secrets)
CREATE POLICY "Owner can manage gateway settings" ON gateway_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tracking pixels
CREATE POLICY "Owner can manage tracking pixels" ON tracking_pixels FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tracking pixels public read" ON tracking_pixels FOR SELECT TO public USING (true);

-- Webhooks (NO public read - contains secrets)
CREATE POLICY "Owner can manage webhooks" ON webhooks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Checkout settings
CREATE POLICY "Owner can manage checkout settings" ON checkout_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Checkout settings public read" ON checkout_settings FOR SELECT TO public USING (true);

-- Checkout builder config
CREATE POLICY "Owner can manage checkout builder config" ON checkout_builder_config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Checkout builder config public read" ON checkout_builder_config FOR SELECT TO public USING (true);

-- Product page builder config
CREATE POLICY "Owner can manage product page builder config" ON product_page_builder_config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Product page builder config public read" ON product_page_builder_config FOR SELECT TO public USING (true);

-- Orders (public insert, owner reads via user_id set by trigger)
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update pix_copied" ON orders FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Owner can manage orders" ON orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Abandoned carts (public insert, owner reads)
CREATE POLICY "Anyone can insert abandoned carts" ON abandoned_carts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Owner can manage abandoned carts" ON abandoned_carts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Page events (public insert, owner reads)
CREATE POLICY "Anyone can insert page events" ON page_events FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Owner can read page events" ON page_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Visitor sessions (public upsert, owner reads)
CREATE POLICY "Anyone can upsert visitor sessions" ON visitor_sessions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Owner can read visitor sessions" ON visitor_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
