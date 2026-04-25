export interface ProductThemePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  preview: {
    bgColor: string;
    buttonColor: string;
    buttonTextColor: string;
    headerColor: string;
    textColor: string;
  };
  config: {
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
  };
}

const BASE_SECTIONS = [
  { id: "gallery", enabled: true, label: "Galeria de Imagens" },
  { id: "pricing", enabled: true, label: "Preço e Desconto" },
  { id: "info", enabled: true, label: "Informações do Produto" },
  { id: "shipping", enabled: true, label: "Frete" },
  { id: "trust_badges", enabled: true, label: "Selos de Confiança" },
  { id: "store_card", enabled: true, label: "Card da Loja" },
  { id: "reviews", enabled: true, label: "Avaliações" },
  { id: "description", enabled: true, label: "Descrição" },
  { id: "related", enabled: true, label: "Produtos Relacionados" },
];

export const PRODUCT_THEMES: ProductThemePreset[] = [
  {
    id: "tiktok-shop",
    name: "TikTok Shop",
    description: "Estilo mobile-first com urgência e escassez. Ideal para dropshipping.",
    emoji: "🛍️",
    preview: {
      bgColor: "#F5F5F5",
      buttonColor: "#E63946",
      buttonTextColor: "#FFFFFF",
      headerColor: "#FFFFFF",
      textColor: "#1A1A1A",
    },
    config: {
      sections: BASE_SECTIONS.map((s) => ({ ...s })),
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
    },
  },
  {
    id: "shopify-classic",
    name: "Shopify Classic",
    description: "Visual limpo e profissional. Confiança e clareza para o comprador.",
    emoji: "🏪",
    preview: {
      bgColor: "#FFFFFF",
      buttonColor: "#2E7D32",
      buttonTextColor: "#FFFFFF",
      headerColor: "#FAFAFA",
      textColor: "#333333",
    },
    config: {
      sections: BASE_SECTIONS.map((s) => ({ ...s })),
      appearance: {
        bg_color: "#FFFFFF",
        header_bg_color: "#FAFAFA",
        header_logo_url: "",
        header_logo_height: 32,
        show_cart_icon: true,
        button_color: "#2E7D32",
        button_text_color: "#FFFFFF",
        button_radius: "md",
      },
      texts: {
        buy_button_text: "Adicionar ao carrinho",
        shipping_label: "Entrega gratuita",
        reviews_title: "O que nossos clientes dizem",
        units_available_text: "Em estoque",
        description_title: "Detalhes do produto",
        related_title: "Você também vai gostar",
      },
      conversion: {
        show_discount_badge: true,
        show_flash_sale: false,
        show_sold_count: false,
        show_units_available: false,
        units_available_count: 10,
      },
    },
  },
  {
    id: "dark-premium",
    name: "Dark Premium",
    description: "Fundo escuro com detalhes dourados. Perfeito para produtos de luxo.",
    emoji: "✨",
    preview: {
      bgColor: "#1A1A2E",
      buttonColor: "#C9A84C",
      buttonTextColor: "#1A1A2E",
      headerColor: "#16213E",
      textColor: "#E0E0E0",
    },
    config: {
      sections: BASE_SECTIONS.map((s) => ({ ...s })),
      appearance: {
        bg_color: "#1A1A2E",
        header_bg_color: "#16213E",
        header_logo_url: "",
        header_logo_height: 30,
        show_cart_icon: true,
        button_color: "#C9A84C",
        button_text_color: "#1A1A2E",
        button_radius: "none",
      },
      texts: {
        buy_button_text: "Comprar agora",
        shipping_label: "Envio premium grátis",
        reviews_title: "Depoimentos",
        units_available_text: "Edição limitada",
        description_title: "Sobre este produto",
        related_title: "Coleção exclusiva",
      },
      conversion: {
        show_discount_badge: false,
        show_flash_sale: false,
        show_sold_count: false,
        show_units_available: true,
        units_available_count: 5,
      },
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Cores neutras, sem distrações. Foco total no produto.",
    emoji: "🤍",
    preview: {
      bgColor: "#FAFAF9",
      buttonColor: "#18181B",
      buttonTextColor: "#FAFAF9",
      headerColor: "#FAFAF9",
      textColor: "#18181B",
    },
    config: {
      sections: BASE_SECTIONS.map((s) => {
        if (s.id === "trust_badges" || s.id === "store_card") return { ...s, enabled: false };
        return { ...s };
      }),
      appearance: {
        bg_color: "#FAFAF9",
        header_bg_color: "#FAFAF9",
        header_logo_url: "",
        header_logo_height: 24,
        show_cart_icon: false,
        button_color: "#18181B",
        button_text_color: "#FAFAF9",
        button_radius: "none",
      },
      texts: {
        buy_button_text: "Comprar",
        shipping_label: "Frete grátis",
        reviews_title: "Reviews",
        units_available_text: "Disponível",
        description_title: "Descrição",
        related_title: "Mais produtos",
      },
      conversion: {
        show_discount_badge: false,
        show_flash_sale: false,
        show_sold_count: false,
        show_units_available: false,
        units_available_count: 10,
      },
    },
  },
];
