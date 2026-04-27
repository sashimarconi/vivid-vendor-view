import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, Package as PackageIcon,
  Target, Plus, Trash2, Wallet, PiggyBank, Percent, BarChart3, Calendar
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  marketing_facebook: "Facebook Ads",
  marketing_tiktok: "TikTok Ads",
  marketing_google: "Google Ads",
  taxes: "Impostos",
  other_expense: "Outras despesas",
  extra_revenue: "Receita extra",
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing_facebook: "hsl(217 91% 60%)",
  marketing_tiktok: "hsl(330 81% 60%)",
  marketing_google: "hsl(38 92% 55%)",
  taxes: "hsl(0 72% 55%)",
  other_expense: "hsl(220 10% 50%)",
  extra_revenue: "hsl(152 60% 48%)",
};

const PERIOD_PRESETS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
  { value: "lastmonth", label: "Mês passado" },
];

// Format Date as YYYY-MM-DD using LOCAL timezone (avoids UTC shift bug)
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getRange(preset: string): { start: string; end: string } {
  const today = new Date();
  const end = toLocalISODate(today);
  if (preset === "today") return { start: end, end };
  if (preset === "7d") {
    const d = new Date(today); d.setDate(d.getDate() - 6);
    return { start: toLocalISODate(d), end };
  }
  if (preset === "30d") {
    const d = new Date(today); d.setDate(d.getDate() - 29);
    return { start: toLocalISODate(d), end };
  }
  if (preset === "month") {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toLocalISODate(d), end };
  }
  if (preset === "lastmonth") {
    const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const e = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toLocalISODate(s), end: toLocalISODate(e) };
  }
  return { start: end, end };
}

// Parse YYYY-MM-DD as a LOCAL date (not UTC) to avoid off-by-one when displaying
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtPct = (v: number) => `${(v || 0).toFixed(1)}%`;

export default function AdminFinancial() {
  const [preset, setPreset] = useState("30d");
  const [tab, setTab] = useState("overview");

  const range = useMemo(() => getRange(preset), [preset]);

  // Summary
  const { data: summary } = useQuery({
    queryKey: ["fin-summary", range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_financial_summary", {
        _start: range.start, _end: range.end,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  // Daily series
  const { data: daily } = useQuery({
    queryKey: ["fin-daily", range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_financial_daily", {
        _start: range.start, _end: range.end,
      });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        day: parseLocalDate(d.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        revenue: Number(d.revenue),
        costs_and_fees: Number(d.costs_and_fees),
        expenses: Number(d.expenses),
        net_profit: Number(d.net_profit),
      }));
    },
  });

  // Product ranking
  const { data: ranking } = useQuery({
    queryKey: ["fin-ranking", range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_product_profit_ranking", {
        _start: range.start, _end: range.end,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Goal for current month
  const monthStart = useMemo(() => {
    const d = new Date(); return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);
  const { data: goal } = useQuery({
    queryKey: ["fin-goal", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("month", monthStart)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Month-to-date summary for goal progress
  const monthRange = useMemo(() => getRange("month"), []);
  const { data: monthSummary } = useQuery({
    queryKey: ["fin-summary-month", monthRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_financial_summary", {
        _start: monthRange.start, _end: monthRange.end,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const expensesByCategory = useMemo(() => {
    if (!summary?.expenses_by_category) return [];
    const obj = summary.expenses_by_category as Record<string, number>;
    return Object.entries(obj)
      .filter(([k]) => k !== "extra_revenue")
      .map(([k, v]) => ({ name: CATEGORY_LABELS[k] ?? k, value: Number(v), color: CATEGORY_COLORS[k] ?? "hsl(220 10% 50%)" }));
  }, [summary]);

  const netProfit = Number(summary?.net_profit ?? 0);
  const isProfit = netProfit >= 0;

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe receita, custos, despesas e lucro líquido</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="costs">Custos</TabsTrigger>
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* Big KPI: Net Profit */}
          <Card className={`p-6 md:p-8 border-border/60 relative overflow-hidden ${isProfit ? "bg-gradient-to-br from-emerald-500/10 via-card to-card" : "bg-gradient-to-br from-red-500/10 via-card to-card"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Lucro líquido</div>
                <div className={`text-4xl md:text-5xl font-bold font-mono mt-2 ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtBRL(netProfit)}
                </div>
                <div className="flex items-center gap-3 mt-3 text-sm">
                  <Badge variant="outline" className="font-mono">
                    Margem {fmtPct(Number(summary?.margin_pct ?? 0))}
                  </Badge>
                  <span className="text-muted-foreground">
                    {Number(summary?.total_orders_paid ?? 0)} pedidos pagos
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${isProfit ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                {isProfit ? <TrendingUp className="w-7 h-7 text-emerald-400" /> : <TrendingDown className="w-7 h-7 text-red-400" />}
              </div>
            </div>
          </Card>

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={DollarSign} label="Receita bruta" value={fmtBRL(Number(summary?.gross_revenue ?? 0))} accent="emerald" />
            <KpiCard icon={Percent} label="Taxas gateway" value={fmtBRL(Number(summary?.gateway_fees_total ?? 0))} accent="amber" />
            <KpiCard icon={PackageIcon} label="Custo dos produtos" value={fmtBRL(Number(summary?.product_costs_total ?? 0))} accent="blue" />
            <KpiCard icon={Receipt} label="Despesas" value={fmtBRL(Number(summary?.expenses_total ?? 0))} accent="red" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Wallet} label="Ticket médio" value={fmtBRL(Number(summary?.avg_ticket ?? 0))} accent="violet" />
            <KpiCard icon={BarChart3} label="ROI" value={fmtPct(Number(summary?.roi ?? 0))} accent="violet" />
            <KpiCard icon={Target} label="CPA" value={fmtBRL(Number(summary?.cpa ?? 0))} accent="violet" />
            <KpiCard icon={PiggyBank} label="Receita extra" value={fmtBRL(Number(summary?.extra_revenue ?? 0))} accent="emerald" />
          </div>

          {/* Goal progress */}
          {goal && (Number(goal.revenue_goal) > 0 || Number(goal.profit_goal) > 0) && (
            <Card className="p-5 border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-semibold tracking-tight">Meta do mês</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GoalBar label="Receita" current={Number(monthSummary?.gross_revenue ?? 0)} goal={Number(goal.revenue_goal)} color="bg-emerald-500" />
                <GoalBar label="Lucro líquido" current={Number(monthSummary?.net_profit ?? 0)} goal={Number(goal.profit_goal)} color="bg-primary" />
              </div>
            </Card>
          )}

          {/* Daily chart */}
          <Card className="p-5 border-border/60">
            <h3 className="font-semibold tracking-tight mb-4">Evolução diária</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily ?? []}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(152 60% 48%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(152 60% 48%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 72% 55%)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(0 72% 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(263 70% 58%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(263 70% 58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtBRL(v)}
                  />
                  <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(152 60% 48%)" fill="url(#rev)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="costs_and_fees" name="Custos+Taxas" stroke="hsl(0 72% 55%)" fill="url(#cost)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="net_profit" name="Lucro" stroke="hsl(263 70% 58%)" fill="url(#prof)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expenses donut */}
            <Card className="p-5 border-border/60">
              <h3 className="font-semibold tracking-tight mb-4">Despesas por categoria</h3>
              {expensesByCategory.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                  Nenhuma despesa no período
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {expensesByCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => fmtBRL(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Top products */}
            <Card className="p-5 border-border/60">
              <h3 className="font-semibold tracking-tight mb-4">Top produtos por lucro</h3>
              {!ranking?.length ? (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                  Sem vendas no período
                </div>
              ) : (
                <div className="space-y-2">
                  {ranking.map((p: any) => (
                    <div key={p.product_id} className="flex items-center justify-between p-3 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{p.title}</div>
                        <div className="text-[11px] text-muted-foreground">{p.units_sold} unidades · margem {fmtPct(Number(p.margin_pct))}</div>
                      </div>
                      <div className={`font-mono font-semibold text-sm ${Number(p.profit) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {fmtBRL(Number(p.profit))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs"><ProductCostsTab /></TabsContent>
        <TabsContent value="gateways"><GatewayFeesTab /></TabsContent>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
        <TabsContent value="goals"><GoalsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    red: "text-red-400 bg-red-500/10",
    violet: "text-violet-400 bg-violet-500/10",
  };
  return (
    <Card className="p-4 border-border/60 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        <div className={`p-1.5 rounded-md ${colorMap[accent]}`}><Icon className="w-3.5 h-3.5" /></div>
      </div>
      <div className="text-xl font-bold font-mono tracking-tight">{value}</div>
    </Card>
  );
}

function GoalBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{fmtBRL(current)} / {fmtBRL(goal)}</span>
      </div>
      <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 text-right font-mono">{pct.toFixed(0)}%</div>
    </div>
  );
}

/* ---------- Product costs tab ---------- */
function ProductCostsTab() {
  const qc = useQueryClient();
  const { data: products } = useQuery({
    queryKey: ["products-with-costs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: prods } = await supabase.from("products").select("id,title,sale_price").eq("user_id", user.id).order("title");
      const { data: costs } = await supabase.from("product_costs").select("product_id,unit_cost").eq("user_id", user.id);
      const map = new Map((costs ?? []).map((c: any) => [c.product_id, Number(c.unit_cost)]));
      return (prods ?? []).map((p: any) => ({ ...p, unit_cost: map.get(p.id) ?? 0 }));
    },
  });

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async ({ product_id, unit_cost }: { product_id: string; unit_cost: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("product_costs")
        .upsert({ user_id: user.id, product_id, unit_cost }, { onConflict: "user_id,product_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Custo salvo"); qc.invalidateQueries({ queryKey: ["products-with-costs"] }); qc.invalidateQueries({ queryKey: ["fin-summary"] }); qc.invalidateQueries({ queryKey: ["fin-daily"] }); qc.invalidateQueries({ queryKey: ["fin-ranking"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-5 border-border/60">
      <h3 className="font-semibold tracking-tight mb-4">Custo unitário dos produtos</h3>
      {!products?.length ? (
        <p className="text-sm text-muted-foreground">Você ainda não tem produtos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Preço de venda</TableHead>
              <TableHead className="w-[200px]">Custo unitário (R$)</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p: any) => {
              const draft = drafts[p.id] ?? String(p.unit_cost);
              const cost = Number(draft) || 0;
              const margin = p.sale_price > 0 ? ((p.sale_price - cost) / p.sale_price) * 100 : 0;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtBRL(Number(p.sale_price))}</TableCell>
                  <TableCell>
                    <Input
                      type="number" step="0.01" min="0" value={draft}
                      onChange={(e) => setDrafts({ ...drafts, [p.id]: e.target.value })}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {margin.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => save.mutate({ product_id: p.id, unit_cost: cost })} disabled={save.isPending}>
                      Salvar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/* ---------- Gateway fees tab ---------- */
function GatewayFeesTab() {
  const qc = useQueryClient();
  const { data: gateways } = useQuery({
    queryKey: ["gateways-fees"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("gateway_settings").select("id,gateway_name,display_name,active,fee_percent,fallback_priority")
        .eq("user_id", user.id).order("fallback_priority");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async ({ id, fee_percent }: { id: string; fee_percent: number }) => {
      const { error } = await supabase.from("gateway_settings").update({ fee_percent }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Taxa atualizada"); qc.invalidateQueries({ queryKey: ["gateways-fees"] }); qc.invalidateQueries({ queryKey: ["fin-summary"] }); qc.invalidateQueries({ queryKey: ["fin-daily"] }); qc.invalidateQueries({ queryKey: ["fin-ranking"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-5 border-border/60">
      <h3 className="font-semibold tracking-tight mb-4">Taxa por gateway</h3>
      <p className="text-sm text-muted-foreground mb-4">A taxa do gateway ativo (de maior prioridade) será usada para calcular custos do período.</p>
      {!gateways?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum gateway configurado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gateway</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Taxa (%)</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gateways.map((g: any) => {
              const draft = drafts[g.id] ?? String(g.fee_percent ?? 0);
              return (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.display_name || g.gateway_name}</TableCell>
                  <TableCell>
                    {g.active
                      ? <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">Ativo</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>}
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" min="0" value={draft}
                      onChange={(e) => setDrafts({ ...drafts, [g.id]: e.target.value })} className="h-9" />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => save.mutate({ id: g.id, fee_percent: Number(draft) || 0 })} disabled={save.isPending}>
                      Salvar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/* ---------- Expenses tab ---------- */
function ExpensesTab() {
  const qc = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: expenses } = useQuery({
    queryKey: ["expenses", filterCategory],
    queryFn: async () => {
      let q = supabase.from("expenses").select("*").order("date", { ascending: false }).limit(200);
      if (filterCategory !== "all") q = q.eq("category", filterCategory);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["fin-summary"] }); qc.invalidateQueries({ queryKey: ["fin-daily"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-5 border-border/60">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold tracking-tight">Despesas e receitas extras</h3>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nova</Button>
            </DialogTrigger>
            <ExpenseDialog onClose={() => setOpen(false)} />
          </Dialog>
        </div>
      </div>

      {!expenses?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Recorrente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{parseLocalDate(e.date).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <Badge variant="outline" style={{ borderColor: `${CATEGORY_COLORS[e.category]}40`, color: CATEGORY_COLORS[e.category] }}>
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.description || "—"}</TableCell>
                <TableCell>{e.is_recurring ? <Badge variant="outline">Mensal · dia {e.recurring_day}</Badge> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                <TableCell className={`text-right font-mono ${e.category === "extra_revenue" ? "text-emerald-400" : "text-red-400"}`}>
                  {e.category === "extra_revenue" ? "+" : "−"}{fmtBRL(Number(e.amount))}
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)} className="h-8 w-8">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function ExpenseDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(toLocalISODate(new Date()));
  const [category, setCategory] = useState("marketing_facebook");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState("1");

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const payload: any = {
        user_id: user.id, date, category, description: description || null,
        amount: Number(amount) || 0, is_recurring: isRecurring,
        recurring_day: isRecurring ? Number(recurringDay) : null,
      };
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento criado");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["fin-summary"] });
      qc.invalidateQueries({ queryKey: ["fin-daily"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Descrição (opcional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Campanha Black Friday" />
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </div>
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
          <div>
            <Label className="cursor-pointer">Lançamento recorrente</Label>
            <p className="text-xs text-muted-foreground">Repete automaticamente todo mês</p>
          </div>
          <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
        </div>
        {isRecurring && (
          <div>
            <Label>Dia do mês</Label>
            <Input type="number" min="1" max="31" value={recurringDay} onChange={(e) => setRecurringDay(e.target.value)} />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending || !amount}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------- Goals tab ---------- */
function GoalsTab() {
  const qc = useQueryClient();
  const monthStart = useMemo(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }, []);

  const { data: goal } = useQuery({
    queryKey: ["fin-goal", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_goals").select("*").eq("month", monthStart).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [revenueGoal, setRevenueGoal] = useState("");
  const [profitGoal, setProfitGoal] = useState("");

  useEffect(() => {
    setRevenueGoal(String(goal?.revenue_goal ?? ""));
    setProfitGoal(String(goal?.profit_goal ?? ""));
  }, [goal]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("financial_goals").upsert({
        user_id: user.id, month: monthStart,
        revenue_goal: Number(revenueGoal) || 0, profit_goal: Number(profitGoal) || 0,
      }, { onConflict: "user_id,month" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Metas salvas"); qc.invalidateQueries({ queryKey: ["fin-goal"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <Card className="p-5 border-border/60 max-w-xl">
      <h3 className="font-semibold tracking-tight mb-1">Metas de {monthName}</h3>
      <p className="text-sm text-muted-foreground mb-5">Defina seus objetivos para acompanhar o progresso na visão geral.</p>
      <div className="space-y-4">
        <div>
          <Label>Meta de receita (R$)</Label>
          <Input type="number" step="0.01" min="0" value={revenueGoal} onChange={(e) => setRevenueGoal(e.target.value)} placeholder="0,00" />
        </div>
        <div>
          <Label>Meta de lucro líquido (R$)</Label>
          <Input type="number" step="0.01" min="0" value={profitGoal} onChange={(e) => setProfitGoal(e.target.value)} placeholder="0,00" />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar metas</Button>
      </div>
    </Card>
  );
}
