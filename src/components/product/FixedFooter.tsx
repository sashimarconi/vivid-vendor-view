import { Store, ShoppingCart, ChevronRight } from "lucide-react";

interface FixedFooterProps {
  freeShipping: boolean;
  onBuyNow: () => void;
  onAddToCart?: () => void;
  buttonText?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonRadius?: string;
  shippingLabel?: string;
}

const FixedFooter = ({
  onBuyNow,
  buttonText = "Comprar Agora",
  buttonColor,
  buttonTextColor,
  buttonRadius,
}: FixedFooterProps) => {
  const usingCustomBg = !!buttonColor;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]">
      <div className="flex items-center h-[64px] px-3 gap-2.5 max-w-screen-lg mx-auto">
        <button className="flex flex-col items-center justify-center w-12 text-foreground/70 active:scale-95 transition-transform">
          <Store className="w-[22px] h-[22px]" strokeWidth={1.8} />
          <span className="text-[9px] mt-0.5 font-medium">Loja</span>
        </button>
        <button className="flex flex-col items-center justify-center w-12 text-foreground/70 active:scale-95 transition-transform">
          <ShoppingCart className="w-[22px] h-[22px]" strokeWidth={1.8} />
          <span className="text-[9px] mt-0.5 font-medium">Carrinho</span>
        </button>

        <button
          onClick={onBuyNow}
          className={`group relative flex-1 h-12 text-white text-[15px] font-extrabold tracking-wide tt-shine tt-pulse-cta active:scale-[0.985] transition-transform ${
            usingCustomBg ? "" : "tt-price-gradient"
          }`}
          style={{
            background: usingCustomBg ? buttonColor : undefined,
            color: buttonTextColor || undefined,
            borderRadius: buttonRadius || "9999px",
          }}
        >
          <span className="relative z-10 inline-flex items-center justify-center gap-1.5 uppercase">
            {buttonText}
            <ChevronRight className="w-4 h-4 -mr-0.5 transition-transform group-active:translate-x-0.5" strokeWidth={3} />
          </span>
        </button>
      </div>
    </div>
  );
};

export default FixedFooter;
