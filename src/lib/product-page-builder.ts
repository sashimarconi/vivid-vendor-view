export interface ProductPageBuilderConfig {
  sections: { id: string; enabled: boolean; label: string }[];
  appearance: {
    bg_color: string;
    header_bg_color: string;
    header_logo_url: string;
    header_logo_height: number;
    show_cart_icon: boolean;
    button_color: string;
    button_text_color: string;
    button_radius: string;
  };
  texts: {
    buy_button_text: string;
    shipping_label: string;
    reviews_title: string;
    units_available_text: string;
    description_title: string;
    related_title: string;
  };
  conversion: {
    show_discount_badge: boolean;
    show_flash_sale: boolean;
    show_sold_count: boolean;
    show_units_available: boolean;
    units_available_count: number;
  };
}

export const PRODUCT_PAGE_PREVIEW_MESSAGE_TYPE = "product-page-builder-preview";
export const PRODUCT_PAGE_PREVIEW_READY_MESSAGE_TYPE = "product-page-builder-preview-ready";

export const DEFAULT_PRODUCT_PAGE_BUILDER_CONFIG: ProductPageBuilderConfig = {
  sections: [
    { id: "gallery", enabled: true, label: "Galeria" },
    { id: "pricing", enabled: true, label: "Preço" },
    { id: "info", enabled: true, label: "Info" },
    { id: "shipping", enabled: true, label: "Frete" },
    { id: "trust_badges", enabled: true, label: "Badges" },
    { id: "store_card", enabled: true, label: "Loja" },
    { id: "reviews", enabled: true, label: "Avaliações" },
    { id: "description", enabled: true, label: "Descrição" },
    { id: "related", enabled: true, label: "Relacionados" },
  ],
  appearance: {
    bg_color: "",
    header_bg_color: "",
    header_logo_url: "",
    header_logo_height: 28,
    show_cart_icon: true,
    button_color: "#E63946",
    button_text_color: "#FFFFFF",
    button_radius: "lg",
  },
  texts: {
    buy_button_text: "Comprar agora",
    shipping_label: "Frete grátis",
    reviews_title: "Avaliações",
    units_available_text: "13 unidades disponíveis",
    description_title: "Descrição do produto",
    related_title: "Mais desta loja",
  },
  conversion: {
    show_discount_badge: true,
    show_flash_sale: true,
    show_sold_count: true,
    show_units_available: true,
    units_available_count: 13,
  },
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeProductPageBuilderConfig = (rawConfig: unknown): ProductPageBuilderConfig => {
  const config = isObject(rawConfig) ? rawConfig : {};

  return {
    sections: Array.isArray(config.sections)
      ? (config.sections as ProductPageBuilderConfig["sections"])
      : DEFAULT_PRODUCT_PAGE_BUILDER_CONFIG.sections,
    appearance: {
      ...DEFAULT_PRODUCT_PAGE_BUILDER_CONFIG.appearance,
      ...(isObject(config.appearance) ? config.appearance : {}),
    },
    texts: {
      ...DEFAULT_PRODUCT_PAGE_BUILDER_CONFIG.texts,
      ...(isObject(config.texts) ? config.texts : {}),
    },
    conversion: {
      ...DEFAULT_PRODUCT_PAGE_BUILDER_CONFIG.conversion,
      ...(isObject(config.conversion) ? config.conversion : {}),
    },
  };
};