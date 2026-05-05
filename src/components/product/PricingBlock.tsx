import { Zap } from "lucide-react";
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

  return (
    <div className="bg-gradient-to-r from-[hsl(28,100%,55%)] via-[hsl(20,100%,52%)] to-[hsl(12,95%,52%)] px-4 pt-3 pb-3">
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-1.5">
          <span className="text-[13px] font-bold text-white pb-1">R$</span>
          <span className="text-[30px] leading-none font-black text-white tracking-tight">
            {Math.floor(salePrice).toLocaleString("pt-BR")}
          </span>
          <span className="text-[14px] font-bold text-white pb-1">
            ,{(salePrice % 1).toFixed(2).slice(2)}
          </span>
          <span className="text-[12px] text-white/80 line-through pb-1.5 ml-1">
            {formatCurrency(originalPrice)}
          </span>
        </div>
        {showDiscountBadge && (
          <span className="bg-white/95 text-[hsl(20,100%,48%)] text-[11px] font-black px-2 py-0.5 rounded">
            -{discountPercent}%
          </span>
        )}
      </div>

      {flashSale && showFlashSale && (
        <div className="flex items-center gap-1.5 mt-2 text-white">
          <Zap className="w-3 h-3 fill-current" />
          <span className="text-[11px] font-semibold">Termina em</span>
          <span className="bg-black/30 rounded px-1 py-0.5 font-mono text-[10px]">{pad(h)}</span>
          <span className="text-[10px]">:</span>
          <span className="bg-black/30 rounded px-1 py-0.5 font-mono text-[10px]">{pad(m)}</span>
          <span className="text-[10px]">:</span>
          <span className="bg-black/30 rounded px-1 py-0.5 font-mono text-[10px]">{pad(s)}</span>
        </div>
      )}
    </div>
  );
};

export default PricingBlock;
