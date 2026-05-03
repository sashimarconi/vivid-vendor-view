import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertCircle, Clock, AlertTriangle, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import GatewayConversion from "@/components/admin/payment-health/GatewayConversion";

interface GatewayHealth {
  gateway_name: string;
  total_calls: number;
  success_calls: number;
  error_calls: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_rate_pct: number;
  last_error: string | null;
  last_call_at: string;
}

interface OrphanData {
  orphan_count: number;
  total_orders: number;
  orphan_pct: number;
}

const PERIODS = [
  { label: "1h", hours: 1 },
  { label: "24h", hours: 24 },
  { label: "7 dias", hours: 168 },
];

const AdminPaymentHealth = () => {
  const qc = useQueryClient();
  const [hours, setHours] = useState(24);
  const [health, setHealth] = useState<GatewayHealth[]>([]);
  const [orphan, setOrphan] = useState<OrphanData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [h, o] = await Promise.all([
      (supabase as any).rpc("user_gateway_health", { _hours: hours }),
      (supabase as any).rpc("user_orphan_pix", { _hours: hours }),
    ]);
    if (h.data) setHealth(h.data);
    if (o.data?.[0]) setOrphan(o.data[0]);
    setLoading(false);
  }, [hours]);

  useEffect(() => { load(); }, [load]);

  // Lista de gateways configurados (para definir prioridade fallback)
  const { data: gateways } = useQuery({
    queryKey: ["gateways-priority"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gateway_settings")
        .select("id, gateway_name, active, fallback_priority, secret_key")
        .order("active", { ascending: false })
        .order("fallback_priority", { ascending: false });
      return (data || []).filter(g => g.secret_key);
    },
  });

  const updatePriority = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      if (!gateways) return;
      const idx = gateways.findIndex(g => g.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= gateways.length) return;
      const a = gateways[idx];
      const b = gateways[swapIdx];
      await supabase.from("gateway_settings").update({ fallback_priority: b.fallback_priority || 0 }).eq("id", a.id);
      await supabase.from("gateway_settings").update({ fallback_priority: a.fallback_priority || 0 }).eq("id", b.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gateways-priority"] });
      toast.success("Prioridade atualizada");
    },
    onError: () => toast.error("Erro ao atualizar prioridade"),
  });

  const totalCalls = health.reduce((s, h) => s + Number(h.total_calls), 0);
  const totalErrors = health.reduce((s, h) => s + Number(h.error_calls), 0);
  const overallErrorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;
  const avgLatency = health.length > 0
    ? Math.round(health.reduce((s, h) => s + Number(h.avg_latency_ms || 0), 0) / health.length)
    : 0;

  const getStatus = (errorRate: number, latency: number) => {
    if (errorRate >= 30) return { label: "Crítico", color: "text-destructive bg-destructive/10" };
    if (errorRate >= 10 || latency >= 5000) return { label: "Atenção", color: "text-orange-500 bg-orange-500/10" };
    return { label: "Saudável", color: "text-emerald-500 bg-emerald-500/10" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saúde do Pagamento</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitore a performance dos gateways e configure fallback</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <Button key={p.hours} variant={hours === p.hours ? "default" : "outline"} size="sm" onClick={() => setHours(p.hours)}>
              {p.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Chamadas
            </span>
            <p className="text-xl font-bold text-foreground mt-1">{totalCalls}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Taxa de erro
            </span>
            <p className={cn("text-xl font-bold mt-1",
              overallErrorRate >= 30 ? "text-destructive" : overallErrorRate >= 10 ? "text-orange-500" : "text-foreground"
            )}>{overallErrorRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Latência média
            </span>
            <p className={cn("text-xl font-bold mt-1",
              avgLatency >= 5000 ? "text-destructive" : avgLatency >= 2000 ? "text-orange-500" : "text-foreground"
            )}>{avgLatency}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> PIX órfãos
            </span>
            <p className={cn("text-xl font-bold mt-1",
              (orphan?.orphan_pct ?? 0) >= 5 ? "text-destructive" : "text-foreground"
            )}>
              {orphan?.orphan_count ?? 0} <span className="text-xs text-muted-foreground">({orphan?.orphan_pct ?? 0}%)</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(overallErrorRate >= 10 || (orphan?.orphan_pct ?? 0) >= 5) && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Atenção necessária</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                {overallErrorRate >= 30 && <li>Taxa de erro crítica ({overallErrorRate.toFixed(1)}%) — fallback ativo</li>}
                {overallErrorRate >= 10 && overallErrorRate < 30 && <li>Taxa de erro elevada ({overallErrorRate.toFixed(1)}%)</li>}
                {(orphan?.orphan_pct ?? 0) >= 5 && <li>{orphan?.orphan_count} PIX sem transaction_id (possível falha de gateway)</li>}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gateway list */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Gateway</h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : health.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados de chamadas no período</p>
          ) : (
            <div className="space-y-3">
              {health.map(h => {
                const status = getStatus(h.error_rate_pct, h.avg_latency_ms);
                return (
                  <div key={h.gateway_name} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground capitalize">{h.gateway_name}</span>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{h.total_calls} chamadas</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Sucesso</span>
                        <p className="text-emerald-500 font-bold">{h.success_calls}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Erros</span>
                        <p className="text-destructive font-bold">{h.error_calls} ({h.error_rate_pct}%)</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Latência (avg / p95)</span>
                        <p className="text-foreground font-bold">{h.avg_latency_ms}ms / {h.p95_latency_ms}ms</p>
                      </div>
                    </div>
                    {h.last_error && (
                      <p className="text-xs text-destructive mt-2 truncate" title={h.last_error}>
                        Último erro: {h.last_error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <GatewayConversion />

      {/* Fallback config */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Ordem de Fallback</h3>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">Auto</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Se o gateway ativo falhar, o sistema tenta os próximos automaticamente. Reordene com as setas.
          </p>
          {!gateways || gateways.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Configure ao menos 2 gateways para usar fallback</p>
          ) : (
            <div className="space-y-2">
              {gateways.map((g, idx) => (
                <div key={g.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}º</span>
                  <span className="font-medium text-foreground capitalize flex-1">{g.gateway_name}</span>
                  {g.active && (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                      Ativo
                    </span>
                  )}
                  <Button
                    size="sm" variant="ghost"
                    disabled={idx === 0}
                    onClick={() => updatePriority.mutate({ id: g.id, direction: "up" })}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    disabled={idx === gateways.length - 1}
                    onClick={() => updatePriority.mutate({ id: g.id, direction: "down" })}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentHealth;
