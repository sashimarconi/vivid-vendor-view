import { Star } from "lucide-react";
import { useState, useEffect } from "react";

interface Variant {
  id: string;
  name: string;
  color: string;
  thumbnail: string;
  groupId: string | null;
}

interface VariantGroup {
  id: string;
  name: string;
}

interface ProductInfoProps {
  title: string;
  promoTag: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  variants: Variant[];
  variantGroups?: VariantGroup[];
  showSoldCount?: boolean;
  showUnitsAvailable?: boolean;
  unitsAvailableText?: string;
  onVariantSelect?: (variant: Variant) => void;
}

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")} mil`;
  return n.toLocaleString("pt-BR");
};

const ProductInfo = ({ title, promoTag, rating, reviewCount, soldCount, variants, variantGroups = [], showSoldCount = true, showUnitsAvailable = true, unitsAvailableText = "13 unidades disponíveis", onVariantSelect }: ProductInfoProps) => {
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    variantGroups.forEach((g) => {
      const gv = variants.filter((v) => v.groupId === g.id);
      if (gv.length > 0) init[g.id] = gv[0].id;
    });
    const ungrouped = variants.filter((v) => !v.groupId);
    if (ungrouped.length > 0) init["_ungrouped"] = ungrouped[0].id;
    return init;
  });

  // Notify parent of initial selection on mount
  useEffect(() => {
    const firstSelectedId = Object.values(selections).find((id) => {
      const v = variants.find((x) => x.id === id);
      return v?.thumbnail;
    });
    if (firstSelectedId) {
      const v = variants.find((x) => x.id === firstSelectedId);
      if (v) onVariantSelect?.(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (groupId: string, v: Variant) => {
    setSelections((prev) => ({ ...prev, [groupId]: v.id }));
    onVariantSelect?.(v);
  };

  const ungroupedVariants = variants.filter((v) => !v.groupId);

  const renderGroup = (groupId: string, groupName: string, groupVariants: Variant[]) => {
    if (groupVariants.length === 0) return null;
    const hasVisuals = groupVariants.some((v) => v.thumbnail || v.color);

    return (
      <div key={groupId} className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">{groupName}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groupVariants.map((v, i) => (
            <button
              key={v.id}
              onClick={() => handleSelect(groupId, v)}
              className={`transition-all ${hasVisuals ? "flex flex-col items-center min-w-[72px] rounded-lg border-2 p-1.5" : "px-3 py-1.5 rounded-lg border-2 text-xs font-medium"} ${
                selections[groupId] === v.id
                  ? "border-marketplace-red shadow-md"
                  : "border-border"
              }`}
            >
              {hasVisuals ? (
                <>
                  {i === 0 && groupId !== "_ungrouped" && (
                    <span className="text-[8px] font-bold text-marketplace-red bg-marketplace-red-light px-1.5 py-0.5 rounded-sm mb-1">
                      MAIS VENDIDA
                    </span>
                  )}
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt={v.name} className="w-12 h-12 object-cover rounded" />
                  ) : v.color ? (
                    <div className="w-12 h-12 rounded" style={{ backgroundColor: v.color }} />
                  ) : null}
                  <span className="text-[10px] text-foreground mt-1 font-medium">{v.name}</span>
                </>
              ) : (
                <span className={selections[groupId] === v.id ? "text-marketplace-red" : "text-foreground"}>
                  {v.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card px-4 pt-3.5 pb-4">
      {promoTag && (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[hsl(348,88%,50%)] to-[hsl(8,92%,54%)] text-white text-[10px] font-extrabold px-2 py-[3px] rounded-md mb-2 uppercase tracking-wide shadow-sm">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          {promoTag}
        </span>
      )}
      <h1 className="text-[16px] font-bold text-foreground leading-snug tracking-tight">{title}</h1>

      <div className="flex items-center gap-2 mt-2.5">
        <div className="flex items-center gap-1 bg-marketplace-yellow/15 px-1.5 py-0.5 rounded-md">
          <Star className="w-3 h-3 fill-marketplace-yellow text-marketplace-yellow" />
          <span className="text-[11px] font-bold text-foreground tabular-nums">{rating}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">({formatCount(reviewCount)})</span>
        {showSoldCount && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{formatCount(soldCount)}</span> vendidos
            </span>
          </>
        )}
      </div>

      {showUnitsAvailable && (
        <div className="mt-3 flex items-center gap-2 bg-marketplace-red/5 border border-marketplace-red/15 rounded-lg px-2.5 py-2">
          <div className="flex-1 h-2 bg-marketplace-red/10 rounded-full overflow-hidden">
            <div
              className="h-full w-[35%] rounded-full tt-bar-flow"
              style={{
                background:
                  "linear-gradient(90deg, hsl(24 96% 54%) 0%, hsl(8 92% 54%) 50%, hsl(348 88% 50%) 100%, hsl(24 96% 54%) 100%)",
              }}
            />
          </div>
          <span className="text-[10.5px] font-extrabold text-marketplace-red whitespace-nowrap uppercase tracking-wide">
            🔥 {unitsAvailableText}
          </span>
        </div>
      )}

      {/* Variant groups */}
      {variantGroups.map((g) =>
        renderGroup(g.id, g.name, variants.filter((v) => v.groupId === g.id))
      )}

      {/* Ungrouped variants */}
      {ungroupedVariants.length > 0 && renderGroup("_ungrouped", "Opções", ungroupedVariants)}

    </div>
  );
};

export default ProductInfo;

