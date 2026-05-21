import { Flame, Music2 } from "lucide-react";
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

const pad = (n: number) => n.toString().padStart(2, "0");

const PricingBlock = ({ originalPrice, salePrice, discountPercent, flashSale, flashSaleEndsIn, showDiscountBadge = true, showFlashSale = true }: PricingBlockProps) => {
  const [secondsLeft, setSecondsLeft] = useState(() => parseTimeToSeconds(flashSaleEndsIn));

  useEffect(() => {
    if (!flashSale) return;
    const interval = setInterval(() => setSecondsLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [flashSale]);

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  const cents = (salePrice % 1).toFixed(2).slice(2);
  const reais = Math.floor(salePrice).toLocaleString("pt-BR");

  return (
    <div className="relative tt-price-gradient tt-shine px-4 py-3 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Discount badge + original price stacked */}
          {(showDiscountBadge && discountPercent > 0) && (
            <div className="flex flex-col items-start shrink-0">
              <span className="bg-white/95 text-[hsl(348,88%,48%)] text-[12px] font-black px-2 py-0.5 rounded shadow-sm leading-tight">
                -{discountPercent}%
              </span>
              {originalPrice > salePrice && (
                <span className="text-[11px] text-white/70 line-through font-medium mt-0.5">
                  {formatCurrency(originalPrice)}
                </span>
              )}
            </div>
          )}

          {/* Big price */}
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-[13px] font-bold text-white/95 leading-none">R$</span>
            <span className="text-[32px] leading-none font-black text-white tracking-tight inline-flex items-baseline">
              {reais}
              <span className="text-[15px] font-extrabold ml-0.5">,{cents}</span>
            </span>
          </div>
        </div>

        {flashSale && showFlashSale && (
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 shrink-0">
            <Flame className="w-3 h-3 fill-yellow-300 text-yellow-300" />
            <span className="text-[11px] font-mono font-bold text-white tabular-nums">
              {pad(h)}:{pad(m)}:{pad(s)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingBlock;

