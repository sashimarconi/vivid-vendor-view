import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAID_STATUS_TOKENS = new Set([
  "paid", "approved", "completed", "complete", "success", "succeeded",
  "confirmed", "confirmado", "payment_received", "pix_paid", "received", "recebido",
]);

const PAID_EVENT_TOKENS = new Set([
  "payment.paid", "payment_paid", "payment_confirmed", "payment.confirmed",
  "payment_received", "payment.received", "payment_approved", "payment.approved",
  "transaction.paid", "transaction_paid", "pix_paid", "pix.received", "pix_received",
]);

function normalizeToken(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

// Coleta TODOS os identificadores possíveis para tentar match em qualquer um deles
function extractAllTransactionIds(body: any): string[] {
  const candidates = [
    body?.transactionId, body?.transaction_id, body?.Id, body?.id,
    body?.paymentId, body?.payment_id, body?.ExternalId, body?.external_id,
    body?.externalId, body?.store_reference, body?.storeReference, body?.reference,
    body?.data?.transactionId, body?.data?.transaction_id, body?.data?.id,
    body?.data?.paymentId, body?.data?.payment_id, body?.data?.external_id, body?.data?.externalId,
    body?.transaction?.id, body?.transaction?.transactionId, body?.transaction?.transaction_id,
    body?.payment?.id, body?.payment?.transactionId, body?.payment?.transaction_id,
    body?.charge?.id, body?.resource?.id, body?.data?.transaction?.id, body?.data?.payment?.id,
    body?.order?.id, body?.data?.order?.id,
  ];
  const out: string[] = [];
  for (const v of candidates) {
    if (typeof v === "string" && v.trim()) out.push(v.trim());
    else if (typeof v === "number" && Number.isFinite(v)) out.push(String(v));
  }
  return Array.from(new Set(out));
}

function extractTransactionId(body: any) {
  const ids = extractAllTransactionIds(body);
  return ids[0] ?? null;
}

function isPaidPayload(body: any) {
  const candidates = [
    body?.event, body?.type, body?.status, body?.Status,
    body?.payment_status, body?.paymentStatus, body?.transaction_status, body?.transactionStatus,
    body?.data?.event, body?.data?.type, body?.data?.status, body?.data?.Status,
    body?.data?.payment_status, body?.data?.paymentStatus, body?.data?.transaction_status, body?.data?.transactionStatus,
    body?.payment?.status, body?.transaction?.status, body?.transaction?.payment_status,
    body?.charge?.status, body?.pix?.status,
    body?.data?.payment?.status, body?.data?.transaction?.status, body?.data?.charge?.status, body?.data?.pix?.status,
  ].map(normalizeToken).filter(Boolean);

  return candidates.some((t) => PAID_EVENT_TOKENS.has(t) || PAID_STATUS_TOKENS.has(t));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function dispatchTikTokS2S(supabase: any, order: any) {
  try {
    const userId = order.user_id;
    if (!userId) return;

    // Busca pixels TikTok ATIVOS do dono da loja COM access_token (S2S exige token)
    const { data: pixels } = await supabase
      .from("tracking_pixels")
      .select("pixel_id, access_token, fire_on_paid_only")
      .eq("user_id", userId)
      .eq("platform", "tiktok")
      .eq("active", true);

    if (!pixels || pixels.length === 0) {
      console.log("[TikTok S2S] Nenhum pixel TikTok ativo para user", userId);
      return;
    }

    for (const pixel of pixels) {
      if (!pixel.access_token) {
        console.warn(`[TikTok S2S] Pixel ${pixel.pixel_id} sem access_token, pulando.`);
        continue;
      }

      const userData: Record<string, string> = {};
      if (order.customer_email) userData.email = await sha256Hex(order.customer_email);
      if (order.customer_phone) userData.phone = await sha256Hex(order.customer_phone);
      if (order.customer_ip) userData.ip = order.customer_ip;
      if (order.customer_user_agent) userData.user_agent = order.customer_user_agent;

      // event_id IGUAL ao do client-side pixel (order.id) → permite deduplicação no TikTok
      const body = {
        event_source: "web",
        event_source_id: pixel.pixel_id,
        data: [{
          event: "CompletePayment",
          event_time: Math.floor(Date.now() / 1000),
          event_id: order.id,
          user: userData,
          properties: {
            currency: "BRL",
            value: Number(order.total) || 0,
            content_type: "product",
            order_id: order.id,
            ...(order.product_id ? { content_id: order.product_id } : {}),
          },
          page: order.page_url ? { url: order.page_url } : undefined,
        }],
      };

      // Endpoint Events API v1.3 (atual e ativo)
      const resp = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": pixel.access_token,
        },
        body: JSON.stringify(body),
      });

      const result = await resp.json();
      if (resp.ok && result?.code === 0) {
        console.log(`[TikTok S2S] ✅ Pixel ${pixel.pixel_id} → CompletePayment enviado (event_id: ${order.id})`);
      } else {
        console.error(`[TikTok S2S] ❌ Pixel ${pixel.pixel_id} → erro`, JSON.stringify(result));
      }
    }
  } catch (err) {
    console.error("[TikTok S2S] Error:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const allIds = extractAllTransactionIds(body);
    const transactionId = allIds[0] ?? null;
    const isPaid = isPaidPayload(body);

    if (!transactionId) {
      console.error("Could not extract transaction ID:", JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: "Transaction ID not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Transaction candidates: ${JSON.stringify(allIds)}, isPaid: ${isPaid}`);

    if (isPaid) {
      const paidAt = new Date().toISOString();
      let order: any = null;
      let error: any = null;

      // Tenta match por transaction_id em qualquer um dos IDs candidatos
      for (const candidate of allIds) {
        const res = await supabase
          .from("orders")
          .update({ payment_status: "paid", paid_at: paidAt })
          .eq("transaction_id", candidate)
          .select("*")
          .maybeSingle();
        if (res.data) {
          order = res.data;
          error = null;
          console.log(`✅ Matched order by transaction_id=${candidate}`);
          break;
        }
        error = res.error;
      }

      // Fallback: tenta como UUID na coluna id
      if (!order) {
        for (const candidate of allIds) {
          if (!isUuid(candidate)) continue;
          const res = await supabase
            .from("orders")
            .update({ payment_status: "paid", paid_at: paidAt })
            .eq("id", candidate)
            .select("*")
            .maybeSingle();
          if (res.data) {
            order = res.data;
            error = null;
            console.log(`✅ Matched order by id (uuid)=${candidate}`);
            break;
          }
          error = res.error;
        }
      }

      if (error) {
        console.error("Error updating order:", error);
      } else if (order) {
        console.log(`Order ${order.id} marked as paid`);

        // Dispatch webhooks, push, utmify, and TikTok S2S in parallel
        const tasks: Promise<void>[] = [];

        // Webhook dispatch
        tasks.push(
          fetch(`${supabaseUrl}/functions/v1/dispatch-webhooks`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              event: "order_paid",
              payload: {
                order_id: order.id, transaction_id: transactionId,
                customer_name: order.customer_name, customer_email: order.customer_email,
                customer_phone: order.customer_phone, customer_document: order.customer_document,
                total: order.total, product_id: order.product_id,
                product_variant: order.product_variant, payment_method: order.payment_method,
                selected_bumps: order.selected_bumps,
              },
            }),
          }).then(() => {}).catch((e) => console.error("Webhook dispatch error:", e))
        );

        // Push notification - "Venda Aprovada"
        const totalFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.total));
        tasks.push(
          fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              title: `✅ Venda Aprovada`,
              body: `${order.customer_name} • ${totalFormatted}`,
               customer_name: order.customer_name,
               total_amount: Number(order.total),
               product_title: order.product_title,
               url: "/dashboard/orders",
              event_type: "order_paid",
              owner_user_id: order.user_id,
              tag: `order-paid-${order.id}`,
            }),
          }).then(() => {}).catch((e) => console.error("Push notification error:", e))
        );

        // Utmify
        tasks.push(
          fetch(`${supabaseUrl}/functions/v1/send-utmify-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({ order_id: order.id, status: "paid" }),
          }).then(() => {}).catch((e) => console.error("Utmify dispatch error:", e))
        );

        // TikTok S2S
        tasks.push(dispatchTikTokS2S(supabase, order));

        await Promise.allSettled(tasks);
      } else {
        console.warn(`No order matched transaction ${transactionId}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, transactionId, isPaid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
