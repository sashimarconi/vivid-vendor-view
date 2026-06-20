import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const XTRACKY_API_URL = "https://api.xtracky.com/api/integrations/api";

function resolveXtrackyUtmSource(payload: any): string {
  const u = payload?.utm_params || {};
  const isClickId = (v: unknown) =>
    typeof v === "string" && /^(TT|FB|GG|TW|KW|TB|XT)-/i.test(v.trim());
  const rawUtm = typeof u.utm_source === "string" ? u.utm_source.trim()
    : (typeof payload?.utm_source === "string" ? payload.utm_source.trim() : "");
  if (typeof u.src === "string" && u.src.trim()) return u.src.trim();
  if (isClickId(rawUtm)) return rawUtm;
  if (typeof u.sck === "string" && u.sck.trim()) return u.sck.trim();
  if (typeof u.ttclid === "string" && u.ttclid.trim()) return u.ttclid.trim();
  if (typeof u.fbclid === "string" && u.fbclid.trim()) return u.fbclid.trim();
  if (typeof u.gclid === "string" && u.gclid.trim()) return u.gclid.trim();
  return rawUtm;
}

function buildWebhookBody(wh: any, event: string, payload: any) {
  if (wh.url.startsWith(XTRACKY_API_URL) && ["order_created", "order_paid"].includes(event)) {
    return JSON.stringify({
      orderId: payload.order_id || payload.id,
      amount: Math.round(Number(payload.total ?? payload.amount ?? 0) * 100),
      status: event === "order_paid" ? "paid" : "waiting_payment",
      utm_source: resolveXtrackyUtmSource(payload),
    });
  }

  return JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });
}

Deno.serve(async (req) => {
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { event, payload, owner_user_id } = await req.json();
    if (!event || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing event or payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Dispatching webhook event: ${event}`);

    // Get all active webhooks that listen to this event
    let query = supabase
      .from("webhooks")
      .select("*")
      .eq("active", true);

    if (owner_user_id) {
      query = query.eq("user_id", owner_user_id);
    }

    const { data: webhooks, error } = await query;

    if (error) {
      console.error("Error fetching webhooks:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhooks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matching = (webhooks || []).filter((wh: any) => {
      const events = Array.isArray(wh.events) ? wh.events : [];
      return events.includes(event);
    });

    console.log(`Found ${matching.length} webhooks for event ${event}`);

    // Fire all webhooks in parallel (fire-and-forget style, but we await)
    const results = await Promise.allSettled(
      matching.map(async (wh: any) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (wh.secret_key) {
          headers["X-Webhook-Secret"] = wh.secret_key;
        }

        const body = buildWebhookBody(wh, event, payload);

        const response = await fetch(wh.url, {
          method: "POST",
          headers,
          body,
        });

        console.log(`Webhook ${wh.name} (${wh.url}): ${response.status}`);
        return { id: wh.id, name: wh.name, status: response.status };
      })
    );

    const summary = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { id: matching[i]?.id, name: matching[i]?.name, error: String(r.reason) };
    });

    return new Response(
      JSON.stringify({ success: true, event, dispatched: summary.length, results: summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Dispatch error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
