import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotification, WebPushError, type PushSubscription } from "npm:web-push-neo@0.1.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

type NotificationSettingsRow = {
  user_id: string;
  push_enabled: boolean | null;
  notify_paid: boolean | null;
  notify_pending: boolean | null;
  mobile_enabled?: boolean | null;
  mobile_paid_title?: string | null;
  mobile_paid_body?: string | null;
  mobile_paid_icon_url?: string | null;
  mobile_paid_image_url?: string | null;
  mobile_pending_title?: string | null;
  mobile_pending_body?: string | null;
  mobile_pending_icon_url?: string | null;
  mobile_pending_image_url?: string | null;
};

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function renderTemplate(template: string | null | undefined, values: Record<string, string>) {
  return String(template || "")
    .replace(/\{\{\s*customer_name\s*\}\}/gi, values.customer_name || "Cliente")
    .replace(/\{\{\s*total\s*\}\}/gi, values.total || "R$ 0,00")
    .replace(/\{\{\s*gateway\s*\}\}/gi, values.gateway || "Gateway")
    .replace(/\{\{\s*product_title\s*\}\}/gi, values.product_title || "Produto");
}

function buildPayload(input: {
  eventType?: string;
  body: any;
  settings?: NotificationSettingsRow;
}) {
  const { eventType, body, settings } = input;
  const isPaid = eventType === "order_paid";
  const titleTemplate = isPaid
    ? settings?.mobile_paid_title || body.title || "✅ Venda aprovada"
    : settings?.mobile_pending_title || body.title || "🔔 Venda pendente";
  const bodyTemplate = isPaid
    ? settings?.mobile_paid_body || body.body || "{{customer_name}} • {{total}}"
    : settings?.mobile_pending_body || body.body || "PIX gerado • {{customer_name}} • {{total}}";
  const icon = isPaid
    ? settings?.mobile_paid_icon_url || body.icon || null
    : settings?.mobile_pending_icon_url || body.icon || null;
  const image = isPaid
    ? settings?.mobile_paid_image_url || body.image || null
    : settings?.mobile_pending_image_url || body.image || null;

  const gatewayName = body.gateway_name || body.gateway || "Gateway";
  const total = body.total_amount ?? body.total ?? body.amount ?? 0;
  const variables = {
    customer_name: body.customer_name || body.customerName || "Cliente",
    total: formatCurrency(total),
    gateway: String(gatewayName),
    product_title: body.product_title || body.productTitle || "Produto",
  };

  return {
    title: renderTemplate(titleTemplate, variables),
    body: renderTemplate(bodyTemplate, variables),
    icon: icon || "/icon-192.png",
    badge: body.badge || icon || "/icon-192.png",
    image: image || undefined,
    url: body.url || "/dashboard/orders",
    tag: body.tag || `${isPaid ? "paid" : "pending"}-${Date.now()}`,
    event_type: eventType || body.event_type || null,
    customer_name: variables.customer_name,
    total: variables.total,
    gateway: variables.gateway,
    product_title: variables.product_title,
  };
}

async function sendPush(subscription: SubscriptionRow, payload: Record<string, unknown>, vapidPublicKey: string, vapidPrivateKey: string) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  } satisfies PushSubscription;

  const result = await sendNotification(pushSubscription, JSON.stringify(payload), {
    TTL: 86400,
    urgency: "high",
    topic: String(payload.tag || "sale").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || undefined,
    signal: AbortSignal.timeout(8000),
    vapidDetails: {
      subject: "mailto:admin@ttkcompras.com",
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    },
  });

  return { status: result.statusCode, ok: result.statusCode >= 200 && result.statusCode < 300, body: result.body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const requestBody = await req.json();
    const { event_type, user_id, owner_user_id } = requestBody;

    // owner_user_id = dono do pedido (deve receber a notificação).
    // Fallback para user_id por compatibilidade.
    const targetUserId = owner_user_id || user_id || null;

    // Get push subscriptions APENAS do dono do pedido
    let query = supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id");
    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }
    const { data: subscriptions, error } = await query;

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter subscriptions by notification preferences
    const userIds = [...new Set(subscriptions.map((s) => s.user_id))];
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("user_id, push_enabled, notify_paid, notify_pending, mobile_enabled, mobile_paid_title, mobile_paid_body, mobile_paid_icon_url, mobile_paid_image_url, mobile_pending_title, mobile_pending_body, mobile_pending_icon_url, mobile_pending_image_url")
      .in("user_id", userIds);

    const settingsMap = new Map(
      (settings || []).map((s) => [s.user_id, s])
    );

    const filteredSubs = subscriptions.filter((sub) => {
      const prefs = settingsMap.get(sub.user_id);
      const pushEnabled = prefs ? (prefs.push_enabled ?? prefs.mobile_enabled ?? true) : true;
      const notifyPaid = prefs ? prefs.notify_paid : true;
      const notifyPending = prefs ? prefs.notify_pending : true;

      if (!pushEnabled) return false;
      if (event_type === "order_paid" && !notifyPaid) return false;
      if (event_type === "order_pending" && !notifyPending) return false;
      return true;
    });

    const results = await Promise.allSettled(
      filteredSubs.map((sub) => {
        const prefs = settingsMap.get(sub.user_id);
        const payload = buildPayload({ eventType: event_type, body: requestBody, settings: prefs });
        return sendPush(sub, payload, vapidPublicKey, vapidPrivateKey);
      })
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled" && (result.value.status === 404 || result.value.status === 410)) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", filteredSubs[i].endpoint);
        continue;
      }

      if (result.status === "rejected") {
        const error = result.reason;
        if (error instanceof WebPushError) {
          console.error("Push delivery failed", {
            endpoint: filteredSubs[i]?.endpoint,
            statusCode: error.statusCode,
            body: error.body,
          });

          if (error.statusCode === 404 || error.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", filteredSubs[i].endpoint);
          }
        } else {
          console.error("Unexpected push error", error);
        }
      }
    }

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok
    ).length;

    console.log(`Push notifications sent: ${sent}/${filteredSubs.length} (${subscriptions.length} total subs)`);

    return new Response(JSON.stringify({ sent, total: filteredSubs.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
