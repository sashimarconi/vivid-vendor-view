import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UTMIFY_API_URL = "https://api.utmify.com.br/api-credentials/orders";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, status } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch order with product info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, products(id, title, sale_price, slug), utm_params")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's utmify settings
    if (!order.user_id) {
      return new Response(JSON.stringify({ error: "Order has no user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: utmifySettings, error: settingsError } = await supabase
      .from("utmify_settings")
      .select("*")
      .eq("user_id", order.user_id)
      .eq("active", true)
      .maybeSingle();

    if (settingsError || !utmifySettings) {
      console.log("No active Utmify settings for user:", order.user_id);
      return new Response(JSON.stringify({ skipped: true, reason: "No active Utmify config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map order status to Utmify status
    const statusMap: Record<string, string> = {
      pending: "waiting_payment",
      paid: "paid",
      refunded: "refunded",
      chargedback: "chargedback",
      refused: "refused",
    };

    const utmifyStatus = statusMap[status || order.payment_status] || "waiting_payment";
    const createdAtUTC = new Date(order.created_at).toISOString().replace("T", " ").substring(0, 19);
    const approvedDate = utmifyStatus === "paid" 
      ? new Date(order.updated_at).toISOString().replace("T", " ").substring(0, 19) 
      : null;
    const refundedAt = utmifyStatus === "refunded" 
      ? new Date(order.updated_at).toISOString().replace("T", " ").substring(0, 19) 
      : null;

    const totalInCents = Math.round(Number(order.total) * 100);
    const product = order.products;

    // Get user's plan for fee calculation
    const { data: userPlan } = await supabase
      .from("user_plans")
      .select("transaction_fee_percent")
      .eq("user_id", order.user_id)
      .single();

    const feePercent = userPlan?.transaction_fee_percent || 2.5;
    const gatewayFeeInCents = Math.round(totalInCents * (feePercent / 100));
    const userCommissionInCents = totalInCents - gatewayFeeInCents;

    const payload = {
      orderId: order.id,
      platform: utmifySettings.platform_name || "VoidTok",
      paymentMethod: order.payment_method === "pix" ? "pix" : "credit_card",
      status: utmifyStatus,
      createdAt: createdAtUTC,
      approvedDate,
      refundedAt,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone || null,
        document: order.customer_document || null,
        country: "BR",
      },
      products: [
        {
          id: product?.id || order.product_id || order.id,
          name: product?.title || "Produto",
          planId: null,
          planName: null,
          quantity: order.quantity || 1,
          priceInCents: product ? Math.round(Number(product.sale_price) * 100) : totalInCents,
        },
      ],
      trackingParameters: {
        src: order.utm_params?.src || null,
        sck: order.utm_params?.sck || null,
        utm_source: order.utm_params?.utm_source || null,
        utm_campaign: order.utm_params?.utm_campaign || null,
        utm_medium: order.utm_params?.utm_medium || null,
        utm_content: order.utm_params?.utm_content || null,
        utm_term: order.utm_params?.utm_term || null,
      },
      commission: {
        totalPriceInCents: totalInCents,
        gatewayFeeInCents,
        userCommissionInCents,
      },
    };

    console.log("Sending to Utmify:", JSON.stringify(payload));

    const utmifyResponse = await fetch(UTMIFY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": utmifySettings.api_token,
      },
      body: JSON.stringify(payload),
    });

    const utmifyData = await utmifyResponse.json();

    if (!utmifyResponse.ok) {
      console.error("Utmify API error:", utmifyResponse.status, utmifyData);
      return new Response(JSON.stringify({ error: "Utmify API error", details: utmifyData }), {
        status: utmifyResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Utmify response:", utmifyData);

    return new Response(JSON.stringify({ success: true, data: utmifyData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
