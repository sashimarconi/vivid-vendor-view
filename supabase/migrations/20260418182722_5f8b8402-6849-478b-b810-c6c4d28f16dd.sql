
-- Add address and tracking fields to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_cep text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS customer_number text,
  ADD COLUMN IF NOT EXISTS customer_complement text,
  ADD COLUMN IF NOT EXISTS customer_neighborhood text,
  ADD COLUMN IF NOT EXISTS customer_city text,
  ADD COLUMN IF NOT EXISTS customer_state text,
  ADD COLUMN IF NOT EXISTS customer_ip text,
  ADD COLUMN IF NOT EXISTS customer_user_agent text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Same fields on abandoned_carts so we keep parity
ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS customer_cep text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS customer_number text,
  ADD COLUMN IF NOT EXISTS customer_complement text,
  ADD COLUMN IF NOT EXISTS customer_neighborhood text,
  ADD COLUMN IF NOT EXISTS customer_city text,
  ADD COLUMN IF NOT EXISTS customer_state text;
