import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XTRACKY_API_URL = "https://api.xtracky.com/api/integrations/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token || token !== serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, status } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total, payment_status, utm_params, customer_name, customer_email, customer_phone")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.user_id) {
      return new Response(JSON.stringify({ error: "Order has no user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("xtracky_settings")
      .select("api_token, active")
      .eq("user_id", order.user_id)
      .eq("active", true)
      .maybeSingle();

    if (!settings?.api_token) {
      console.log("No active Xtracky settings for user:", order.user_id);
      return new Response(JSON.stringify({ skipped: true, reason: "No active Xtracky config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusMap: Record<string, string> = {
      pending: "waiting_payment",
      waiting_payment: "waiting_payment",
      paid: "paid",
    };
    const xtrackyStatus = statusMap[status || order.payment_status] || "waiting_payment";

    const amountInCents = Math.round(Number(order.total) * 100);

    // Xtracky exige o CLICK ID no utm_source (formato TT-xxxx, ou o sck/ttclid)
    // O TikTok Ads sobrescreve utm_source com "tiktok" genérico, perdendo a atribuição.
    // Prioridade: src (click id explícito) > utm_source se já for click id (TT-/FB-/etc)
    //            > sck > ttclid > fbclid > gclid > utm_source genérico (último recurso)
    const u = order.utm_params || {};
    const rawUtmSource = typeof u.utm_source === "string" ? u.utm_source.trim() : "";
    const isClickId = (v: unknown) =>
      typeof v === "string" && /^(TT|FB|GG|TW|KW|TB|XT)-/i.test(v.trim());

    let normalizedUtmSource = "";
    if (typeof u.src === "string" && u.src.trim()) {
      normalizedUtmSource = u.src.trim();
    } else if (isClickId(rawUtmSource)) {
      normalizedUtmSource = rawUtmSource;
    } else if (typeof u.sck === "string" && u.sck.trim()) {
      normalizedUtmSource = u.sck.trim();
    } else if (typeof u.ttclid === "string" && u.ttclid.trim()) {
      normalizedUtmSource = u.ttclid.trim();
    } else if (typeof u.fbclid === "string" && u.fbclid.trim()) {
      normalizedUtmSource = u.fbclid.trim();
    } else if (typeof u.gclid === "string" && u.gclid.trim()) {
      normalizedUtmSource = u.gclid.trim();
    } else {
      normalizedUtmSource = rawUtmSource;
    }

    const payload = {
      orderId: order.id,
      amount: amountInCents,
      status: xtrackyStatus,
      utm_source: normalizedUtmSource,
      leadName: order.customer_name ?? undefined,
      leadEmail: order.customer_email ?? undefined,
      leadPhone: order.customer_phone ?? undefined,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.api_token}`,
      "X-API-Token": settings.api_token,
    };

    console.log("Sending to Xtracky:", JSON.stringify(payload));

    const xtrackyResponse = await fetch(XTRACKY_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await xtrackyResponse.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!xtrackyResponse.ok) {
      console.error("Xtracky API error:", xtrackyResponse.status, data);
      return new Response(JSON.stringify({ error: "Xtracky API error", status: xtrackyResponse.status, details: data }), {
        status: xtrackyResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Xtracky response:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
