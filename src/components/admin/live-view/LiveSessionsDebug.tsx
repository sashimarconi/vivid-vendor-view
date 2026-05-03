import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bug, RefreshCw } from "lucide-react";

interface SessionRow {
  session_id: string;
  page_url: string | null;
  last_seen_at: string;
  source: "heartbeat" | "event";
  age_s: number;
}

const classify = (url: string | null) => {
  const u = (url || "").toLowerCase();
  if (u.includes("/checkout")) return "checkout";
  if (u.includes("/product/") || u.includes("/p/")) return "produto";
  if (u && u !== "/") return "loja";
  return "outros";
};

const LiveSessionsDebug = () => {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [windowSec, setWindowSec] = useState(60);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowSec * 1000).toISOString();
    try {
      const [hb, ev] = await Promise.all([
        supabase
          .from("visitor_sessions")
          .select("session_id, page_url, last_seen_at")
          .gte("last_seen_at", cutoff)
          .order("last_seen_at", { ascending: false })
          .limit(1000),
        supabase
          .from("page_events")
          .select("session_id, page_url, created_at")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      const map = new Map<string, SessionRow>();
      (hb.data || []).forEach((s) => {
        if (!s.session_id) return;
        map.set(s.session_id, {
          session_id: s.session_id,
          page_url: s.page_url,
          last_seen_at: s.last_seen_at,
          source: "heartbeat",
          age_s: Math.round((now.getTime() - new Date(s.last_seen_at).getTime()) / 1000),
        });
      });
      (ev.data || []).forEach((e: { session_id: string; page_url: string | null; created_at: string }) => {
        if (!e.session_id || map.has(e.session_id)) return;
        map.set(e.session_id, {
          session_id: e.session_id,
          page_url: e.page_url,
          last_seen_at: e.created_at,
          source: "event",
          age_s: Math.round((now.getTime() - new Date(e.created_at).getTime()) / 1000),
        });
      });

      setRows(Array.from(map.values()).sort((a, b) => a.age_s - b.age_s));
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("debug fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSec]);

  const counts = useMemo(() => {
    const c = { checkout: 0, loja: 0, produto: 0, outros: 0 };
    rows.forEach((r) => {
      c[classify(r.page_url) as keyof typeof c]++;
    });
    return c;
  }, [rows]);

  const grouped = useMemo(() => {
    const g = new Map<string, number>();
    rows.forEach((r) => {
      const key = r.page_url || "(sem URL)";
      g.set(key, (g.get(key) || 0) + 1);
    });
    return Array.from(g.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <Card className="border-border border-dashed border-amber-500/40">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-foreground">Debug — Sessões ao vivo</span>
            <Badge variant="outline">{rows.length} sessões</Badge>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={windowSec}
              onChange={(e) => setWindowSec(Number(e.target.value))}
              className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground"
            >
              <option value={30}>Janela 30s</option>
              <option value={60}>Janela 60s</option>
              <option value={120}>Janela 120s</option>
              <option value={300}>Janela 5min</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted/50 text-foreground"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded border border-border p-2">
            <div className="text-muted-foreground">Na loja</div>
            <div className="text-lg font-bold text-foreground">{counts.loja}</div>
          </div>
          <div className="rounded border border-border p-2">
            <div className="text-muted-foreground">Em produto</div>
            <div className="text-lg font-bold text-foreground">{counts.produto}</div>
          </div>
          <div className="rounded border border-border p-2">
            <div className="text-muted-foreground">No checkout</div>
            <div className="text-lg font-bold text-foreground">{counts.checkout}</div>
          </div>
          <div className="rounded border border-border p-2">
            <div className="text-muted-foreground">Outros</div>
            <div className="text-lg font-bold text-foreground">{counts.outros}</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Por URL</div>
          <div className="max-h-48 overflow-auto rounded border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8">URL</TableHead>
                  <TableHead className="h-8 w-20 text-right">Sessões</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map(([url, n]) => (
                  <TableRow key={url}>
                    <TableCell className="py-1.5 text-xs text-foreground truncate max-w-[420px]" title={url}>
                      <Badge variant="outline" className="mr-2 text-[10px]">{classify(url)}</Badge>
                      {url}
                    </TableCell>
                    <TableCell className="py-1.5 text-right text-xs font-semibold">{n}</TableCell>
                  </TableRow>
                ))}
                {grouped.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="py-3 text-center text-xs text-muted-foreground">Sem sessões na janela.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Sessões individuais</div>
          <div className="max-h-64 overflow-auto rounded border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8">Session ID</TableHead>
                  <TableHead className="h-8">URL</TableHead>
                  <TableHead className="h-8 w-20">Origem</TableHead>
                  <TableHead className="h-8 w-16 text-right">Idade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((r) => (
                  <TableRow key={r.session_id}>
                    <TableCell className="py-1.5 text-[11px] font-mono text-muted-foreground">{r.session_id.slice(0, 10)}…</TableCell>
                    <TableCell className="py-1.5 text-xs text-foreground truncate max-w-[320px]" title={r.page_url || ""}>{r.page_url || "—"}</TableCell>
                    <TableCell className="py-1.5 text-xs">
                      <Badge variant={r.source === "heartbeat" ? "default" : "secondary"} className="text-[10px]">{r.source}</Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-xs text-right text-muted-foreground">{r.age_s}s</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Atualizado {updatedAt ? updatedAt.toLocaleTimeString("pt-BR") : "—"} • dados brutos do banco (heartbeats de visitor_sessions + page_events recentes)
        </p>
      </CardContent>
    </Card>
  );
};

export default LiveSessionsDebug;
