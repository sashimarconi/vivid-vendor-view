import { ArrowLeft, Search, Share2, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProductHeaderProps {
  activeSection?: string;
  onSectionClick?: (section: string) => void;
  cartCount?: number;
  logoUrl?: string;
  logoHeight?: number;
  headerBgColor?: string;
  showCartIcon?: boolean;
}

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.79a8.16 8.16 0 0 0 4.77 1.52V6.85a4.85 4.85 0 0 1-1.84-.16z" />
  </svg>
);

const ProductHeader = ({ logoUrl, logoHeight = 28, headerBgColor }: ProductHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: headerBgColor || undefined }}
    >
      {!headerBgColor && <div className="absolute inset-0 bg-card/95 backdrop-blur-md border-b border-border" />}
      <div className="relative flex items-center justify-between px-3 h-12">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-foreground/10 backdrop-blur flex items-center justify-center"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-foreground" strokeWidth={2.5} />
        </button>

        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="object-contain max-w-[140px]" style={{ height: logoHeight }} />
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 rounded-full bg-foreground/10 backdrop-blur flex items-center justify-center">
            <Search className="w-4 h-4 text-foreground" strokeWidth={2.5} />
          </button>
          <button className="w-8 h-8 rounded-full bg-foreground/10 backdrop-blur flex items-center justify-center">
            <MoreHorizontal className="w-4 h-4 text-foreground" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default ProductHeader;
