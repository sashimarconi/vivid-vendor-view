import { Truck, MapPin, ChevronRight, RotateCcw } from "lucide-react";

interface ShippingInfoProps {
  freeShipping: boolean;
  shippingCost: number;
  estimatedDelivery: string;
  shippingLabel?: string;
}

const ShippingInfo = ({ freeShipping, shippingCost, estimatedDelivery, shippingLabel = "Frete Grátis" }: ShippingInfoProps) => {
  return (
    <div className="bg-card mt-2 px-4 py-3">
      {/* Address row */}
      <button className="w-full flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-marketplace-red" />
          <span className="text-[12px] text-muted-foreground">Enviar para</span>
          <span className="text-[12px] font-semibold text-foreground">São Paulo, SP</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Free shipping highlight */}
      <div className="flex items-start gap-2.5 pt-3">
        <div className="w-7 h-7 rounded-full bg-marketplace-green/15 flex items-center justify-center flex-shrink-0">
          <Truck className="w-3.5 h-3.5 text-marketplace-green" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {freeShipping ? (
              <span className="text-[12px] font-extrabold text-marketplace-green">{shippingLabel}</span>
            ) : (
              <span className="text-[12px] font-extrabold text-foreground">
                Frete R$ {shippingCost.toFixed(2).replace(".", ",")}
              </span>
            )}
            {freeShipping && shippingCost > 0 && (
              <span className="text-[11px] text-muted-foreground line-through">
                R$ {shippingCost.toFixed(2).replace(".", ",")}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Receba {estimatedDelivery ? <span className="font-semibold text-foreground">{estimatedDelivery}</span> : <span className="font-semibold text-foreground">em 3-7 dias</span>} · Garantia de entrega
          </p>
        </div>
      </div>

      {/* Returns highlight */}
      <div className="flex items-start gap-2.5 pt-3 mt-3 border-t border-border">
        <div className="w-7 h-7 rounded-full bg-marketplace-orange/15 flex items-center justify-center flex-shrink-0">
          <RotateCcw className="w-3.5 h-3.5 text-marketplace-orange" />
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-bold text-foreground">Devolução grátis em 30 dias</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Reembolso integral · sem perguntas</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
      </div>
    </div>
  );
};

export default ShippingInfo;
