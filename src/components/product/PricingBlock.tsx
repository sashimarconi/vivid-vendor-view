import { Zap, Ticket, TrendingDown } from "lucide-react";
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

  const couponDiscount = Math.max(5, Math.min(50, Math.round((originalPrice - salePrice) * 0.05)));

  return (
    <div>
      {/* Bold red TikTok price banner */}
      <div className="bg-gradient-to-br from-marketplace-red via-[hsl(0,85%,52%)] to-[hsl(345,90%,48%)] px-4 pt-3.5 pb-3 relative overflow-hidden">
        {/* Decorative blur circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 left-1/2 w-40 h-20 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex items-end justify-between">
          <div className="flex items-end gap-1.5">
            <span className="text-[13px] font-bold text-white pb-[6px]">R$</span>
            <span className="text-[34px] leading-none font-black text-white tracking-tight">
              {Math.floor(salePrice).toLocaleString("pt-BR")}
            </span>
            <span className="text-[16px] font-black text-white pb-1.5">
              ,{(salePrice % 1).toFixed(2).slice(2)}
            </span>
            <span className="text-[12px] text-white/80 line-through pb-1.5 ml-1">
              {formatCurrency(originalPrice)}
            </span>
          </div>
          {showDiscountBadge && (
            <div className="bg-white text-marketplace-red text-[12px] font-black px-2 py-1 rounded-md shadow-md">
              -{discountPercent}%
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded">
            <TrendingDown className="w-3 h-3" />
            Menor preço em 30 dias
          </span>
          {flashSale && showFlashSale && (
            <span className="inline-flex items-center gap-1 text-white text-[10px] font-bold">
              <Zap className="w-3 h-3 fill-current" />
              Termina em
              <span className="bg-black/40 rounded px-1 py-0.5 font-mono ml-0.5">{pad(h)}</span>
              <span>:</span>
              <span className="bg-black/40 rounded px-1 py-0.5 font-mono">{pad(m)}</span>
              <span>:</span>
              <span className="bg-black/40 rounded px-1 py-0.5 font-mono">{pad(s)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Coupon strip */}
      <div className="bg-marketplace-red-light/40 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-3.5 h-3.5 text-marketplace-red" />
          <p className="text-[11px] text-foreground">
            Cupom de <span className="font-bold text-marketplace-red">15% OFF</span>, até <span className="font-bold">R${couponDiscount}</span>
          </p>
        </div>
        <button className="text-[11px] font-bold text-marketplace-red bg-white px-2.5 py-0.5 rounded-full border border-marketplace-red">
          Coletar
        </button>
      </div>
    </div>
  );
};

export default PricingBlock;
