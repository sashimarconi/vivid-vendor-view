
ALTER TABLE public.tracking_pixels
  ADD COLUMN IF NOT EXISTS fire_on_paid_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_token text DEFAULT NULL;
