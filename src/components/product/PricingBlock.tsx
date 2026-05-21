import { Flame, Clock } from "lucide-react";
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
    <div className="relative tt-price-gradient tt-shine px-4 pt-3.5 pb-3.5 overflow-hidden">
      {/* subtle inner ring */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

      <div className="relative flex items-end justify-between">
        <div className="flex items-end gap-2">
          <span className="text-[13px] font-bold text-white/95 pb-1.5 leading-none">R$</span>
          <span className="text-[36px] leading-[0.9] font-black text-white tracking-tight inline-flex items-end drop-shadow-[0_2px_0_rgba(0,0,0,0.08)]">
            {reais}
            <span className="text-[15px] font-extrabold pb-[5px] ml-0.5">,{cents}</span>
          </span>
          <span className="text-[11px] text-white/75 line-through pb-2 ml-1.5 font-medium">
            {formatCurrency(originalPrice)}
          </span>
        </div>

        {showDiscountBadge && discountPercent > 0 && (
          <div className="flex flex-col items-end gap-1">
            <span className="bg-white text-[hsl(348,88%,48%)] text-[12px] font-black px-2 py-0.5 rounded shadow-sm">
              -{discountPercent}%
            </span>
            <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">
              OFF exclusivo
            </span>
          </div>
        )}
      </div>

      {flashSale && showFlashSale && (
        <div className="relative mt-2.5 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/25 backdrop-blur-sm rounded-full pl-1.5 pr-2 py-0.5">
            <Flame className="w-3 h-3 fill-yellow-300 text-yellow-300" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Flash</span>
          </div>
          <Clock className="w-3 h-3 text-white/90" />
          <span className="text-[10.5px] font-semibold text-white/95">Termina em</span>
          <div className="flex items-center gap-0.5">
            <span className="bg-black/40 text-white rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">{pad(h)}</span>
            <span className="text-white/80 font-bold text-[10px]">:</span>
            <span className="bg-black/40 text-white rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">{pad(m)}</span>
            <span className="text-white/80 font-bold text-[10px]">:</span>
            <span className="bg-black/40 text-white rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">{pad(s)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingBlock;
