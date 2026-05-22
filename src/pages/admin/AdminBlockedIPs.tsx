import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Ban, Trash2, Plus, ShieldOff, Search } from "lucide-react";

interface BlockedIP {
  id: string;
  ip: string;
  reason: string | null;
  created_at: string;
}

interface RecentOrderIP {
  customer_ip: string;
  customer_name: string;
  count: number;
  last_at: string;
}

const AdminBlockedIPs = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  const { data: blocked = [], isLoading } = useQuery({
    queryKey: ["blocked-ips"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("blocked_ips")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlockedIP[];
    },
  });

  const { data: recentIPs = [] } = useQuery({
    queryKey: ["recent-order-ips"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("customer_ip, customer_name, created_at")
        .eq("user_id", user.id)
        .not("customer_ip", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map = new Map<string, RecentOrderIP>();
      (data || []).forEach((o: any) => {
        const key = o.customer_ip;
        if (!key) return;
        const e = map.get(key);
        if (e) {
          e.count += 1;
        } else {
          map.set(key, { customer_ip: key, customer_name: o.customer_name, count: 1, last_at: o.created_at });
        }
      });
      return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 20);
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ ipValue, reasonValue }: { ipValue: string; reasonValue: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await (supabase as any).from("blocked_ips").insert({
        user_id: user.id,
        ip: ipValue.trim(),
        reason: reasonValue.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocked-ips"] });
      setIp("");
      setReason("");
      toast({ title: "IP bloqueado!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("blocked_ips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocked-ips"] });
      toast({ title: "IP desbloqueado" });
    },
  });

  const handleAdd = () => {
    if (!ip.trim()) return;
    addMutation.mutate({ ipValue: ip, reasonValue: reason });
  };

  const isBlocked = (ipValue: string) => blocked.some((b) => b.ip === ipValue);

  const quickBlock = (ipValue: string) => {
    addMutation.mutate({ ipValue, reasonValue: "Bloqueio rápido" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldOff className="w-6 h-6 text-destructive" />
          IPs Bloqueados
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bloqueie IPs para impedir que gerem pedidos PIX na sua loja
        </p>
      </div>

      {/* Add manual */}
      <Card className="border-border/60 bg-card">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4" /> Bloquear novo IP
          </h2>
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Endereço IP</Label>
              <Input
                placeholder="Ex: 192.168.1.100"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo (opcional)</Label>
              <Input
                placeholder="Ex: Gerando pedidos falsos"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!ip.trim() || addMutation.isPending}
              className="gap-2"
            >
              <Ban className="w-4 h-4" />
              Bloquear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent IPs from orders */}
      {recentIPs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            IPs com mais pedidos recentes
          </h2>
          <div className="grid gap-2">
            {recentIPs.map((r) => {
              const already = isBlocked(r.customer_ip);
              return (
                <Card key={r.customer_ip} className="border-border/60 bg-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-foreground">{r.customer_ip}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.count} pedido{r.count > 1 ? "s" : ""} · último: {r.customer_name}
                      </p>
                    </div>
                    {already ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-destructive/10 text-destructive font-semibold">
                        Bloqueado
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => quickBlock(r.customer_ip)}
                        disabled={addMutation.isPending}
                        className="gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Bloquear
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Blocked list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Lista de IPs bloqueados ({blocked.length})
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-transparent border-t-accent" />
          </div>
        ) : blocked.length === 0 ? (
          <Card className="border-border/60 bg-card">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum IP bloqueado ainda
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {blocked.map((b) => (
              <Card key={b.id} className="border-border/60 bg-card">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-foreground">{b.ip}</p>
                    {b.reason && (
                      <p className="text-xs text-muted-foreground truncate">{b.reason}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(b.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBlockedIPs;
