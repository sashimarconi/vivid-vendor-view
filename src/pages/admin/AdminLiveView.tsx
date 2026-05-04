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
    const requestId = ++fastRequestRef.current;
    const now = new Date();
    // Janela "ao vivo" agressiva (20s): saída do visitante reflete em segundos.
    // Heartbeat é a cada 5s + expiração ativa em pagehide/visibility hidden.
    const liveCutoff = new Date(now.getTime() - 20 * 1000).toISOString();
    const eventLiveCutoff = new Date(now.getTime() - 20 * 1000).toISOString();
    const todayStart = getSaoPauloDayStartIso(now);
    const todayDate = getSaoPauloDateKey(now);

    try {
      const [liveSessionsRes, liveEventSessionsRes, ordersCountRes, pendingOrdersCountRes, pageViewsCountRes, checkoutViewsCountRes, financialSummaryRes, paidOrdersRows] = await Promise.all([
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

      if (liveSessionsRes.error) throw liveSessionsRes.error;
      if (liveEventSessionsRes.error) throw liveEventSessionsRes.error;
      if (ordersCountRes.error) throw ordersCountRes.error;
      if (pendingOrdersCountRes.error) throw pendingOrdersCountRes.error;
      if (pageViewsCountRes.error) throw pageViewsCountRes.error;
      if (checkoutViewsCountRes.error) throw checkoutViewsCountRes.error;
      if (financialSummaryRes.error) throw financialSummaryRes.error;

      const sessionsArr = dedupeSessions((liveSessionsRes.data || []) as SessionData[]);

      // Reforço: sessões com evento recente que ainda não bateram heartbeat (mobile/aba inativa).
      // Usadas só na contagem ao vivo, não no globo (que precisa de coordenadas).
      const sessionMap = new Map<string, SessionData>();
      sessionsArr.forEach((s) => sessionMap.set(s.session_id, s));
      const eventOnlySessions = new Set<string>();
      const checkoutLiveSessions = new Set<string>();
      ((liveEventSessionsRes.data || []) as { session_id: string; page_url: string | null }[]).forEach((ev) => {
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

      const financialSummary = (financialSummaryRes.data?.[0] || null) as FinancialSummaryRow | null;
      const revenue = Number(financialSummary?.gross_revenue ?? 0);
      const paidOrdersCount = Number(financialSummary?.total_orders_paid ?? 0);
      const ordersCount = ordersCountRes.count ?? 0;
      const pendingOrdersCount = pendingOrdersCountRes.count ?? 0;
      const pageViewsCount = pageViewsCountRes.count ?? 0;
      const checkoutViewsCount = checkoutViewsCountRes.count ?? 0;
      const checkoutActiveLive = checkoutLiveSessions.size;
      const onStoreLive = liveVisitorsCount - checkoutActiveLive;

      setSessions(sessionsArr);
      setBehavior({
        activeCarts: Math.max(0, onStoreLive),
        inCheckout: checkoutActiveLive,
        purchased: paidOrdersCount,
      });

      setStats({
        visitors: liveVisitorsCount,
        revenue,
        orders: ordersCount,
        paidOrders: paidOrdersCount,
        pendingOrders: pendingOrdersCount,
        conversionRate: ordersCount > 0 ? (paidOrdersCount / ordersCount) * 100 : 0,
        avgTicket: paidOrdersCount > 0 ? revenue / paidOrdersCount : 0,
      });

      const hours = createHourlyBuckets();
      paidOrdersRows.forEach((order) => {
        const paidAt = order.paid_at || order.created_at;
        const hour = getSaoPauloHour(paidAt);
        hours[hour].value += Number(order.total);
      });
      setHourlyData(hours);

      const funnelBase = Math.max(pageViewsCount, 1);
      setFunnelData([
        { label: "Acessos", value: pageViewsCount, pct: pageViewsCount > 0 ? 100 : 0 },
        { label: "Checkout", value: checkoutViewsCount, pct: Math.round((checkoutViewsCount / funnelBase) * 100) },
        { label: "PIX Gerado", value: ordersCount, pct: Math.round((ordersCount / funnelBase) * 100) },
        { label: "Pagos", value: paidOrdersCount, pct: Math.round((paidOrdersCount / funnelBase) * 100) },
      ]);
    } catch (error) {
      console.error("Erro ao atualizar os KPIs do radar", error);
    }
  }, [fetchAll]);

  const fetchSupportingData = useCallback(async () => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              Radar de Vendas
            </h1>
            <span className="flex items-center gap-1.5 bg-marketplace-green/10 text-marketplace-green text-xs font-medium px-2.5 py-1 rounded-full border border-marketplace-green/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marketplace-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-marketplace-green" />
              </span>
              ao vivo
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento em tempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {kpiCards.map((card) => {
              const isHighlight = "highlight" in card && card.highlight;
              const valueClass = "valueClass" in card && card.valueClass ? card.valueClass : "text-foreground";
              return (
                <Card
                  key={card.label}
                  className={`relative overflow-hidden border-border/60 bg-card/40 backdrop-blur transition-all hover:border-primary/40 ${card.colSpan} ${
                    isHighlight ? "shadow-[0_0_32px_-12px_hsl(var(--primary)/0.5)] border-primary/30" : ""
                  }`}
                >
                  {isHighlight && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
                  )}
                  <CardContent className="relative p-4">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 font-medium">
                      <card.icon className="w-3.5 h-3.5 text-muted-foreground" /> {card.label}
                    </span>
                    <p className={`text-2xl font-bold mt-1.5 tabular-nums ${isHighlight ? "text-3xl text-foreground" : valueClass}`}>
                      {card.value}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <ClientBehavior
            activeCarts={behavior.activeCarts}
            inCheckout={behavior.inCheckout}
            purchased={behavior.purchased}
          />

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Histórico de Vendas</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hoje</span>
              </div>
              <div className="h-[180px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="liveRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(263, 80%, 60%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(263, 80%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(263, 80%, 65%)" strokeWidth={2.5} fill="url(#liveRevenueGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-5">
              <AnimatedFunnel data={funnelData} />
            </CardContent>
          </Card>

          <LiveSessionsDebug />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Interactive Globe */}
          <Card className="border-border relative overflow-hidden" style={{ height: 420 }}>
            <CardContent className="p-0 h-full relative">
              <div className="absolute top-4 right-4 z-10 rounded-xl p-3 border border-border bg-card/90 backdrop-blur">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-marketplace-green" />
                  <span className="text-xs text-muted-foreground">Visitantes Ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Servidor</span>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 z-10">
                <p className="text-4xl font-bold text-foreground">{formatCompact(stats.visitors)}</p>
                <p className="text-sm text-muted-foreground">visitantes ativos</p>
              </div>

              <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-muted-foreground">Carregando globo...</div>}>
                <LiveGlobe
                  visitors={sessions.map(s => ({ session_id: s.session_id, latitude: s.latitude, longitude: s.longitude }))}
                  className="w-full h-full"
                />
              </Suspense>
            </CardContent>
          </Card>

          {/* Pages Visited */}
          <PagesVisited
            todayEvents={todayEvents}
            liveSessions={sessions.map(s => ({ page_url: s.page_url }))}
          />

          {/* Sessions by Location */}
          <SessionsByLocation
            liveSessions={sessions.map(s => ({ session_id: s.session_id, city: s.city, region: s.region, country: s.country }))}
            todaySessions={todaySessions}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminLiveView;
