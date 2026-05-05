import { Truck, ShieldCheck } from "lucide-react";

interface ShippingInfoProps {
  freeShipping: boolean;
  shippingCost: number;
  estimatedDelivery: string;
  shippingLabel?: string;
}

const ShippingInfo = ({ freeShipping, shippingCost, estimatedDelivery, shippingLabel = "frete grátis" }: ShippingInfoProps) => {
  return (
    <div className="bg-card px-4 pt-3 pb-2">
      <div className="flex items-start gap-3">
        <Truck className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {freeShipping && (
              <span className="text-[11px] font-semibold text-marketplace-green bg-marketplace-green/10 px-2 py-0.5 rounded-full">
                {shippingLabel}
              </span>
            )}
            <span className="text-sm text-foreground">
              {estimatedDelivery || "Receba até 10/05"}
            </span>
          </div>
          {freeShipping && shippingCost > 0 && (
            <p className="text-xs text-muted-foreground mt-1 line-through">
              Taxa de envio: R$ {shippingCost.toFixed(2).replace('.', ',')}
            </p>
          )}
          {!freeShipping && shippingCost > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de envio: <span className="font-medium text-foreground">R$ {shippingCost.toFixed(2).replace('.', ',')}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Devoluções gratuitas em 30 dias · Cancelamento fácil</p>
      </div>
    </div>
  );
};

export default ShippingInfo;
