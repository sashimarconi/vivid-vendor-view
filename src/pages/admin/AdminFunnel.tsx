import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, AlertTriangle, Eye, MousePointerClick, ShoppingCart, CreditCard, CheckCircle2, Users, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelMetrics {
  sessions: number;
  product_views: number;
  buy_clicks: number;
  checkout_views: number;
  pix_generated: number;
  paid_orders: number;
}

interface FunnelAlert {
  step: string;
  today_value: number;
  avg_7d: number;
  drop_pct: number;
}

const STEPS = [
  { key: "sessions" as const, label: "Sessões", icon: Users, color: "hsl(199, 89%, 48%)" },
  { key: "product_views" as const, label: "Views de produto", icon: Eye, color: "hsl(263, 70%, 50%)" },
  { key: "buy_clicks" as const, label: "Cliques em comprar", icon: MousePointerClick, color: "hsl(38, 92%, 50%)" },
  { key: "checkout_views" as const, label: "Acessos checkout", icon: ShoppingCart, color: "hsl(346, 77%, 50%)" },
  { key: "pix_generated" as const, label: "PIX gerados", icon: CreditCard, color: "hsl(180, 65%, 45%)" },
  { key: "paid_orders" as const, label: "Pedidos pagos", icon: CheckCircle2, color: "hsl(142, 71%, 45%)" },
];

const PERIODS = [
  { label: "1h", hours: 1 },
  { label: "24h", hours: 24 },
  { label: "7 dias", hours: 168 },
];

const AdminFunnel = () => {
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [alerts, setAlerts] = useState<FunnelAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, a] = await Promise.all([
      (supabase as any).rpc("user_funnel_metrics", { _hours: hours }),
      (supabase as any).rpc("user_funnel_alerts"),
    ]);
    if (m.data?.[0]) setMetrics(m.data[0]);
    if (a.data) setAlerts(a.data);
    setLoading(false);
  }, [hours]);

  useEffect(() => { load(); }, [load]);

  const max = metrics ? Math.max(...STEPS.map(s => Number(metrics[s.key]) || 0), 1) : 1;
  const criticalAlerts = alerts.filter(a => a.drop_pct >= 30 && a.avg_7d >= 5);

  const renderRate = (current: number, prev: number) => {
    if (!prev) return null;
    const rate = (current / prev) * 100;
    return (
      <span className={cn(
        "text-xs font-semibold",
        rate < 30 ? "text-destructive" : rate < 60 ? "text-orange-500" : "text-emerald-500"
      )}>
        {rate.toFixed(1)}% conversão da etapa
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funil de Conversão</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe cada etapa da jornada do cliente</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <Button
              key={p.hours}
              variant={hours === p.hours ? "default" : "outline"}
              size="sm"
              onClick={() => setHours(p.hours)}
            >
              {p.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Alertas de queda</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Etapas abaixo da média dos últimos 7 dias:
                </p>
                <div className="mt-3 space-y-1.5">
                  {criticalAlerts.map(a => (
                    <div key={a.step} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{a.step}</span>
                      <span className="text-destructive font-bold">
                        −{a.drop_pct}% (hoje: {Math.round(a.today_value)} • média: {Math.round(a.avg_7d)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funnel */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !metrics ? (
            <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
          ) : (
            <div className="space-y-4">
              {STEPS.map((s, idx) => {
                const value = Number(metrics[s.key]) || 0;
                const prev = idx > 0 ? Number(metrics[STEPS[idx - 1].key]) || 0 : 0;
                const widthPct = (value / max) * 100;
                const overallPct = STEPS[0] && metrics.sessions ? (value / metrics.sessions) * 100 : 0;

                return (
                  <div key={s.key}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <s.icon className="w-4 h-4" style={{ color: s.color }} />
                      <span className="text-sm font-medium text-foreground">{s.label}</span>
                      <span className="ml-auto text-lg font-bold text-foreground">{value.toLocaleString("pt-BR")}</span>
                      {idx > 0 && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {overallPct.toFixed(1)}% do topo
                        </span>
                      )}
                    </div>
                    <div className="relative h-10 rounded-lg overflow-hidden bg-muted/50">
                      <div
                        className="h-full transition-all duration-500 rounded-lg"
                        style={{ width: `${widthPct}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }}
                      />
                    </div>
                    {idx > 0 && prev > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <ArrowDown className="w-3 h-3 text-muted-foreground" />
                        {renderRate(value, prev)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo de quedas (todas) */}
      {alerts.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Comparativo: hoje vs média 7 dias</h3>
            <div className="space-y-2">
              {alerts.map(a => {
                const isDrop = a.drop_pct > 0;
                return (
                  <div key={a.step} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-foreground">{a.step}</span>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-muted-foreground">hoje: <b className="text-foreground">{Math.round(a.today_value)}</b></span>
                      <span className="text-muted-foreground">média: <b className="text-foreground">{Math.round(a.avg_7d)}</b></span>
                      <span className={cn(
                        "font-bold w-16 text-right",
                        isDrop ? (a.drop_pct >= 30 ? "text-destructive" : "text-orange-500") : "text-emerald-500"
                      )}>
                        {isDrop ? "−" : "+"}{Math.abs(a.drop_pct)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminFunnel;
