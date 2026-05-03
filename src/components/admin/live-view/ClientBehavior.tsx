import { ShoppingCart, CreditCard, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ClientBehaviorProps {
  activeCarts: number;
  inCheckout: number;
  purchased: number;
}

export default function ClientBehavior({ activeCarts, inCheckout, purchased }: ClientBehaviorProps) {
  const fmt = (v: number): string => {
    if (v < 1000) return String(v);
    if (v < 1_000_000) return `${(Math.floor((v / 1000) * 10) / 10).toString().replace(".", ",")}k`;
    return `${(Math.floor((v / 1_000_000) * 10) / 10).toString().replace(".", ",")}M`;
  };
  const items = [
    { label: "Na loja", value: fmt(activeCarts), icon: ShoppingCart, color: "text-cyan-400", bg: "from-cyan-500/15", ring: "ring-cyan-500/20" },
    { label: "No checkout", value: fmt(inCheckout), icon: CreditCard, color: "text-violet-400", bg: "from-violet-500/15", ring: "ring-violet-500/20" },
    { label: "Comprado", value: fmt(purchased), icon: CheckCircle, color: "text-emerald-400", bg: "from-emerald-500/15", ring: "ring-emerald-500/20" },
  ];

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Comportamento do cliente</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ao vivo</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {items.map((item) => (
            <div
              key={item.label}
              className={`relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br ${item.bg} to-transparent p-3 text-center ring-1 ${item.ring}`}
            >
              <div className={`mx-auto mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-background/40 ${item.color}`}>
                <item.icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
