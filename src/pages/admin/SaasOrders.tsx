import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface SaasOrder {
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_title: string | null;
  product_variant: string | null;
  quantity: number;
  total: number;
  payment_status: string;
  payment_method: string;
  pix_copied: boolean | null;
  created_at: string;
  owner_email: string | null;
}

const statusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "Aprovado", className: "bg-void-success/10 text-void-success border-void-success/20" },
  pending: { label: "Pendente", className: "bg-void-warning/10 text-void-warning border-void-warning/20" },
  refused: { label: "Recusado", className: "bg-destructive/10 text-destructive border-destructive/20" },
  refunded: { label: "Reembolsado", className: "bg-primary/10 text-primary border-primary/20" },
};

const SaasOrders = () => {
  const [orders, setOrders] = useState<SaasOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_orders", {
      _limit: limit,
      _offset: page * limit,
      _status: statusFilter === "all" ? null : statusFilter,
    });

    if (!error && data) {
      setOrders(data as unknown as SaasOrder[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const filtered = orders.filter((o) =>
    (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_email || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.product_title || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.owner_email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Todos os Pedidos</h1>
        <p className="text-muted-foreground text-sm mt-1">Pedidos de todos os usuários da plataforma</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, produto ou dono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Aprovado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="refused">Recusado</SelectItem>
            <SelectItem value="refunded">Reembolsado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="w-4 h-4 text-accent" />
            Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-transparent border-t-accent" />
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 p-3 md:hidden">
                {filtered.map((order) => {
                  const st = statusMap[order.payment_status] || { label: order.payment_status, className: "" };
                  return (
                    <div key={order.order_id} className="rounded-2xl border border-border bg-background p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{order.customer_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{order.customer_email}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-medium shrink-0 ${st.className}`}>{st.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{order.product_title || "—"}</span>
                        <span className="font-medium font-mono text-sm">R$ {Number(order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate">Dono: {order.owner_email || "—"}</span>
                        <span>{format(new Date(order.created_at), "dd/MM HH:mm")}</span>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-12 text-sm">Nenhum pedido encontrado.</p>
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Cliente</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Produto</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Total</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Status</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">PIX Copiado</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Dono</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((order) => {
                      const st = statusMap[order.payment_status] || { label: order.payment_status, className: "" };
                      return (
                        <TableRow key={order.order_id} className="border-border/40 hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{order.customer_name}</p>
                              <p className="text-[11px] text-muted-foreground">{order.customer_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{order.product_title || "—"}</p>
                              {order.product_variant && (
                                <p className="text-[11px] text-muted-foreground">{order.product_variant}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium font-mono">
                            R$ {Number(order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-medium ${st.className}`}>{st.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {order.payment_method === "pix" ? (
                              <Badge variant="outline" className={`text-[10px] font-medium ${order.pix_copied ? "bg-void-success/10 text-void-success border-void-success/20" : "bg-muted text-muted-foreground border-border"}`}>
                                {order.pix_copied ? "Sim" : "Não"}
                              </Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">
                            {order.owner_email || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-sm">
                          Nenhum pedido encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Página {page + 1} · {filtered.length} resultado(s)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-8 text-xs">
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={orders.length < limit} onClick={() => setPage(page + 1)} className="h-8 text-xs">
            Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SaasOrders;
