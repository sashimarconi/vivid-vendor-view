import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Percent, ShoppingCart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import LiveGlobe from "@/components/admin/live-view/LiveGlobe";
import AnimatedFunnel from "@/components/admin/live-view/AnimatedFunnel";
import ClientBehavior from "@/components/admin/live-view/ClientBehavior";
import SessionsByLocation from "@/components/admin/live-view/SessionsByLocation";
import PagesVisited from "@/components/admin/live-view/PagesVisited";
import LiveSessionsDebug from "@/components/admin/live-view/LiveSessionsDebug";

const SAO_PAULO_TZ = "America/Sao_Paulo";

const getSaoPauloDateParts = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
};

const getSaoPauloDayStartIso = (date: Date) => {
  const { year, month, day } = getSaoPauloDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0)).toISOString();
};

const getSaoPauloDateKey = (date: Date) => {
  const { year, month, day } = getSaoPauloDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const getSaoPauloHour = (value: string) => getSaoPauloDateParts(new Date(value)).hour;

const createHourlyBuckets = () => Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}h`,
  value: 0,
}));

const dedupeSessions = <T extends { session_id: string }>(items: T[]) => {
  const unique = new Map<string, T>();
  items.forEach((item) => {
    if (!unique.has(item.session_id)) unique.set(item.session_id, item);
  });
  return Array.from(unique.values());
};

interface SessionData {
  session_id: string;
  page_url: string | null;
  last_seen_at: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface LiveStats {
  visitors: number;
  revenue: number;
  orders: number;
  paidOrders: number;
  pendingOrders: number;
  conversionRate: number;
  avgTicket: number;
}

interface FinancialSummaryRow {
  gross_revenue: number | string | null;
  total_orders_paid: number | null;
}

const AdminLiveView = () => {
  const [stats, setStats] = useState<LiveStats>({
    visitors: 0, revenue: 0, orders: 0, paidOrders: 0, pendingOrders: 0, conversionRate: 0, avgTicket: 0,
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [todaySessions, setTodaySessions] = useState<{ session_id: string; city?: string | null; region?: string | null; country?: string | null }[]>([]);
  const [todayEvents, setTodayEvents] = useState<{ event_type: string; page_url: string | null; created_at: string }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; value: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ label: string; value: number; pct: number }[]>([]);
  const [behavior, setBehavior] = useState({ activeCarts: 0, inCheckout: 0, purchased: 0 });
  const fastRequestRef = useRef(0);
  const slowRequestRef = useRef(0);
  const fastInFlightRef = useRef(false);
  const slowInFlightRef = useRef(false);

  const fetchAll = useCallback(async <T,>(
    build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: { message?: string } | null }>,
    maxPages = 50,
  ): Promise<T[]> => {
    const pageSize = 1000;
    let from = 0;
    const all: T[] = [];

    for (let i = 0; i < maxPages; i++) {
      const response = await build(from, from + pageSize - 1);
      if (response.error) throw new Error(response.error.message || "Erro ao buscar dados");

      const batch = response.data || [];
      if (batch.length === 0) break;

      all.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    return all;
  }, []);

  const fetchOverview = useCallback(async () => {
    if (fastInFlightRef.current) return;
    fastInFlightRef.current = true;

    const requestId = ++fastRequestRef.current;
    try {
      const now = new Date();
      // Janela "ao vivo" agressiva (20s): saída do visitante reflete em segundos.
      // Heartbeat é a cada 5s + expiração ativa em pagehide/visibility hidden.
      const liveCutoff = new Date(now.getTime() - 20 * 1000).toISOString();
      const eventLiveCutoff = new Date(now.getTime() - 20 * 1000).toISOString();
      const todayStart = getSaoPauloDayStartIso(now);
      const todayDate = getSaoPauloDateKey(now);

      const settled = await Promise.allSettled([
          supabase
            .from("visitor_sessions")
            .select("session_id, page_url, last_seen_at, city, region, country, latitude, longitude")
            .gte("last_seen_at", liveCutoff)
            .order("last_seen_at", { ascending: false }),
          supabase
            .from("page_events")
            .select("session_id, page_url, created_at")
            .gte("created_at", eventLiveCutoff)
            .order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .gte("created_at", todayStart),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("payment_status", "pending")
            .gte("created_at", todayStart),
          supabase
            .from("page_events")
            .select("id", { count: "exact", head: true })
            .eq("event_type", "page_view")
            .gte("created_at", todayStart),
          supabase
            .from("page_events")
            .select("id", { count: "exact", head: true })
            .eq("event_type", "checkout_view")
            .gte("created_at", todayStart),
          supabase.rpc("user_financial_summary", { _start: todayDate, _end: todayDate }),
          fetchAll<{ total: number | string; paid_at: string | null; created_at: string }>((f, t) =>
            supabase
              .from("orders")
              .select("total, paid_at, created_at")
              .in("payment_status", ["paid", "approved"])
              .gte("paid_at", todayStart)
              .order("paid_at", { ascending: true })
              .range(f, t) as unknown as PromiseLike<{ data: { total: number | string; paid_at: string | null; created_at: string }[] | null; error?: { message?: string } | null }>
          ),
      ]);

      if (requestId !== fastRequestRef.current) return;

      const pick = <T,>(idx: number): T | null => {
        const r = settled[idx];
        if (r.status !== "fulfilled") {
          console.warn("[radar] query falhou (idx=" + idx + ")", r.reason);
          return null;
        }
        const val = r.value as { data?: T; error?: { message?: string } | null; count?: number | null } | T;
        if ((val as { error?: { message?: string } | null })?.error) {
          console.warn("[radar] erro de retorno (idx=" + idx + ")", (val as { error: { message?: string } }).error);
        }
        return val as T;
      };

      const liveSessionsRes = pick<{ data: SessionData[] | null; error: { message?: string } | null }>(0);
      const liveEventSessionsRes = pick<{ data: { session_id: string; page_url: string | null }[] | null; error: { message?: string } | null }>(1);
      const ordersCountRes = pick<{ count: number | null; error: { message?: string } | null }>(2);
      const pendingOrdersCountRes = pick<{ count: number | null; error: { message?: string } | null }>(3);
      const pageViewsCountRes = pick<{ count: number | null; error: { message?: string } | null }>(4);
      const checkoutViewsCountRes = pick<{ count: number | null; error: { message?: string } | null }>(5);
      const financialSummaryRes = pick<{ data: FinancialSummaryRow[] | null; error: { message?: string } | null }>(6);
      const paidOrdersRows = (settled[7].status === "fulfilled" ? (settled[7].value as { total: number | string; paid_at: string | null; created_at: string }[]) : null);

      if (liveSessionsRes?.data) {
        const sessionsArr = dedupeSessions((liveSessionsRes.data || []) as SessionData[]);
        const sessionMap = new Map<string, SessionData>();
        sessionsArr.forEach((s) => sessionMap.set(s.session_id, s));
        const eventOnlySessions = new Set<string>();
        const checkoutLiveSessions = new Set<string>();
        ((liveEventSessionsRes?.data || []) as { session_id: string; page_url: string | null }[]).forEach((ev) => {
          if (!ev.session_id) return;
          if (!sessionMap.has(ev.session_id)) eventOnlySessions.add(ev.session_id);
          if ((sessionMap.get(ev.session_id)?.page_url || ev.page_url || "").includes("/checkout")) {
            checkoutLiveSessions.add(ev.session_id);
          }
        });
        sessionsArr.forEach((session) => {
          if ((session.page_url || "").includes("/checkout")) checkoutLiveSessions.add(session.session_id);
        });

        const liveVisitorsCount = sessionMap.size + eventOnlySessions.size;
        const checkoutActiveLive = checkoutLiveSessions.size;
        const onStoreLive = liveVisitorsCount - checkoutActiveLive;

        setSessions(sessionsArr);
        setBehavior((prev) => ({
          activeCarts: Math.max(0, onStoreLive),
          inCheckout: checkoutActiveLive,
          purchased: prev.purchased,
        }));
        setStats((prev) => ({ ...prev, visitors: liveVisitorsCount }));
      }

      setStats((prev) => {
        const next = { ...prev };
        const ordersCount = ordersCountRes?.count ?? prev.orders;
        const pendingOrdersCount = pendingOrdersCountRes?.count ?? prev.pendingOrders;
        const financialSummary = (financialSummaryRes?.data?.[0] || null) as FinancialSummaryRow | null;
        const revenue = financialSummary ? Number(financialSummary.gross_revenue ?? 0) : prev.revenue;
        const paidOrdersCount = financialSummary ? Number(financialSummary.total_orders_paid ?? 0) : prev.paidOrders;

        next.orders = ordersCount;
        next.pendingOrders = pendingOrdersCount;
        next.revenue = revenue;
        next.paidOrders = paidOrdersCount;
        next.conversionRate = ordersCount > 0 ? (paidOrdersCount / ordersCount) * 100 : 0;
        next.avgTicket = paidOrdersCount > 0 ? revenue / paidOrdersCount : 0;
        return next;
      });

      if (financialSummaryRes?.data) {
        setBehavior((prev) => ({ ...prev, purchased: Number(financialSummaryRes.data?.[0]?.total_orders_paid ?? prev.purchased) }));
      }

      if (paidOrdersRows) {
        const hours = createHourlyBuckets();
        paidOrdersRows.forEach((order) => {
          const paidAt = order.paid_at || order.created_at;
          const hour = getSaoPauloHour(paidAt);
          hours[hour].value += Number(order.total);
        });
        setHourlyData(hours);
      }

      const pageViewsCount = pageViewsCountRes?.count ?? null;
      const checkoutViewsCount = checkoutViewsCountRes?.count ?? null;
      if (pageViewsCount !== null && checkoutViewsCount !== null && ordersCountRes?.count !== undefined) {
        const ordersCount = ordersCountRes?.count ?? 0;
        const paidOrdersCount = Number(financialSummaryRes?.data?.[0]?.total_orders_paid ?? 0);
        const funnelBase = Math.max(pageViewsCount, 1);
        setFunnelData([
          { label: "Acessos", value: pageViewsCount, pct: pageViewsCount > 0 ? 100 : 0 },
          { label: "Checkout", value: checkoutViewsCount, pct: Math.round((checkoutViewsCount / funnelBase) * 100) },
          { label: "PIX Gerado", value: ordersCount, pct: Math.round((ordersCount / funnelBase) * 100) },
          { label: "Pagos", value: paidOrdersCount, pct: Math.round((paidOrdersCount / funnelBase) * 100) },
        ]);
      }
    } catch (error) {
      console.error("Erro ao atualizar KPIs do radar", error);
    } finally {
      fastInFlightRef.current = false;
    }
  }, [fetchAll]);

  const fetchSupportingData = useCallback(async () => {
    if (slowInFlightRef.current) return;
    slowInFlightRef.current = true;

    const requestId = ++slowRequestRef.current;
    const now = new Date();
    const todayStart = getSaoPauloDayStartIso(now);

    try {
      const [eventsRows, todaySessionRows] = await Promise.all([
        fetchAll<{ event_type: string; page_url: string | null; created_at: string }>((f, t) =>
          supabase
            .from("page_events")
            .select("event_type, page_url, created_at")
            .eq("event_type", "page_view")
            .gte("created_at", todayStart)
            .order("created_at", { ascending: false })
            .range(f, t) as unknown as PromiseLike<{ data: { event_type: string; page_url: string | null; created_at: string }[] | null; error?: { message?: string } | null }>
        ),
        fetchAll<{ session_id: string; city?: string | null; region?: string | null; country?: string | null }>((f, t) =>
          supabase
            .from("visitor_sessions")
            .select("session_id, city, region, country")
            .gte("last_seen_at", todayStart)
            .order("last_seen_at", { ascending: false })
            .range(f, t) as unknown as PromiseLike<{ data: { session_id: string; city?: string | null; region?: string | null; country?: string | null }[] | null; error?: { message?: string } | null }>
        ),
      ]);

      if (requestId !== slowRequestRef.current) return;

      setTodayEvents(eventsRows);
      setTodaySessions(dedupeSessions(todaySessionRows));
    } catch (error) {
      console.error("Erro ao atualizar listas do radar", error);
    } finally {
      slowInFlightRef.current = false;
    }
  }, [fetchAll]);

  useEffect(() => {
    fetchOverview();
    fetchSupportingData();

    const fastInterval = setInterval(fetchOverview, 2000);
    const slowInterval = setInterval(fetchSupportingData, 60000);

    return () => {
      clearInterval(fastInterval);
      clearInterval(slowInterval);
    };
  }, [fetchOverview, fetchSupportingData]);

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatCompact = (v: number): string => {
    if (v < 1000) return String(v);
    if (v < 1_000_000) {
      const k = v / 1000;
      return `${(Math.floor(k * 10) / 10).toString().replace(".", ",")}k`;
    }
    const m = v / 1_000_000;
    return `${(Math.floor(m * 10) / 10).toString().replace(".", ",")}M`;
  };

  const kpiCards = [
    { label: "Visitantes", value: formatCompact(stats.visitors), icon: Users, colSpan: "" },
    { label: "Ticket médio", value: formatCurrency(stats.avgTicket), icon: DollarSign, colSpan: "" },
    { label: "Pedidos", value: formatCompact(stats.orders), icon: ShoppingCart, colSpan: "" },
    { label: "Pagos", value: formatCompact(stats.paidOrders), icon: ShoppingCart, colSpan: "", valueClass: "text-emerald-400" },
    { label: "Pendentes", value: formatCompact(stats.pendingOrders), icon: ShoppingCart, colSpan: "", valueClass: "text-amber-400" },
    { label: "Conversão", value: `${stats.conversionRate.toFixed(1)}%`, icon: Percent, colSpan: "" },
    { label: "Vendas (hoje)", value: formatCurrency(stats.revenue), icon: DollarSign, colSpan: "col-span-2", highlight: true },
  ];

  const headingFont = { fontFamily: "'Space Grotesk', system-ui, sans-serif" };
  const bodyFont = { fontFamily: "'DM Sans', system-ui, sans-serif" };

  return (
    <div className="relative space-y-6" style={bodyFont}>
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[#2dd4a8]/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-32 h-[420px] w-[420px] rounded-full bg-[#73ffb8]/8 blur-[160px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,#73ffb8_1px,transparent_1px),linear-gradient(to_bottom,#73ffb8_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#2dd4a8]/15 bg-gradient-to-br from-[#0d1b2a]/80 via-[#0d1b2a]/40 to-[#1b4332]/30 backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#2dd4a8_0%,transparent_55%)] opacity-[0.08] pointer-events-none" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#2dd4a8]/15 border border-[#2dd4a8]/30">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#73ffb8] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2dd4a8]" />
                </span>
              </span>
              <h1
                className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-[#73ffb8] to-[#2dd4a8] bg-clip-text text-transparent"
                style={headingFont}
              >
                Radar de Vendas
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#2dd4a8]/30 bg-[#2dd4a8]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#73ffb8]">
                ao vivo
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground" style={bodyFont}>
              Monitoramento em tempo real • atualização contínua a cada 2s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#2dd4a8]/20 bg-black/20 px-4 py-2.5 backdrop-blur">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground" style={headingFont}>Vendas hoje</p>
              <p className="text-xl font-bold text-[#73ffb8] tabular-nums" style={headingFont}>{formatCurrency(stats.revenue)}</p>
            </div>
            <div className="rounded-xl border border-[#2dd4a8]/20 bg-black/20 px-4 py-2.5 backdrop-blur">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground" style={headingFont}>Visitantes</p>
              <p className="text-xl font-bold text-white tabular-nums" style={headingFont}>{formatCompact(stats.visitors)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Bento */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {kpiCards.map((card) => {
          const isHighlight = "highlight" in card && card.highlight;
          const valueClass = "valueClass" in card && card.valueClass ? card.valueClass : "text-white";
          return (
            <div
              key={card.label}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0d1b2a]/60 to-[#0d1b2a]/30 backdrop-blur-xl p-4 transition-all duration-300 hover:-translate-y-0.5 ${
                isHighlight
                  ? "col-span-2 md:col-span-4 lg:col-span-6 border-[#2dd4a8]/40 shadow-[0_0_40px_-10px_rgba(45,212,168,0.4)]"
                  : "border-white/5 hover:border-[#2dd4a8]/30"
              }`}
            >
              {isHighlight && (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#2dd4a8_0%,transparent_50%)] opacity-[0.12] pointer-events-none" />
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#73ffb8]/10 blur-3xl" />
                </>
              )}
              <div className="relative flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground" style={headingFont}>
                  <card.icon className="h-3 w-3" /> {card.label}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4a8] opacity-60 group-hover:opacity-100 transition" />
              </div>
              <p
                className={`relative mt-2 tabular-nums font-bold ${isHighlight ? "text-4xl md:text-5xl bg-gradient-to-r from-white via-[#73ffb8] to-[#2dd4a8] bg-clip-text text-transparent" : `text-2xl ${valueClass}`}`}
                style={headingFont}
              >
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Globe — large featured tile */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-[#2dd4a8]/15 bg-gradient-to-br from-[#0d1b2a]/80 to-[#1b4332]/40 backdrop-blur-xl" style={{ height: 460 }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#0d1b2a_85%)] pointer-events-none z-[1]" />

          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2dd4a8]/30 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#73ffb8] backdrop-blur" style={headingFont}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#73ffb8] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2dd4a8]" />
              </span>
              Global Live Feed
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10 rounded-xl border border-white/10 bg-black/40 backdrop-blur px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#73ffb8] shadow-[0_0_8px_#73ffb8]" />
              <span className="text-[11px] text-muted-foreground" style={bodyFont}>Visitantes ativos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2dd4a8]" />
              <span className="text-[11px] text-muted-foreground" style={bodyFont}>Servidor</span>
            </div>
          </div>

          <div className="absolute bottom-5 left-5 z-10">
            <p className="text-5xl font-bold text-white tabular-nums leading-none" style={headingFont}>{formatCompact(stats.visitors)}</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-[#73ffb8]/80" style={headingFont}>visitantes ativos agora</p>
          </div>

          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-muted-foreground">Carregando globo...</div>}>
            <LiveGlobe
              visitors={sessions.map(s => ({ session_id: s.session_id, latitude: s.latitude, longitude: s.longitude }))}
              className="w-full h-full"
            />
          </Suspense>
        </div>

        {/* Behavior tile */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0d1b2a]/70 to-[#0d1b2a]/30 backdrop-blur-xl p-4">
          <ClientBehavior
            activeCarts={behavior.activeCarts}
            inCheckout={behavior.inCheckout}
            purchased={behavior.purchased}
          />
        </div>

        {/* Sales history chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0d1b2a]/70 to-[#0d1b2a]/30 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white" style={headingFont}>Histórico de Vendas</p>
              <p className="text-[11px] text-muted-foreground" style={bodyFont}>Receita acumulada por hora • hoje</p>
            </div>
            <span className="rounded-full border border-[#2dd4a8]/25 bg-[#2dd4a8]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#73ffb8]" style={headingFont}>Hoje</span>
          </div>
          <div className="h-[200px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="liveRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4a8" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#2dd4a8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2dd4a8" opacity={0.08} />
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(13,27,42,0.95)", border: "1px solid rgba(45,212,168,0.3)", borderRadius: 12, color: "#fff" }}
                  formatter={(value: number) => [formatCurrency(value), "Receita"]}
                />
                <Area type="monotone" dataKey="value" stroke="#73ffb8" strokeWidth={2.5} fill="url(#liveRevenueGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pages visited */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0d1b2a]/70 to-[#0d1b2a]/30 backdrop-blur-xl p-4">
          <PagesVisited
            todayEvents={todayEvents}
            liveSessions={sessions.map(s => ({ page_url: s.page_url }))}
          />
        </div>

        {/* Funnel */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0d1b2a]/70 to-[#0d1b2a]/30 backdrop-blur-xl p-5">
          <AnimatedFunnel data={funnelData} />
        </div>

        {/* Sessions by location */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0d1b2a]/70 to-[#0d1b2a]/30 backdrop-blur-xl p-4">
          <SessionsByLocation
            liveSessions={sessions.map(s => ({ session_id: s.session_id, city: s.city, region: s.region, country: s.country }))}
            todaySessions={todaySessions}
          />
        </div>

        {/* Debug — full width */}
        <div className="lg:col-span-3 rounded-2xl border border-dashed border-[#2dd4a8]/20 bg-[#0d1b2a]/40 backdrop-blur-xl p-4">
          <LiveSessionsDebug />
        </div>
      </div>
    </div>
  );
};

export default AdminLiveView;
