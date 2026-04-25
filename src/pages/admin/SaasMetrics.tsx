import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Store, ShoppingCart, DollarSign, Crown, TrendingUp, UserPlus } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Metrics {
  total_users: number;
  total_products: number;
  total_stores: number;
  total_orders: number;
  total_revenue: number;
  free_users: number;
  pro_users: number;
  enterprise_users: number;
}

interface DailyOrder {
  day: string;
  order_count: number;
  revenue: number;
  paid_count: number;
}

interface DailySignup {
  day: string;
  signup_count: number;
}

const PLAN_COLORS = ["hsl(220, 10%, 50%)", "hsl(199, 89%, 48%)", "hsl(263, 70%, 58%)"];

const SaasMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dailyOrders, setDailyOrders] = useState<DailyOrder[]>([]);
  const [dailySignups, setDailySignups] = useState<DailySignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [metricsRes, ordersRes, signupsRes] = await Promise.all([
        supabase.rpc("admin_saas_metrics"),
        supabase.rpc("admin_daily_orders", { days: 30 }),
        supabase.rpc("admin_daily_signups", { days: 30 }),
      ]);

      if (!metricsRes.error && metricsRes.data?.length > 0) {
        setMetrics(metricsRes.data[0] as unknown as Metrics);
      }
      if (!ordersRes.error && ordersRes.data) {
        setDailyOrders(ordersRes.data as unknown as DailyOrder[]);
      }
      if (!signupsRes.error && signupsRes.data) {
        setDailySignups(signupsRes.data as unknown as DailySignup[]);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  if (!metrics) return <p className="text-muted-foreground">Erro ao carregar métricas.</p>;

  const cards = [
    { title: "Total de Usuários", value: metrics.total_users, icon: Users, color: "text-accent" },
    { title: "Produtos Criados", value: metrics.total_products, icon: Package, color: "text-primary" },
    { title: "Lojas Criadas", value: metrics.total_stores, icon: Store, color: "text-void-success" },
    { title: "Pedidos Totais", value: metrics.total_orders, icon: ShoppingCart, color: "text-void-warning" },
    { title: "Receita Aprovada", value: `R$ ${Number(metrics.total_revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-void-success" },
  ];

  const planPieData = [
    { name: "Free", value: metrics.free_users },
    { name: "Pro", value: metrics.pro_users },
    { name: "Enterprise", value: metrics.enterprise_users },
  ].filter((d) => d.value > 0);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Métricas do SaaS</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral de toda a plataforma VoidTok</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((card) => (
          <Card key={card.title} className="border-border/60 bg-card hover:bg-muted/30 transition-colors duration-150">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{card.title}</CardTitle>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Revenue Chart */}
        <Card className="border-border/60 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Receita Diária (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyOrders.map((d) => ({ ...d, day: formatDay(d.day) }))}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 14%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(199, 89%, 48%)" fill="url(#revenueGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4 text-void-warning" />
              Distribuição por Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={planPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {planPieData.map((_, i) => (
                    <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(240, 6%, 10%)",
                    border: "1px solid hsl(230, 15%, 16%)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {planPieData.map((p, i) => (
                <div key={p.name} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: PLAN_COLORS[i] }} />
                  <span className="text-muted-foreground">{p.name}: <span className="text-foreground font-medium">{p.value}</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders + Signups Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Pedidos Diários (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
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

        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-void-success" />
              Novos Cadastros (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailySignups.map((d) => ({ ...d, day: formatDay(d.day) }))}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152, 60%, 48%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(152, 60%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 14%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="signup_count" name="Cadastros" stroke="hsl(152, 60%, 48%)" fill="url(#signupGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaasMetrics;
