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
  onAddToCart,
  buttonText = "Comprar Agora",
}: FixedFooterProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-stretch h-[60px] px-3 gap-2 max-w-screen-lg mx-auto py-2">
        <button className="flex flex-col items-center justify-center w-12 text-foreground/70">
          <Store className="w-[22px] h-[22px]" strokeWidth={1.8} />
          <span className="text-[9px] mt-0.5">Loja</span>
        </button>
        <button className="flex flex-col items-center justify-center w-12 text-foreground/70 relative">
          <ShoppingCart className="w-[22px] h-[22px]" strokeWidth={1.8} />
          <span className="text-[9px] mt-0.5">Carrinho</span>
        </button>

        {/* Combined gradient buy buttons */}
        <div className="flex-1 flex rounded-full overflow-hidden shadow-md">
          <button
            onClick={onAddToCart || onBuyNow}
            className="flex-1 bg-gradient-to-r from-[hsl(35,100%,55%)] to-[hsl(25,100%,55%)] text-white text-[13px] font-extrabold flex flex-col items-center justify-center leading-tight"
          >
            <span>Adicionar</span>
            <span className="text-[10px] font-semibold opacity-90">ao carrinho</span>
          </button>
          <button
            onClick={onBuyNow}
            className="flex-1 bg-gradient-to-r from-marketplace-red to-[hsl(345,90%,48%)] text-white text-[13px] font-extrabold flex flex-col items-center justify-center leading-tight"
          >
            <span>{buttonText}</span>
            <span className="text-[10px] font-semibold opacity-90">Frete grátis</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FixedFooter;
