import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Globe, ShoppingCart, TrendingUp, DollarSign, Target } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnalyticsSummary {
  total_page_views: number;
  total_sessions: number;
  total_abandoned_carts: number;
  total_orders_period: number;
  total_revenue_period: number;
  conversion_rate: number;
}

interface DailyOrder {
  day: string;
  order_count: number;
  revenue: number;
  paid_count: number;
}

const SaasAnalytics = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyOrders, setDailyOrders] = useState<DailyOrder[]>([]);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);

  const fetchData = async (days: number) => {
    setLoading(true);
    const [summaryRes, ordersRes] = await Promise.all([
      supabase.rpc("admin_analytics_summary", { days }),
      supabase.rpc("admin_daily_orders", { days }),
    ]);

    if (!summaryRes.error && summaryRes.data?.length > 0) {
      setSummary(summaryRes.data[0] as unknown as AnalyticsSummary);
    }
    if (!ordersRes.error && ordersRes.data) {
      setDailyOrders(ordersRes.data as unknown as DailyOrder[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(Number(period));
  }, [period]);

  const formatDay = (day: string) => {
    try { return format(parseISO(day), "dd/MM", { locale: ptBR }); } catch { return day; }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg p-3" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.name === "Receita" ? `R$ ${Number(entry.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : entry.value}
          </p>
        ))}
      </div>
    );
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  const kpiCards = summary ? [
    { title: "Page Views", value: summary.total_page_views.toLocaleString("pt-BR"), icon: Eye, color: "text-accent" },
    { title: "Sessões", value: summary.total_sessions.toLocaleString("pt-BR"), icon: Globe, color: "text-primary" },
    { title: "Carrinhos Abandonados", value: summary.total_abandoned_carts.toLocaleString("pt-BR"), icon: ShoppingCart, color: "text-void-warning" },
    { title: "Pedidos no Período", value: summary.total_orders_period.toLocaleString("pt-BR"), icon: TrendingUp, color: "text-void-success" },
    { title: "Receita no Período", value: `R$ ${Number(summary.total_revenue_period).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-void-success" },
    { title: "Taxa de Conversão", value: `${summary.conversion_rate}%`, icon: Target, color: "text-destructive" },
  ] : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análises Gerais</h1>
          <p className="text-muted-foreground text-sm mt-1">Dados consolidados de todos os usuários</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="14">Últimos 14 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-border/60 bg-card hover:bg-muted/30 transition-colors duration-150">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-medium text-muted-foreground leading-tight uppercase tracking-wide">{card.title}</CardTitle>
              <card.icon className={`w-3.5 h-3.5 shrink-0 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue + Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-accent" />
              Receita Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyOrders.map((d) => ({ ...d, day: formatDay(d.day) }))}>
                <defs>
                  <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 14%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(199, 89%, 48%)" fill="url(#analyticsRevGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Pedidos Diários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyOrders.map((d) => ({ ...d, day: formatDay(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 14%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="order_count" name="Total" fill="hsl(263, 70%, 58%)" radius={[3, 3, 0, 0]} opacity={0.5} />
                <Bar dataKey="paid_count" name="Aprovados" fill="hsl(199, 89%, 48%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaasAnalytics;
