// Edge function que faz proxy das operações de tracking_pixels.
// Existe para contornar bloqueadores (uBlock, Brave Shield, AdGuard DNS, Pi-hole etc)
// que bloqueiam requests diretos cujo path/body contém palavras como "tracking" ou "pixel".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identifica o usuário com o JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json();
    const action = body?.action as string;

    // Service role para fazer as operações garantindo isolamento por user_id manualmente
    const admin = createClient(supabaseUrl, serviceKey);

    switch (action) {
      case "list": {
        const { data, error } = await admin
          .from("tracking_pixels")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "create": {
        const payload = body.payload || {};
        const { data, error } = await admin
          .from("tracking_pixels")
          .insert({
            user_id: user.id,
            pixel_id: String(payload.pixel_id || "").trim(),
            name: payload.name?.trim() || null,
            platform: payload.platform || "tiktok",
            active: payload.active !== false,
            fire_on_paid_only: !!payload.fire_on_paid_only,
            access_token: payload.access_token?.trim() || null,
          })
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }
      case "update": {
        const { id, payload } = body;
        if (!id) return json({ error: "id required" }, 400);
        const { data, error } = await admin
          .from("tracking_pixels")
          .update({
            ...(payload.pixel_id !== undefined ? { pixel_id: payload.pixel_id } : {}),
            ...(payload.name !== undefined ? { name: payload.name } : {}),
            ...(payload.active !== undefined ? { active: payload.active } : {}),
            ...(payload.fire_on_paid_only !== undefined ? { fire_on_paid_only: payload.fire_on_paid_only } : {}),
            ...(payload.access_token !== undefined ? { access_token: payload.access_token } : {}),
          })
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }
      case "delete": {
        const { id } = body;
        if (!id) return json({ error: "id required" }, 400);
        const { error } = await admin
          .from("tracking_pixels")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        return json({ ok: true });
      }
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    console.error("[ad-integrations-manager]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
