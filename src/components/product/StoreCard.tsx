import { Star, ChevronRight, BadgeCheck, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { StoreInfo } from "@/data/mockData";

interface StoreCardProps {
  store: StoreInfo;
  storeSlug?: string;
}

const StoreCard = ({ store, storeSlug }: StoreCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card mt-2 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={store.avatar}
            alt={store.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-marketplace-red rounded-full border-2 border-card flex items-center justify-center">
            <BadgeCheck className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[13px] font-bold text-foreground truncate">{store.name}</p>
            <span className="text-[9px] font-bold bg-marketplace-red/10 text-marketplace-red px-1 py-px rounded">
              MALL
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-marketplace-yellow text-marketplace-yellow" />
              <span className="font-semibold text-foreground">{store.rating}</span>
            </span>
            <span>·</span>
            <span>{store.totalSales} vendidos</span>
            <span>·</span>
            <span className="text-marketplace-green font-semibold">98% positivas</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button className="w-9 h-9 rounded-full border border-border flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={() => storeSlug && navigate(`/loja/${storeSlug}`)}
            className="flex items-center gap-0.5 border border-marketplace-red text-marketplace-red text-[11px] font-bold px-3 h-9 rounded-full"
          >
            Loja
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreCard;
