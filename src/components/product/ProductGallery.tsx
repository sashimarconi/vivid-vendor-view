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

  // Reset internal when images change
  useEffect(() => {
    if (!isControlled) setInternalIdx(0);
  }, [images.length, isControlled]);

  const setCurrent = (idx: number) => {
    if (isControlled) {
      onIndexChange?.(idx);
    } else {
      setInternalIdx(idx);
    }
  };

  const prev = () => setCurrent(current === 0 ? images.length - 1 : current - 1);
  const next = () => setCurrent(current === images.length - 1 ? 0 : current + 1);

  const currentImage = images[current];

  return (
    <div className="relative w-full bg-card">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={currentImage?.url}
          alt={currentImage?.alt || ""}
          className="w-full h-full object-contain transition-opacity duration-200"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/70 backdrop-blur-sm rounded-full p-1.5 shadow-md"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/70 backdrop-blur-sm rounded-full p-1.5 shadow-md"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-foreground/60 text-primary-foreground text-xs px-3 py-1 rounded-full font-medium backdrop-blur-sm">
            {current + 1}/{images.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGallery;
