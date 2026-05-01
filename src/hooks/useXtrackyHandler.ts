import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Injeta o script utm-handler da Xtracky em qualquer página do funil
 * (produto, checkout, vitrine) do lojista que tiver Xtracky ativa.
 *
 * Usa a RPC pública `get_xtracky_token`, pois visitantes anônimos não têm
 * permissão para ler `xtracky_settings` diretamente via RLS.
 */
export function useXtrackyHandler(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const SCRIPT_ID = "xtracky-utm-handler";

    (async () => {
      const { data, error } = await supabase.rpc("get_xtracky_token" as any, {
        _user_id: userId,
      });

      if (cancelled) return;
      if (error) {
        console.warn("[Xtracky] erro ao buscar token:", error.message);
        return;
      }

      const token = typeof data === "string" ? data : null;
      if (!token) return;
      if (document.getElementById(SCRIPT_ID)) return;

      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://cdn.jsdelivr.net/gh/xTracky/static@latest/utm-handler.js";
      s.setAttribute("data-token", token);
      s.async = true;
      document.head.appendChild(s);
      console.log("[Xtracky] script injetado para user", userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
