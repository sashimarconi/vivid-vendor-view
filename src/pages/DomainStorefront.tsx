import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking, useVisitorHeartbeat } from "@/hooks/usePageTracking";
import { useDomain } from "@/contexts/DomainContext";
import { Star } from "lucide-react";
import { formatCurrency } from "@/data/mockData";

const DomainStorefront = () => {
  const navigate = useNavigate();
  const { domainInfo } = useDomain();
  const ownerId = domainInfo.ownerUserId;

  usePageTracking("page_view", ownerId, { surface: "domain_storefront" });
  useVisitorHeartbeat(ownerId);

  // Fetch owner's stores
  const { data: stores } = useQuery({
    queryKey: ["domain-stores", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", ownerId!)
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!ownerId,
  });

  // Fetch owner's products
  const { data: products } = useQuery({
    queryKey: ["domain-products", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`*, product_images(id, url, alt, sort_order)`)
        .eq("user_id", ownerId!)
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!ownerId,
  });

  // Fetch store settings for branding
  const { data: storeSettings } = useQuery({
    queryKey: ["domain-store-settings", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("user_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!ownerId,
  });

  if (!ownerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Domínio não configurado</h1>
          <p className="text-muted-foreground">Este domínio não está vinculado a nenhuma loja.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with store branding */}
      <header className="bg-card px-4 py-4 shadow-sm border-b border-border">
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          {storeSettings?.avatar_url && (
            <img src={storeSettings.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {storeSettings?.name || domainInfo.domain}
            </h1>
            {storeSettings?.rating && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {storeSettings.rating}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stores */}
      {stores && stores.length > 1 && (
        <div className="px-4 py-4 max-w-screen-lg mx-auto">
          <h2 className="text-sm font-semibold text-foreground mb-3">Nossas Lojas</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => navigate(`/loja/${store.slug}`)}
                className="shrink-0 rounded-lg border border-border bg-card p-3 text-center min-w-[120px] hover:border-primary/50 transition-colors"
              >
                {store.logo_url && (
                  <img src={store.logo_url} alt="" className="w-10 h-10 rounded-full mx-auto mb-2 object-cover" />
                )}
                <p className="text-xs font-medium text-foreground truncate">{store.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      <div className="p-4 grid grid-cols-2 gap-3 max-w-screen-lg mx-auto">
        {products?.map((product) => (
          <button
            key={product.id}
            onClick={() => navigate(`/product/${product.slug}`)}
            className="text-left rounded-lg border border-border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={product.product_images?.[0]?.url || "/placeholder.svg"}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <h3 className="text-xs font-medium text-foreground line-clamp-2 mb-1">{product.title}</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(product.sale_price)}
                </span>
                {product.original_price > product.sale_price && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    {formatCurrency(product.original_price)}
                  </span>
                )}
              </div>
              {product.discount_percent > 0 && (
                <span className="text-[10px] text-emerald-500 font-medium">
                  -{product.discount_percent}% OFF
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {(!products || products.length === 0) && (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
        </div>
      )}
    </div>
  );
};

export default DomainStorefront;
