import { Check, ShieldCheck, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrustBadges } from "@/lib/supabase-queries";

const TrustBadges = () => {
  const { data: badges } = useQuery({
    queryKey: ["trust-badges"],
    queryFn: fetchTrustBadges,
  });

  const defaultBadges = [
    "Devolução gratuita",
    "Reembolso automático por danos",
    "Pagamento seguro",
    "Cupom por atraso na coleta",
  ];

  const items = badges && badges.length > 0
    ? badges.map((b: any) => b.title)
    : defaultBadges;

  return (
    <div className="px-4 mt-3">
      <div className="rounded-xl border border-marketplace-orange/30 bg-marketplace-orange/5 p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-marketplace-orange" />
            <p className="text-sm font-bold text-foreground">Proteção do cliente</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-2">
          {items.map((item: string, i: number) => (
            <div key={i} className="flex items-start gap-1.5">
              <Check className="w-3.5 h-3.5 text-marketplace-orange flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-foreground leading-tight">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustBadges;
