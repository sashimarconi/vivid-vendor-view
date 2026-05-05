import { ShieldCheck, ChevronRight, Truck, RotateCcw, CreditCard, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrustBadges } from "@/lib/supabase-queries";

const ICONS = [Truck, RotateCcw, CreditCard, BadgeCheck];

const TrustBadges = () => {
  const { data: badges } = useQuery({
    queryKey: ["trust-badges"],
    queryFn: fetchTrustBadges,
  });

  const defaultBadges = [
    "Devolução grátis 30 dias",
    "Reembolso por danos",
    "Pagamento 100% seguro",
    "Cupom por atraso",
  ];

  const items = badges && badges.length > 0
    ? badges.map((b: any) => b.title)
    : defaultBadges;

  return (
    <div className="bg-card mt-2 px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-marketplace-red" />
          <p className="text-[13px] font-bold text-foreground">Proteção do consumidor</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item: string, i: number) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <div key={i} className="flex items-center gap-2 bg-marketplace-red/[0.04] border border-marketplace-red/10 rounded-lg px-2.5 py-2">
              <Icon className="w-3.5 h-3.5 text-marketplace-red flex-shrink-0" />
              <span className="text-[11px] font-medium text-foreground leading-tight">{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrustBadges;
