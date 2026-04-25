import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  orderId: z.string().uuid(),
  slug: z.string().min(1).max(255),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { orderId, slug } = parsed.data;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_status, product_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("check-order-status order error:", orderError);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order?.product_id) {
      return new Response(
        JSON.stringify({ found: false, paymentStatus: null, thankYouUrl: null }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("slug, thank_you_url")
      .eq("id", order.product_id)
      .maybeSingle();

    if (productError) {
      console.error("check-order-status product error:", productError);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar produto" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!product || product.slug !== slug) {
      return new Response(
        JSON.stringify({ found: false, paymentStatus: null, thankYouUrl: null }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        found: true,
        paymentStatus: order.payment_status,
        thankYouUrl: product.thank_you_url || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-order-status unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});