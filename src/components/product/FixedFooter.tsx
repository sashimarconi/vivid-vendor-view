import { Store, MessageCircle } from "lucide-react";

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
  buttonColor,
  buttonTextColor,
  buttonRadius,
}: FixedFooterProps) => {
  const hasBtnColor = !!buttonColor;
  const radius = buttonRadius || "9999px";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center h-16 px-3 gap-2 max-w-screen-lg mx-auto">
        <button className="flex flex-col items-center justify-center w-11 text-muted-foreground">
          <Store className="w-5 h-5" />
          <span className="text-[9px] mt-0.5">Loja</span>
        </button>
        <button className="flex flex-col items-center justify-center w-11 text-muted-foreground">
          <MessageCircle className="w-5 h-5" />
          <span className="text-[9px] mt-0.5">Chat</span>
        </button>

        <button
          onClick={onAddToCart || onBuyNow}
          className="flex-1 h-11 rounded-full border-2 border-marketplace-red text-marketplace-red text-[13px] font-bold leading-tight px-2"
          style={{ borderRadius: radius }}
        >
          Adicionar ao<br />Carrinho
        </button>

        <button
          onClick={onBuyNow}
          className={`flex-1 h-11 text-[13px] font-bold ${!hasBtnColor ? "bg-marketplace-red text-primary-foreground" : ""}`}
          style={{
            borderRadius: radius,
            ...(hasBtnColor ? { backgroundColor: buttonColor, color: buttonTextColor || "#FFFFFF" } : {}),
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default FixedFooter;
