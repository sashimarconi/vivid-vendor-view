ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS desktop_paid_image_url text,
  ADD COLUMN IF NOT EXISTS desktop_pending_image_url text,
  ADD COLUMN IF NOT EXISTS mobile_paid_image_url text,
  ADD COLUMN IF NOT EXISTS mobile_pending_image_url text;