import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Injeta o script utm-handler da Xtracky no checkout do lojista
 * que tiver Xtracky ativa. O script captura UTMs da URL e mantém
 * persistência para que apareçam no momento da compra.
 */
export function useXtrackyHandler(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const SCRIPT_ID = "xtracky-utm-handler";

    (async () => {
      const { data } = await supabase
        .from("xtracky_settings" as any)
        .select("api_token, active")
        .eq("user_id", userId)
        .eq("active", true)
        .maybeSingle();

      if (cancelled) return;
      const token = (data as any)?.api_token;
      if (!token) return;
      if (document.getElementById(SCRIPT_ID)) return;

      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://cdn.jsdelivr.net/gh/xTracky/static@latest/utm-handler.js";
      s.setAttribute("data-token", token);
      s.async = true;
      document.head.appendChild(s);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
