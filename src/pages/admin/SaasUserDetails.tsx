import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package, ShoppingCart, DollarSign, Clock, Store as StoreIcon, Mail, Calendar, Percent } from "lucide-react";
import { format } from "date-fns";

interface UserDetails {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro" | "enterprise";
  transaction_fee_percent: number;
  monthly_price: number;
  user_created_at: string;
  total_products: number;
  total_orders: number;
  total_paid_orders: number;
  total_revenue: number;
  total_pending_revenue: number;
  total_stores: number;
}

interface UserProduct {
  product_id: string;
  title: string;
  slug: string;
  sale_price: number;
  original_price: number;
  active: boolean;
  created_at: string;
  thumbnail_url: string | null;
  total_orders: number;
  total_paid_orders: number;
  total_revenue: number;
  total_pending_revenue: number;
}

const planColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground border-border",
  pro: "bg-accent/10 text-accent border-accent/20",
  enterprise: "bg-primary/10 text-primary border-primary/20",
};

const fmtCurrency = (n: number) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SaasUserDetails = () => {
  const { userId } = useParams<{ userId: string }>();
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [d, p] = await Promise.all([
        (supabase as any).rpc("admin_user_details", { _target_user_id: userId }),
        (supabase as any).rpc("admin_user_products", { _target_user_id: userId }),
      ]);
      if (d.data && d.data.length > 0) setDetails(d.data[0] as UserDetails);
      if (p.data) setProducts(p.data as UserProduct[]);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <p className="text-sm text-muted-foreground">Usuário não encontrado.</p>
      </div>
    );
  }

  const stats = [
    { label: "Produtos", value: details.total_products, icon: Package, accent: "text-accent" },
    { label: "Pedidos totais", value: details.total_orders, icon: ShoppingCart, accent: "text-foreground" },
    { label: "Vendas aprovadas", value: details.total_paid_orders, icon: ShoppingCart, accent: "text-emerald-400" },
    { label: "Lojas", value: details.total_stores, icon: StoreIcon, accent: "text-foreground" },
  ];

  const revenueStats = [
    { label: "Faturamento aprovado", value: fmtCurrency(details.total_revenue), icon: DollarSign, accent: "text-emerald-400" },
    { label: "Pendente", value: fmtCurrency(details.total_pending_revenue), icon: Clock, accent: "text-amber-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para usuários
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold shrink-0">
            {(details.full_name || details.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{details.full_name || "—"}</h1>
              <Badge variant="outline" className={`text-[10px] font-medium ${planColors[details.plan] || ""}`}>
                {details.plan.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {details.email}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Cadastrado em {format(new Date(details.user_created_at), "dd/MM/yyyy")}</span>
              <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Taxa {details.transaction_fee_percent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">{s.label}</span>
                <s.icon className={`w-3.5 h-3.5 ${s.accent}`} />
              </div>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {revenueStats.map((s) => (
          <Card key={s.label} className="border-border/60 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">{s.label}</span>
                <s.icon className={`w-3.5 h-3.5 ${s.accent}`} />
              </div>
              <p className={`text-2xl font-bold tracking-tight font-mono ${s.accent}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Products */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Package className="w-4 h-4 text-accent" />
            Produtos cadastrados ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile */}
          <div className="space-y-3 p-3 md:hidden">
            {products.map((p) => (
              <div key={p.product_id} className="rounded-2xl border border-border bg-background p-3 space-y-3">
                <div className="flex items-center gap-3">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt={p.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{fmtCurrency(p.sale_price)}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${p.active ? "border-emerald-500/30 text-emerald-400" : "border-border text-muted-foreground"}`}>
                    {p.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/60">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Vendas</p>
                    <p className="text-sm font-semibold text-emerald-400">{p.total_paid_orders}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Aprovado</p>
                    <p className="text-xs font-mono font-semibold text-emerald-400">{fmtCurrency(p.total_revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Pendente</p>
                    <p className="text-xs font-mono font-semibold text-amber-400">{fmtCurrency(p.total_pending_revenue)}</p>
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">Nenhum produto cadastrado.</p>
            )}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Produto</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Preço</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium text-right">Pedidos</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium text-right">Vendas</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium text-right">Aprovado</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium text-right">Pendente</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.product_id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt={p.title} className="w-9 h-9 rounded-md object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-sm font-medium max-w-[260px] truncate">{p.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{fmtCurrency(p.sale_price)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${p.active ? "border-emerald-500/30 text-emerald-400" : "border-border text-muted-foreground"}`}>
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono">{p.total_orders}</TableCell>
                    <TableCell className="text-sm text-right font-mono text-emerald-400">{p.total_paid_orders}</TableCell>
                    <TableCell className="text-sm text-right font-mono text-emerald-400">{fmtCurrency(p.total_revenue)}</TableCell>
                    <TableCell className="text-sm text-right font-mono text-amber-400">{fmtCurrency(p.total_pending_revenue)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-sm">
                      Nenhum produto cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaasUserDetails;
