import { Store, ShoppingCart } from "lucide-react";

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
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center h-[60px] px-3 gap-3 max-w-screen-lg mx-auto">
        <button className="flex flex-col items-center justify-center w-12 text-foreground/70">
          <Store className="w-[22px] h-[22px]" strokeWidth={1.8} />
          <span className="text-[9px] mt-0.5">Loja</span>
        </button>
        <button className="flex flex-col items-center justify-center w-12 text-foreground/70">
          <ShoppingCart className="w-[22px] h-[22px]" strokeWidth={1.8} />
          <span className="text-[9px] mt-0.5">Carrinho</span>
        </button>

        <button
          onClick={onBuyNow}
          className="flex-1 h-11 text-white text-sm font-bold shadow-md"
          style={{
            background: buttonColor || "linear-gradient(to right, hsl(var(--marketplace-red)), hsl(345, 90%, 48%))",
            color: buttonTextColor || undefined,
            borderRadius: buttonRadius || "9999px",
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default FixedFooter;
