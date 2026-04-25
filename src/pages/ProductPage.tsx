import { useEffect, useRef, useState } from "react";
import { usePageTracking, useVisitorHeartbeat } from "@/hooks/usePageTracking";
import { useTikTokPixel, trackTikTokViewContent } from "@/hooks/useTikTokPixel";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductBySlug, fetchStoreForProduct, fetchStoreProducts, fetchStoreSettings } from "@/lib/supabase-queries";
import {
  DEFAULT_PRODUCT_PAGE_BUILDER_CONFIG,
  normalizeProductPageBuilderConfig,
  PRODUCT_PAGE_PREVIEW_MESSAGE_TYPE,
  PRODUCT_PAGE_PREVIEW_READY_MESSAGE_TYPE,
  type ProductPageBuilderConfig,
} from "@/lib/product-page-builder";
import ProductHeader from "@/components/product/ProductHeader";
import ProductGallery from "@/components/product/ProductGallery";
import PricingBlock from "@/components/product/PricingBlock";
import ProductInfo from "@/components/product/ProductInfo";
import ShippingInfo from "@/components/product/ShippingInfo";
import TrustBadges from "@/components/product/TrustBadges";
import ReviewsSection from "@/components/product/ReviewsSection";
import StoreCard from "@/components/product/StoreCard";
import RelatedProducts from "@/components/product/RelatedProducts";
import FixedFooter from "@/components/product/FixedFooter";
import BuySheet from "@/components/product/BuySheet";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });

  // Carrega APENAS os pixels do dono da loja (multi-tenant safe)
  useTikTokPixel(product?.user_id);
  usePageTracking("page_view", product?.user_id);
  useVisitorHeartbeat(product?.user_id);

  // Dispara ViewContent quando o produto é carregado
  useEffect(() => {
    if (product?.id) {
      trackTikTokViewContent({
        contentId: product.id,
        contentName: product.title,
        value: Number(product.sale_price || 0),
      });
    }
  }, [product?.id]);

  const { data: productStore } = useQuery({
    queryKey: ["product-store", product?.id],
    queryFn: () => fetchStoreForProduct(product!.id),
    enabled: !!product?.id,
  });

  const { data: storeProducts } = useQuery({
    queryKey: ["store-products", productStore?.id],
    queryFn: () => fetchStoreProducts(productStore!.id),
    enabled: !!productStore?.id,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => fetchStoreSettings(),
  });

  const { data: builderRaw } = useQuery({
    queryKey: ["product-page-builder-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_page_builder_config" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) return null;
      return data as any;
    },
  });

  const [previewBuilder, setPreviewBuilder] = useState<ProductPageBuilderConfig | null>(null);

  useEffect(() => {
    const isPreviewMode = new URLSearchParams(window.location.search).get("preview") === "true";
    if (!isPreviewMode) return;

    window.parent.postMessage({ type: PRODUCT_PAGE_PREVIEW_READY_MESSAGE_TYPE }, window.location.origin);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PRODUCT_PAGE_PREVIEW_MESSAGE_TYPE) return;
      setPreviewBuilder(normalizeProductPageBuilderConfig(event.data.config));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const builder = previewBuilder ?? normalizeProductPageBuilderConfig(builderRaw?.config ?? DEFAULT_PRODUCT_PAGE_BUILDER_CONFIG);

  const reviewsRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const handleVariantSelect = (variant: { thumbnail: string }) => {
    if (!variant.thumbnail || !product?.product_images) return;
    const idx = product.product_images.findIndex((img) => img.url === variant.thumbnail);
    if (idx >= 0) setGalleryIndex(idx);
  };

  const handleBuyNow = (selectedVariants: Record<string, string> | string | null, quantity: number) => {
    setBuySheetOpen(false);
    if (product?.checkout_type === "external" && product.external_checkout_url) {
      window.open(product.external_checkout_url, "_blank");
    } else {
      const params = new URLSearchParams();
      if (typeof selectedVariants === "string") {
        params.set("variant", selectedVariants);
      } else if (selectedVariants && typeof selectedVariants === "object") {
        const variantValues = Object.values(selectedVariants).join(",");
        if (variantValues) params.set("variant", variantValues);
      }
      if (quantity > 1) params.set("qty", String(quantity));
      navigate(`/checkout/${slug}?${params.toString()}`);
    }
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const otherProducts = (storeProducts || []).filter((p) => p.id !== product.id);

  const images = (product.product_images || []).map((img) => ({ id: img.id, url: img.url, alt: img.alt || "" }));
  const variants = (product.product_variants || []).map((v) => ({ id: v.id, name: v.name, color: v.color || "", thumbnail: v.thumbnail_url || "", groupId: v.variant_group_id || null }));
  const variantGroups = (product.variant_groups || []).map((g) => ({ id: g.id, name: g.name }));
  const reviews = (product.reviews || []).map((r) => ({ id: r.id, userName: r.user_name, userAvatar: r.user_avatar_url || "", city: r.city || "", rating: r.rating, comment: r.comment || "", photos: r.photos || [], date: r.review_date || "" }));

  const relatedFormatted = otherProducts.map((p) => ({
    id: p.slug, title: p.title, description: p.description || "",
    originalPrice: Number(p.original_price), salePrice: Number(p.sale_price), discountPercent: p.discount_percent,
    images: (p.product_images || []).map((img) => ({ id: img.id, url: img.url, alt: img.alt || "" })),
    variants: [], rating: Number(p.rating) || 0, reviewCount: p.review_count || 0, soldCount: p.sold_count || 0,
    promoTag: p.promo_tag || "", flashSale: p.flash_sale || false, flashSaleEndsIn: p.flash_sale_ends_in || "",
    freeShipping: p.free_shipping || false, shippingCost: Number(p.shipping_cost) || 0, estimatedDelivery: p.estimated_delivery || "",
    checkoutType: p.checkout_type as "external" | "pix", externalCheckoutUrl: p.external_checkout_url || "", reviews: [],
  }));

  const isSectionEnabled = (id: string) => {
    const s = builder.sections.find((s) => s.id === id);
    return s ? s.enabled : true;
  };

  const btnRadius = builder.appearance.button_radius === "full" ? "9999px" : builder.appearance.button_radius === "lg" ? "8px" : builder.appearance.button_radius === "md" ? "6px" : "0px";

  // Build section rendering map
  const sectionComponents: Record<string, React.ReactNode> = {
    
    gallery: isSectionEnabled("gallery") && (
      <ProductGallery images={images} currentIndex={galleryIndex} onIndexChange={setGalleryIndex} />
    ),
    pricing: isSectionEnabled("pricing") && (
      <PricingBlock
        originalPrice={Number(product.original_price)}
        salePrice={Number(product.sale_price)}
        discountPercent={product.discount_percent}
        flashSale={product.flash_sale || false}
        flashSaleEndsIn={product.flash_sale_ends_in || ""}
        showDiscountBadge={builder.conversion.show_discount_badge}
        showFlashSale={builder.conversion.show_flash_sale}
      />
    ),
    info: isSectionEnabled("info") && (
      <ProductInfo
        title={product.title}
        promoTag={product.promo_tag || ""}
        rating={Number(product.rating) || 0}
        reviewCount={product.review_count || 0}
        soldCount={product.sold_count || 0}
        variants={variants}
        variantGroups={variantGroups}
        showSoldCount={builder.conversion.show_sold_count}
        showUnitsAvailable={builder.conversion.show_units_available}
        unitsAvailableText={builder.texts.units_available_text}
        onVariantSelect={handleVariantSelect}
      />
    ),
    shipping: isSectionEnabled("shipping") && (
      <ShippingInfo
        freeShipping={product.free_shipping || false}
        shippingCost={Number(product.shipping_cost) || 0}
        estimatedDelivery={product.estimated_delivery || ""}
        shippingLabel={builder.texts.shipping_label}
      />
    ),
    trust_badges: isSectionEnabled("trust_badges") && <TrustBadges />,
    store_card: isSectionEnabled("store_card") && productStore && (
      <StoreCard
        store={{ name: productStore.name, avatar: productStore.logo_url || "", totalSales: productStore.total_sales || "0", rating: Number(productStore.rating) || 5.0 }}
        storeSlug={productStore.slug}
      />
    ),
    reviews: isSectionEnabled("reviews") && (
      <div ref={reviewsRef}>
        <ReviewsSection reviews={reviews} totalReviews={product.review_count || 0} title={builder.texts.reviews_title} />
      </div>
    ),
    description: isSectionEnabled("description") && (
      <div ref={descriptionRef} className="bg-card px-4 py-4 mt-2">
        <p className="text-sm font-bold text-foreground mb-3">{builder.texts.description_title}</p>
        {product.video_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <video src={product.video_url} className="w-full rounded-lg" controls playsInline preload="metadata" />
          </div>
        )}
        {product.description && product.description.includes("<") ? (
          <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
        )}
      </div>
    ),
    related: isSectionEnabled("related") && (
      <>
        <RelatedProducts title={builder.texts.related_title} products={relatedFormatted} />
        {relatedFormatted.length > 2 && <RelatedProducts title="Você também pode gostar" products={relatedFormatted.slice(0, 2)} />}
      </>
    ),
  };

  const logoUrl = builder.appearance.header_logo_url || storeSettings?.product_page_logo_url || undefined;

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: builder.appearance.bg_color || undefined }}>
      <ProductHeader
        logoUrl={logoUrl}
        logoHeight={builder.appearance.header_logo_height}
        headerBgColor={builder.appearance.header_bg_color}
        showCartIcon={builder.appearance.show_cart_icon}
      />

      <div className="pt-12">
        {builder.sections.map((section) => (
          <div key={section.id}>{sectionComponents[section.id]}</div>
        ))}
      </div>

      <FixedFooter
        freeShipping={product.free_shipping || false}
        onBuyNow={() => {
          if (variants.length > 0) {
            setBuySheetOpen(true);
          } else {
            handleBuyNow(null, 1);
          }
        }}
        buttonText={builder.texts.buy_button_text}
        buttonColor={builder.appearance.button_color}
        buttonTextColor={builder.appearance.button_text_color}
        buttonRadius={btnRadius}
        shippingLabel={builder.texts.shipping_label}
      />

      <BuySheet
        open={buySheetOpen}
        onClose={() => setBuySheetOpen(false)}
        onConfirm={handleBuyNow}
        title={product.title}
        image={images[galleryIndex]?.url || images[0]?.url || ""}
        originalPrice={Number(product.original_price)}
        salePrice={Number(product.sale_price)}
        discountPercent={product.discount_percent}
        flashSale={product.flash_sale || false}
        flashSaleEndsIn={product.flash_sale_ends_in || ""}
        variants={variants}
        variantGroups={variantGroups}
      />
    </div>
  );
};

export default ProductPage;
