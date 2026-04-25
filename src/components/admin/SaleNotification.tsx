import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, DollarSign } from "lucide-react";

type NotificationKind = "pending" | "paid";
type NotificationSettings = Record<string, any>;

const DEFAULTS: NotificationSettings = {
  desktop_enabled: true,
  desktop_notify_paid: true,
  desktop_notify_pending: true,
  desktop_paid_title: "Venda aprovada",
  desktop_paid_body: "{{customer_name}} • {{total}}",
  desktop_paid_sound: "cash-register",
  desktop_paid_sound_url: "",
  desktop_paid_icon_url: "",
  desktop_paid_image_url: "",
  desktop_paid_duration_ms: 7000,
  desktop_pending_title: "Venda pendente",
  desktop_pending_body: "PIX gerado • aguardando pagamento • {{total}}",
  desktop_pending_sound: "soft-chime",
  desktop_pending_sound_url: "",
  desktop_pending_icon_url: "",
  desktop_pending_image_url: "",
  desktop_pending_duration_ms: 6000,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function renderTemplate(template: string | null | undefined, values: Record<string, string>) {
  return String(template || "")
    .replace(/\{\{\s*customer_name\s*\}\}/gi, values.customer_name || "Cliente")
    .replace(/\{\{\s*total\s*\}\}/gi, values.total || "R$ 0,00")
    .replace(/\{\{\s*gateway\s*\}\}/gi, values.gateway || "Gateway")
    .replace(/\{\{\s*product_title\s*\}\}/gi, values.product_title || "Produto");
}

function playPresetSound(preset?: string, customUrl?: string | null) {
  const fallback = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      const tone = (freq: number, start: number, duration: number, gain: number) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);
        g.gain.setValueAtTime(gain, now + start);
        g.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration);
      };

      if (preset === "cash-register") {
        tone(2200, 0, 0.08, 0.28);
        tone(2800, 0.1, 0.08, 0.28);
        tone(3400, 0.2, 0.18, 0.26);
        tone(2600, 0.42, 0.12, 0.2);
        return;
      }

      if (preset === "soft-chime") {
        tone(1200, 0, 0.09, 0.16);
        tone(1600, 0.1, 0.16, 0.14);
        return;
      }

      if (preset === "bell") {
        tone(1500, 0, 0.14, 0.18);
        tone(2100, 0.08, 0.22, 0.16);
      }
    } catch {
      // ignore
    }
  };

  if (preset === "none") return;

  if (customUrl) {
    const audio = new Audio(customUrl);
    audio.preload = "auto";
    audio.volume = 1;
    void audio.play().catch(fallback);
    return;
  }

  fallback();
}

function showNativeNotification(options: {
  title: string;
  body: string;
  icon?: string | null;
  image?: string | null;
  tag: string;
  url: string;
}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/icon-192.png",
      tag: options.tag,
      data: { url: options.url },
      ...(options.image ? { image: options.image } : {}),
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      window.location.href = options.url;
      notification.close();
    };
  } catch {
    // ignore
  }
}

function getConfig(settings: NotificationSettings, kind: NotificationKind) {
  if (kind === "paid") {
    return {
      title: settings.desktop_paid_title || DEFAULTS.desktop_paid_title,
      body: settings.desktop_paid_body || DEFAULTS.desktop_paid_body,
      sound: settings.desktop_paid_sound || DEFAULTS.desktop_paid_sound,
      soundUrl: settings.desktop_paid_sound_url || "",
      icon: settings.desktop_paid_icon_url || "",
      image: settings.desktop_paid_image_url || "",
      duration: Number(settings.desktop_paid_duration_ms || DEFAULTS.desktop_paid_duration_ms),
    };
  }

  return {
    title: settings.desktop_pending_title || DEFAULTS.desktop_pending_title,
    body: settings.desktop_pending_body || DEFAULTS.desktop_pending_body,
    sound: settings.desktop_pending_sound || DEFAULTS.desktop_pending_sound,
    soundUrl: settings.desktop_pending_sound_url || "",
    icon: settings.desktop_pending_icon_url || "",
    image: settings.desktop_pending_image_url || "",
    duration: Number(settings.desktop_pending_duration_ms || DEFAULTS.desktop_pending_duration_ms),
  };
}

export default function SaleNotification() {
  const settingsRef = useRef<NotificationSettings>(DEFAULTS);
  const seenPendingIds = useRef(new Set<string>());
  const seenPaidIds = useRef(new Set<string>());

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    const loadSettings = async (userId: string) => {
      const { data } = await (supabase as any)
        .from("notification_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (mounted) {
        settingsRef.current = { ...DEFAULTS, ...(data || {}) };
      }
    };

    const showDesktopAlert = async (kind: NotificationKind, order: any) => {
      const settings = settingsRef.current || DEFAULTS;
      if (!settings.desktop_enabled) return;
      if (kind === "paid" && !settings.desktop_notify_paid) return;
      if (kind === "pending" && !settings.desktop_notify_pending) return;

      let gatewayName = "Gateway";
      if (kind === "paid") {
        try {
          const { data } = await supabase
            .from("gateway_settings")
            .select("gateway_name")
            .eq("active", true)
            .limit(1)
            .maybeSingle();
          if (data?.gateway_name) {
            const names: Record<string, string> = {
              blackcatpay: "BlackCatPay",
              ghostspay: "GhostsPay",
              duck: "Duck",
              hisounique: "Hiso Unique",
              paradise: "Paradise",
            };
            gatewayName = names[data.gateway_name] || data.gateway_name;
          }
        } catch {
          // ignore
        }
      }

      const config = getConfig(settings, kind);
      const variables = {
        customer_name: order.customer_name || "Cliente",
        total: formatCurrency(Number(order.total) || 0),
        gateway: gatewayName,
        product_title: order.product_title || "Produto",
      };

      const title = renderTemplate(config.title, variables);
      const body = renderTemplate(config.body, variables);
      const url = "/dashboard/orders";
      const tag = `${kind}-${order.id}`;

      playPresetSound(config.sound, config.soundUrl);
      showNativeNotification({ title, body, icon: config.icon, image: config.image, tag, url });

      toast.custom(
        () => (
          <div className="flex min-w-[320px] items-center gap-3 rounded-xl border border-border bg-background/95 px-4 py-3 text-foreground shadow-2xl backdrop-blur-xl">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
              {config.icon || config.image ? (
                <img
                  src={config.icon || config.image}
                  alt="Notificação"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : kind === "paid" ? (
                <DollarSign className="h-5 w-5 text-primary" />
              ) : (
                <Bell className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{body}</p>
            </div>
          </div>
        ),
        { duration: config.duration, position: "top-right" }
      );
    };

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await loadSettings(user.id);

      channel = supabase
        .channel(`admin-sale-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const order = payload.new as any;
            if (!order?.id || seenPendingIds.current.has(order.id)) return;
            seenPendingIds.current.add(order.id);
            void showDesktopAlert("pending", order);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const order = payload.new as any;
            const oldOrder = payload.old as any;
            if (!order?.id) return;
            if (order.payment_status !== "paid") return;
            if (oldOrder?.payment_status === "paid") return;
            if (seenPaidIds.current.has(order.id)) return;
            seenPaidIds.current.add(order.id);
            void showDesktopAlert("paid", order);
          }
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
