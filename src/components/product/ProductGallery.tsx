import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/data/mockData";

interface ProductGalleryProps {
  images: ProductImage[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

const ProductGallery = ({ images, currentIndex, onIndexChange }: ProductGalleryProps) => {
  const [internalIdx, setInternalIdx] = useState(0);
  const isControlled = currentIndex !== undefined;
  const current = isControlled ? currentIndex! : internalIdx;

  useEffect(() => {
    if (!isControlled) setInternalIdx(0);
  }, [images.length, isControlled]);

  const setCurrent = (idx: number) => {
    if (isControlled) onIndexChange?.(idx);
    else setInternalIdx(idx);
  };

  const prev = () => setCurrent(current === 0 ? images.length - 1 : current - 1);
  const next = () => setCurrent(current === images.length - 1 ? 0 : current + 1);

  const currentImage = images[current];

  return (
    <div className="relative w-full bg-card">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/60 via-muted to-muted/80">
        <img
          src={currentImage?.url}
          alt={currentImage?.alt || ""}
          className="w-full h-full object-contain transition-opacity duration-200"
        />

        {/* Counter pill */}
        {images.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/55 backdrop-blur text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full tabular-nums">
            {current + 1} / {images.length}
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white backdrop-blur-sm rounded-full p-1.5 shadow-md active:scale-90 transition"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" strokeWidth={2.5} />
            </button>
            <button
              onClick={next}
              aria-label="Próxima"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white backdrop-blur-sm rounded-full p-1.5 shadow-md active:scale-90 transition"
            >
              <ChevronRight className="w-4 h-4 text-foreground" strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/35 backdrop-blur-sm rounded-full px-2 py-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Imagem ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-5 bg-white" : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGallery;
