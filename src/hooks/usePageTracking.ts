import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

function getSessionId() {
  let sid = sessionStorage.getItem("visitor_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("visitor_session_id", sid);
  }
  return sid;
}

interface GeoData {
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

let cachedGeo: GeoData | null = null;
let geoPromise: Promise<GeoData | null> | null = null;

// Multiple providers for redundancy — if one fails or is rate-limited, fall back to next.
// All free, no API key, CORS-enabled. Names are neutral to avoid ad-blockers.
const GEO_PROVIDERS: Array<{ url: string; parse: (d: any) => GeoData | null }> = [
  {
    url: "https://get.geojs.io/v1/ip/geo.json",
    parse: (d) => d?.country ? {
      city: d.city || "",
      region: d.region || "",
      country: d.country || "",
      latitude: parseFloat(d.latitude) || 0,
      longitude: parseFloat(d.longitude) || 0,
    } : null,
  },
  {
    url: "https://ipwho.is/",
    parse: (d) => d?.success !== false && d?.country ? {
      city: d.city || "",
      region: d.region || "",
      country: d.country || "",
      latitude: d.latitude || 0,
      longitude: d.longitude || 0,
    } : null,
  },
  {
    url: "https://ipapi.co/json/",
    parse: (d) => d?.country_name ? {
      city: d.city || "",
      region: d.region || "",
      country: d.country_name || "",
      latitude: d.latitude || 0,
      longitude: d.longitude || 0,
    } : null,
  },
];

async function fetchGeoOnce(): Promise<GeoData | null> {
  if (cachedGeo) return cachedGeo;
  if (geoPromise) return geoPromise;

  geoPromise = (async () => {
    for (const provider of GEO_PROVIDERS) {
      try {
        const res = await fetch(provider.url, { signal: AbortSignal.timeout(3500) });
        if (!res.ok) continue;
        const data = await res.json();
        const geo = provider.parse(data);
        if (geo && geo.country) {
          cachedGeo = geo;
          console.log("[Tracking] geo resolved via", provider.url, geo.country, geo.city);
          return cachedGeo;
        }
      } catch (e) {
        console.warn("[Tracking] geo provider failed:", provider.url);
      }
    }
    console.warn("[Tracking] all geo providers failed");
    return null;
  })();

  return geoPromise;
}

/**
 * Track a page view. Pass the tenant's user_id directly.
 * When userId is provided, tracking fires immediately.
 */
export function usePageTracking(eventType: string = "page_view", userId?: string | null, metadata?: Record<string, unknown>) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || !userId) return;
    tracked.current = true;

    const sessionId = getSessionId();
    const pageUrl = window.location.pathname;

    // 1) Registra evento da página imediatamente
    supabase.from("page_events").insert({
      event_type: eventType,
      page_url: pageUrl,
      session_id: sessionId,
      metadata: metadata || {},
      user_id: userId,
    } as any).then(({ error }) => {
      if (error) console.error("[Tracking] page_events insert error:", error.message);
    });

    // 2) Marca presença IMEDIATAMENTE (sem esperar geo) para o Radar contar o visitante já
    supabase.from("visitor_sessions").upsert(
      { session_id: sessionId, last_seen_at: new Date().toISOString(), page_url: pageUrl, user_id: userId },
      { onConflict: "session_id" }
    ).then(({ error }) => {
      if (error) console.error("[Tracking] visitor_sessions presence upsert error:", error.message);
    });

    // 3) Em paralelo, busca geo e enriquece o registro quando disponível
    fetchGeoOnce().then(geo => {
      if (!geo) return;
      supabase.from("visitor_sessions").upsert(
        {
          session_id: sessionId,
          last_seen_at: new Date().toISOString(),
          page_url: pageUrl,
          user_id: userId,
          city: geo.city,
          region: geo.region,
          country: geo.country,
          latitude: geo.latitude,
          longitude: geo.longitude,
        },
        { onConflict: "session_id" }
      ).then(({ error }) => {
        if (error) console.error("[Tracking] visitor_sessions geo upsert error:", error.message);
      });
    });
  }, [eventType, userId, metadata]);
}

export function trackEvent(eventType: string, userId?: string | null, metadata?: Record<string, unknown>) {
  const sessionId = getSessionId();
  return supabase.from("page_events").insert({
    event_type: eventType,
    page_url: window.location.pathname,
    session_id: sessionId,
    metadata: metadata || {},
    ...(userId ? { user_id: userId } : {}),
  } as any);
}

// Heartbeat to keep session alive
export function useVisitorHeartbeat(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    const sessionId = getSessionId();

    const beat = () => {
      supabase.from("visitor_sessions").upsert(
        { session_id: sessionId, last_seen_at: new Date().toISOString(), page_url: window.location.pathname, user_id: userId },
        { onConflict: "session_id" }
      ).then();
    };

    // batida imediata + intervalo curto para o "ao vivo" não cair por causa de 1 batida atrasada
    beat();
    const interval = setInterval(beat, 8000);

    // refaz a batida ao voltar foco / ficar visível (mobile economiza energia)
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", beat);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", beat);
    };
  }, [userId]);
}
