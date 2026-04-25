ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS desktop_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_notify_paid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_notify_pending boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_paid_title text NOT NULL DEFAULT 'Venda aprovada',
  ADD COLUMN IF NOT EXISTS desktop_paid_body text NOT NULL DEFAULT '{{customer_name}} • {{total}}',
  ADD COLUMN IF NOT EXISTS desktop_paid_sound text NOT NULL DEFAULT 'cash-register',
  ADD COLUMN IF NOT EXISTS desktop_paid_sound_url text,
  ADD COLUMN IF NOT EXISTS desktop_paid_icon_url text,
  ADD COLUMN IF NOT EXISTS desktop_paid_duration_ms integer NOT NULL DEFAULT 7000,
  ADD COLUMN IF NOT EXISTS desktop_pending_title text NOT NULL DEFAULT 'Venda pendente',
  ADD COLUMN IF NOT EXISTS desktop_pending_body text NOT NULL DEFAULT 'PIX gerado • aguardando pagamento • {{total}}',
  ADD COLUMN IF NOT EXISTS desktop_pending_sound text NOT NULL DEFAULT 'soft-chime',
  ADD COLUMN IF NOT EXISTS desktop_pending_sound_url text,
  ADD COLUMN IF NOT EXISTS desktop_pending_icon_url text,
  ADD COLUMN IF NOT EXISTS desktop_pending_duration_ms integer NOT NULL DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS mobile_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mobile_paid_title text NOT NULL DEFAULT '✅ Venda aprovada',
  ADD COLUMN IF NOT EXISTS mobile_paid_body text NOT NULL DEFAULT '{{customer_name}} • {{total}}',
  ADD COLUMN IF NOT EXISTS mobile_paid_icon_url text,
  ADD COLUMN IF NOT EXISTS mobile_pending_title text NOT NULL DEFAULT '🔔 Venda pendente',
  ADD COLUMN IF NOT EXISTS mobile_pending_body text NOT NULL DEFAULT 'PIX gerado • {{customer_name}} • {{total}}',
  ADD COLUMN IF NOT EXISTS mobile_pending_icon_url text;

ALTER TABLE public.notification_settings
  ADD CONSTRAINT notification_settings_desktop_paid_duration_ms_check
  CHECK (desktop_paid_duration_ms BETWEEN 1000 AND 30000);

ALTER TABLE public.notification_settings
  ADD CONSTRAINT notification_settings_desktop_pending_duration_ms_check
  CHECK (desktop_pending_duration_ms BETWEEN 1000 AND 30000);

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();