import { Zap, Ticket } from "lucide-react";
import { formatCurrency } from "@/data/mockData";
import { useState, useEffect } from "react";

interface PricingBlockProps {
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  flashSale: boolean;
  flashSaleEndsIn: string;
  showDiscountBadge?: boolean;
  showFlashSale?: boolean;
}

const parseTimeToSeconds = (timeStr: string): number => {
  const hmsMatch = timeStr.match(/(\d+):(\d+):(\d+)/);
  if (hmsMatch) return parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
  const dayMatch = timeStr.match(/(\d+)\s*dia/);
  if (dayMatch) return parseInt(dayMatch[1]) * 86400;
  return 3600;
};

const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const PricingBlock = ({ originalPrice, salePrice, discountPercent, flashSale, flashSaleEndsIn, showDiscountBadge = true, showFlashSale = true }: PricingBlockProps) => {
  const [secondsLeft, setSecondsLeft] = useState(() => parseTimeToSeconds(flashSaleEndsIn));

  useEffect(() => {
    if (!flashSale) return;
    const interval = setInterval(() => setSecondsLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [flashSale]);

  const couponDiscount = Math.max(5, Math.min(50, Math.round((originalPrice - salePrice) * 0.05)));

  return (
    <div>
      {/* Gradient price banner */}
      <div className="bg-gradient-to-r from-marketplace-orange via-[hsl(15,90%,55%)] to-marketplace-red px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showDiscountBadge && (
              <span className="bg-white/95 text-marketplace-red text-[11px] font-extrabold px-2 py-0.5 rounded">
                {discountPercent}% OFF
              </span>
            )}
            <span className="text-2xl font-extrabold text-primary-foreground tracking-tight">
              R$ {salePrice.toFixed(2).replace('.', ',')}
            </span>
          </div>
          {flashSale && showFlashSale && (
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-1 text-primary-foreground text-[11px] font-bold">
                <Zap className="w-3 h-3 fill-current" />
                Oferta Relâmpago
              </span>
              <span className="text-[11px] text-primary-foreground/95">
                Termina em <span className="font-bold">{formatTime(secondsLeft)}</span>
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-primary-foreground/80 line-through mt-0.5">
          {formatCurrency(originalPrice)}
        </p>
      </div>

      {/* Coupon strip */}
      <div className="bg-marketplace-red/5 px-4 py-2 flex items-center justify-between border-b border-marketplace-red/10">
        <div className="flex items-center gap-2">
          <Ticket className="w-3.5 h-3.5 text-marketplace-red" />
          <p className="text-[11px] text-foreground">
            Desconto de <span className="font-bold">15%</span>, máximo de <span className="font-bold">R${couponDiscount}</span>
          </p>
        </div>
        <span className="text-[11px] font-bold text-marketplace-red">Cupom válido</span>
      </div>
    </div>
  );
};

export default PricingBlock;
