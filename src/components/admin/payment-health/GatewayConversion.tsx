import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryRow {
  gateway_name: string;
  pix_generated: number;
  paid: number;
  conversion_pct: number | null;
  revenue: number;
  avg_ticket: number;
}

interface DailyRow {
  gateway_name: string;
  day: string;
  pix_generated: number;
  paid: number;
  conversion_pct: number | null;
  revenue: number;
}

const PERIODS = [
  { label: "7 dias", days: 7 },
  { label: "14 dias", days: 14 },
  { label: "30 dias", days: 30 },
];

const formatCurrency = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

const GatewayConversion = () => {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, d] = await Promise.all([
      (supabase as unknown as { rpc: (n: string, p: Record<string, unknown>) => Promise<{ data: SummaryRow[] | null }> })
        .rpc("user_gateway_conversion_summary", { _days: days }),
      (supabase as unknown as { rpc: (n: string, p: Record<string, unknown>) => Promise<{ data: DailyRow[] | null }> })
        .rpc("user_gateway_conversion", { _days: days }),
    ]);
    setSummary(s.data || []);
    setDaily(d.data || []);
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const best = useMemo(() => {
    if (summary.length === 0) return null;
    return summary.reduce((a, b) => (Number(a.conversion_pct ?? 0) >= Number(b.conversion_pct ?? 0) ? a : b));
  }, [summary]);

  // Pivot: dias × gateways
  const { dayList, gatewayList, matrix } = useMemo(() => {
    const days = Array.from(new Set(daily.map(r => r.day))).sort((a, b) => b.localeCompare(a));
    const gateways = Array.from(new Set(daily.map(r => r.gateway_name))).sort();
    const m: Record<string, Record<string, DailyRow>> = {};
    daily.forEach(r => {
      if (!m[r.day]) m[r.day] = {};
      m[r.day][r.gateway_name] = r;
    });
    return { dayList: days, gatewayList: gateways, matrix: m };
  }, [daily]);

  const convColor = (pct: number | null) => {
    const v = Number(pct ?? 0);
    if (v >= 60) return "text-emerald-400";
    if (v >= 30) return "text-amber-400";
    if (v > 0) return "text-rose-400";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Conversão por Gateway</h3>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? "default" : "outline"}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-32" />
      ) : summary.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sem dados de PIX gerados no período. Os dados aparecem após o primeiro pagamento via cada gateway.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo por gateway */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.map(s => {
              const isBest = best?.gateway_name === s.gateway_name && Number(s.conversion_pct ?? 0) > 0;
              return (
                <Card
                  key={s.gateway_name}
                  className={cn(
                    "relative overflow-hidden border-border/60 bg-card/40 backdrop-blur",
                    isBest && "border-primary/40 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.5)]"
                  )}
                >
                  {isBest && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <Trophy className="w-3 h-3" /> Melhor
                    </div>
                  )}
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-foreground capitalize">{s.gateway_name}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className={cn("text-3xl font-bold tabular-nums", convColor(s.conversion_pct))}>
                        {Number(s.conversion_pct ?? 0).toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">conversão</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">PIX</span>
                        <span className="text-foreground font-semibold tabular-nums">{s.pix_generated}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Pagos</span>
                        <span className="text-emerald-400 font-semibold tabular-nums">{s.paid}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Receita</span>
                        <span className="text-foreground font-semibold tabular-nums">{formatCurrency(s.revenue)}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Ticket médio: <span className="text-foreground font-medium">{formatCurrency(s.avg_ticket)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tabela diária */}
          {dayList.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Conversão diária</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                        <th className="py-2 pr-4 font-medium">Dia</th>
                        {gatewayList.map(g => (
                          <th key={g} className="py-2 px-3 font-medium capitalize text-center">{g}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dayList.map(day => (
                        <tr key={day} className="border-b border-border/30 last:border-0">
                          <td className="py-2 pr-4 text-muted-foreground tabular-nums">
                            {new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </td>
                          {gatewayList.map(g => {
                            const cell = matrix[day]?.[g];
                            if (!cell) return <td key={g} className="py-2 px-3 text-center text-muted-foreground/50">—</td>;
                            return (
                              <td key={g} className="py-2 px-3 text-center">
                                <div className={cn("font-semibold tabular-nums", convColor(cell.conversion_pct))}>
                                  {Number(cell.conversion_pct ?? 0).toFixed(0)}%
                                </div>
                                <div className="text-[10px] text-muted-foreground tabular-nums">
                                  {cell.paid}/{cell.pix_generated}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default GatewayConversion;
