import { usePlanLimits } from "@/hooks/usePlanLimits";
import { PLANS } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Crown, Zap, Rocket, Percent, DollarSign, Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const planIcons = { free: Zap, pro: Crown, enterprise: Rocket };

const AdminPlans = () => {
  const { plan, planType, isLoading } = usePlanLimits();

  const { data: monthlyFees } = useQuery({
    queryKey: ["monthly-fees"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await (supabase as any)
        .from("invoices")
        .select("fee_amount")
        .gte("created_at", startOfMonth.toISOString());

      return data?.reduce((sum: number, inv: any) => sum + Number(inv.fee_amount), 0) ?? 0;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  const PlanIcon = planIcons[planType];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Plano & Faturamento</h1>
        <p className="text-muted-foreground text-sm mt-1">Seu plano atual e taxas de transação</p>
      </div>

      {/* Current Plan Card */}
      <Card className="bg-card border-border/60 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <PlanIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
              <Badge variant="outline" className="border-accent/20 text-accent text-[10px] font-medium">{plan.badge}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{plan.description}</p>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-card border-border/60 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Taxa por venda</span>
          </div>
          <p className="text-3xl font-mono font-bold text-accent">{plan.transactionFeePercent}%</p>
          <p className="text-[11px] text-muted-foreground">Cobrado automaticamente em cada venda aprovada</p>
        </Card>

        <Card className="bg-card border-border/60 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Mensalidade</span>
          </div>
          <p className="text-3xl font-mono font-bold text-foreground">
            {plan.monthlyPrice === 0 ? (
              <span className="text-void-success">Grátis</span>
            ) : (
              <>R${plan.monthlyPrice}<span className="text-sm text-muted-foreground font-normal">/mês</span></>
            )}
          </p>
        </Card>

        <Card className="bg-card border-border/60 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Taxas do mês</span>
          </div>
          <p className="text-3xl font-mono font-bold text-foreground">
            R${(monthlyFees ?? 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground">Total acumulado de taxas neste mês</p>
        </Card>
      </div>

      {/* All Plans Comparison */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-4">Comparativo de Planos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.values(PLANS).map((p) => {
            const PlIcon = planIcons[p.type];
            const isCurrent = p.type === planType;

            return (
              <Card
                key={p.type}
                className={`bg-card border p-5 space-y-4 transition-colors duration-150 ${
                  isCurrent ? 'border-accent/40' : 'border-border/60 hover:border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isCurrent ? 'bg-gradient-to-br from-primary to-accent' : 'bg-muted'
                  }`}>
                    <PlIcon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{p.name}</h4>
                    {isCurrent && <span className="text-[10px] text-accent font-medium">Plano atual</span>}
                  </div>
                </div>

                <ul className="space-y-2.5 text-sm">
                  <li className="flex justify-between text-muted-foreground">
                    <span>Taxa por venda</span>
                    <span className="font-mono font-medium text-foreground">{p.transactionFeePercent}%</span>
                  </li>
                  <li className="flex justify-between text-muted-foreground">
                    <span>Mensalidade</span>
                    <span className="font-mono font-medium text-foreground">
                      {p.monthlyPrice === 0 ? 'Grátis' : `R$${p.monthlyPrice}`}
                    </span>
                  </li>
                  <li className="flex justify-between text-muted-foreground">
                    <span>Produtos</span>
                    <span className="font-mono font-medium text-foreground">Ilimitados</span>
                  </li>
                  <li className="flex justify-between text-muted-foreground">
                    <span>Lojas</span>
                    <span className="font-mono font-medium text-foreground">Ilimitadas</span>
                  </li>
                  <li className="flex justify-between text-muted-foreground">
                    <span>Views/mês</span>
                    <span className="font-mono font-medium text-foreground">Ilimitados</span>
                  </li>
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminPlans;
