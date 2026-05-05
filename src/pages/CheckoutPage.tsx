import { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import { useTikTokPixel, trackTikTokPurchase, trackTikTokInitiateCheckout } from "@/hooks/useTikTokPixel";
import { usePageTracking, useVisitorHeartbeat, trackEvent } from "@/hooks/usePageTracking";
import { useXtrackyHandler } from "@/hooks/useXtrackyHandler";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductBySlug } from "@/lib/supabase-queries";
import { clearPendingPixOrder, readPendingPixOrder, readStoredThankYouUrl, savePendingPixOrder, saveStoredThankYouUrl } from "@/lib/pending-order";
import { formatCurrency } from "@/data/mockData";
import { ArrowLeft, Minus, Plus, Check, ShieldCheck, Clock, X, User, Hash, Mail, Phone, MapPin, Lock, Flame, Users, Zap as ZapIcon } from "lucide-react";
import { toast } from "sonner";


interface ShippingOption {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  estimated_days: string | null;
  price: number;
  free: boolean | null;
}

interface OrderBump {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
}

type PixDataState = {
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  copyPaste: string;
  expiresAt: string;
  orderId?: string;
};

const isQrImageSource = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.trim();

  return (
    normalized.startsWith("data:image/") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("/")
  );
};

const toBase64QrSource = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return null;

  if (normalized.startsWith("data:")) {
    const [meta, encoded] = normalized.split(",", 2);
    return encoded ? `${meta},${encoded.replace(/\s/g, "")}` : normalized;
  }

  return `data:image/png;base64,${normalized}`;
};

const copyTextToClipboard = async (value: string) => {
  const text = value.trim();
  if (!text) return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
};

const EMAIL_DOMAINS = ["@gmail.com", "@hotmail.com", "@outlook.com", "@yahoo.com", "@icloud.com", "@live.com"];

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const CheckoutPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedVariant = searchParams.get("variant");
  // useTikTokPixel chamado abaixo após product carregar (precisa do user_id do dono)
  const [quantity, setQuantity] = useState(1);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [customerCep, setCustomerCep] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerComplement, setCustomerComplement] = useState("");
  const [customerNeighborhood, setCustomerNeighborhood] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [, setShowForm] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "review">("cart");
  const [submitting, setSubmitting] = useState(false);
  const [pixData, setPixData] = useState<PixDataState | null>(() => {
    if (!slug) return null;
    const pendingOrder = readPendingPixOrder(slug);
    if (!pendingOrder) return null;

    return {
      qrCode: pendingOrder.qrCode,
      qrCodeBase64: pendingOrder.qrCodeBase64,
      copyPaste: pendingOrder.copyPaste,
      expiresAt: pendingOrder.expiresAt,
      orderId: pendingOrder.orderId,
    };
  });
  const [pixQrImageSrc, setPixQrImageSrc] = useState<string | null>(null);
  const [pixTimeLeft, setPixTimeLeft] = useState("");
  const [showCopyPaste, setShowCopyPaste] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [pixCopiedRegistered, setPixCopiedRegistered] = useState(false);

  useEffect(() => {
    if (!slug || pixData) return;

    const pendingOrder = readPendingPixOrder(slug);
    if (!pendingOrder) return;

    setPixData({
      qrCode: pendingOrder.qrCode,
      qrCodeBase64: pendingOrder.qrCodeBase64,
      copyPaste: pendingOrder.copyPaste,
      expiresAt: pendingOrder.expiresAt,
      orderId: pendingOrder.orderId,
    });
  }, [slug, pixData]);

  // Track abandoned cart when user leaves with filled form but no PIX generated
  useEffect(() => {
    const saveAbandonedCart = () => {
      if (pixData || !customerName || !customerEmail) return;
      supabase.from("abandoned_carts").insert({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        customer_document: customerDocument || null,
        product_id: slug || null,
        product_variant: selectedVariant || null,
      }).then(() => {});
    };
    window.addEventListener("beforeunload", saveAbandonedCart);
    return () => window.removeEventListener("beforeunload", saveAbandonedCart);
  }, [pixData, customerName, customerEmail, customerPhone, customerDocument, slug, selectedVariant]);

  useEffect(() => {
    setPixCopiedRegistered(false);
  }, [pixData?.orderId]);

  useEffect(() => {
    if (!pixData?.expiresAt) return;
    const calcTimeLeft = () => {
      const now = Date.now();
      const expires = new Date(pixData.expiresAt).getTime();
      if (isNaN(expires)) return "30:00";
      const diff = expires - now;
      if (diff <= 0) return "00:00";
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };
    setPixTimeLeft(calcTimeLeft());
    const interval = setInterval(() => {
      const val = calcTimeLeft();
      setPixTimeLeft(val);
      if (val === "00:00") clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [pixData?.expiresAt]);

  useEffect(() => {
    if (!pixData) {
      setPixQrImageSrc(null);
      return;
    }

    const qrCode = pixData.qrCode?.trim();
    const qrCodeBase64 = pixData.qrCodeBase64?.trim();
    const copyPaste = pixData.copyPaste?.trim();

    const base64Src = toBase64QrSource(qrCodeBase64);
    if (base64Src) {
      setPixQrImageSrc(base64Src);
      return;
    }

    // Always prefer generating QR locally from EMV code (copyPaste) since
    // gateway image URLs may be unreliable (404, auth-required, etc.)
    const qrPayload = copyPaste || qrCode;
    const imageSource = qrCode && isQrImageSource(qrCode) ? qrCode : null;

    if (!qrPayload) {
      setPixQrImageSrc(imageSource);
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(qrPayload, {
      width: 176,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setPixQrImageSrc(dataUrl);
        }
      })
      .catch((error) => {
        console.error("Erro ao gerar imagem do QR Code PIX:", error);
        if (!cancelled) {
          setPixQrImageSrc(imageSource);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pixData]);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });

  // Carrega APENAS os pixels do dono da loja (multi-tenant safe)
  useTikTokPixel(product?.user_id);
  usePageTracking("checkout_view", product?.user_id);
  useVisitorHeartbeat(product?.user_id);
  useXtrackyHandler(product?.user_id);

  // Dispara InitiateCheckout quando o produto e preço estão disponíveis
  const initiateCheckoutFiredRef = useRef(false);
  useEffect(() => {
    if (product?.id && !initiateCheckoutFiredRef.current) {
      initiateCheckoutFiredRef.current = true;
      trackTikTokInitiateCheckout({
        contentId: product.id,
        contentName: selectedVariant ? `${product.title} - ${selectedVariant}` : product.title,
        value: Number(product.sale_price || 0),
      });
    }
  }, [product?.id, product?.title, product?.sale_price, selectedVariant]);

  const { data: shippingOptions } = useQuery({
    queryKey: ["shipping-options", product?.user_id],
    queryFn: async () => {
      let query = supabase
        .from("shipping_options")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (product?.user_id) {
        query = query.eq("user_id", product.user_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ShippingOption[];
    },
    enabled: !!product,
  });

  const { data: orderBumps } = useQuery({
    queryKey: ["order-bumps", product?.id, product?.user_id],
    queryFn: async () => {
      // Fetch active bumps belonging to the product owner only
      let bumpsQuery = supabase
        .from("order_bumps")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (product?.user_id) {
        bumpsQuery = bumpsQuery.eq("user_id", product.user_id);
      }
      const { data: allBumps, error } = await bumpsQuery;
      if (error) throw error;

      if (!product?.id || !allBumps?.length) return allBumps as OrderBump[];

      // Fetch product assignments for these bumps
      const bumpIds = allBumps.map((b: any) => b.id);
      const { data: assignments, error: aErr } = await supabase
        .from("order_bump_products")
        .select("order_bump_id, product_id")
        .in("order_bump_id", bumpIds);
      if (aErr) throw aErr;

      // Group assignments by bump
      const assignmentMap = new Map<string, string[]>();
      (assignments || []).forEach((a: any) => {
        const list = assignmentMap.get(a.order_bump_id) || [];
        list.push(a.product_id);
        assignmentMap.set(a.order_bump_id, list);
      });

      // Filter: show bump if it has no assignments (global) or if product is in its list
      return (allBumps as OrderBump[]).filter((bump) => {
        const assigned = assignmentMap.get(bump.id);
        return !assigned || assigned.length === 0 || assigned.includes(product.id);
      });
    },
    enabled: !!product,
  });

  const { data: checkoutSettings } = useQuery({
    queryKey: ["checkout-settings", product?.user_id],
    queryFn: async () => {
      let query = supabase.from("checkout_settings" as any).select("*").limit(1);
      if (product?.user_id) {
        query = query.eq("user_id", product.user_id);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!product,
  });

  const { data: builderConfig } = useQuery({
    queryKey: ["checkout-builder-config", product?.user_id],
    queryFn: async () => {
      let query = supabase.from("checkout_builder_config").select("*").limit(1);
      if (product?.user_id) {
        query = query.eq("user_id", product.user_id);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!product,
  });

  // Resolve variant IDs from URL (?variant=id1,id2) to actual variant data (name + thumbnail)
  const variantIds = (selectedVariant || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const { data: selectedVariantsData } = useQuery({
    queryKey: ["checkout-selected-variants", variantIds.join(",")],
    queryFn: async () => {
      if (variantIds.length === 0) return [];
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, name, thumbnail_url")
        .in("id", variantIds);
      if (error) throw error;
      return data || [];
    },
    enabled: variantIds.length > 0,
  });

  // Preserve URL order
  const orderedSelectedVariants = variantIds
    .map((id) => selectedVariantsData?.find((v) => v.id === id))
    .filter((v): v is { id: string; name: string; thumbnail_url: string | null } => !!v);

  const selectedVariantNames = orderedSelectedVariants.map((v) => v.name).join(" · ");
  const selectedVariantImage = orderedSelectedVariants.find((v) => v.thumbnail_url)?.thumbnail_url || null;

  const builderAppearance = (builderConfig?.config as any)?.appearance || {};
  const checkoutLogoUrl = builderAppearance.logo_url || "";
  const checkoutLogoHeight = builderAppearance.logo_height || 28;

  useEffect(() => {
    if (shippingOptions?.length && !selectedShipping) {
      setSelectedShipping(shippingOptions[0].id);
    }
  }, [shippingOptions, selectedShipping]);

  const selectedShippingOption = shippingOptions?.find((s) => s.id === selectedShipping);
  const shippingCost = selectedShippingOption?.free ? 0 : Number(selectedShippingOption?.price || 0);

  const bumpsTotal = useMemo(() => {
    return (orderBumps || [])
      .filter((b) => selectedBumps.includes(b.id))
      .reduce((sum, b) => sum + Number(b.price), 0);
  }, [orderBumps, selectedBumps]);

  const productSubtotal = Number(product?.sale_price || 0) * quantity;
  const originalSubtotal = Number(product?.original_price || 0) * quantity;
  const discount = originalSubtotal - productSubtotal;
  const total = productSubtotal + shippingCost + bumpsTotal;

  // Persist pending PIX order + thank-you URL so redirect survives reload / tab reopen
  useEffect(() => {
    if (!slug || !pixData?.orderId) return;
    const thankYouUrl = (product as any)?.thank_you_url;

    if (thankYouUrl) {
      saveStoredThankYouUrl(pixData.orderId, thankYouUrl);
    }

    savePendingPixOrder({
      slug,
      orderId: pixData.orderId,
      copyPaste: pixData.copyPaste,
      expiresAt: pixData.expiresAt,
      qrCode: pixData.qrCode ?? null,
      qrCodeBase64: pixData.qrCodeBase64 ?? null,
      thankYouUrl: thankYouUrl || readStoredThankYouUrl(pixData.orderId),
    });
  }, [slug, pixData, product]);

  // Poll the backend directly so redirect works even without public table access / realtime RLS
  useEffect(() => {
    if (!slug || !pixData?.orderId || paymentConfirmed) return;

    const orderId = pixData.orderId;
    let cancelled = false;
    let redirected = false;

    const resolveThankYouUrl = (): string | null => {
      const fromProduct = (product as any)?.thank_you_url;
      if (fromProduct) return fromProduct as string;
      return readStoredThankYouUrl(orderId);
    };

    const handlePaid = (resolvedThankYouUrl?: string | null) => {
      if (redirected || cancelled) return;
      redirected = true;
      setPaymentConfirmed(true);

      const thankYouUrl = resolvedThankYouUrl || resolveThankYouUrl();
      if (thankYouUrl) {
        clearPendingPixOrder(slug, orderId);
        const redirectUrl = new URL(`/obrigado/${slug}`, window.location.origin);
        redirectUrl.searchParams.set("to", thankYouUrl);
        redirectUrl.searchParams.set("order", orderId);
        // Use replace so back-button doesn't return to checkout
        window.location.replace(redirectUrl.toString());
      }
    };

    const checkPaymentStatus = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(`${supabaseUrl}/functions/v1/check-order-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ orderId, slug }),
        });

        const result = await response.json().catch(() => null);

        if (cancelled || !response.ok || !result) return;

        if (result.paymentStatus === "paid") {
          handlePaid(result.thankYouUrl);
        }
      } catch {
        // keep polling quietly
      }
    };

    // Immediate check
    checkPaymentStatus();

    // Fast polling for near-immediate redirect when webhook marks the order as paid
    const interval = window.setInterval(checkPaymentStatus, 1500);

    // Re-check whenever the tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkPaymentStatus();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", checkPaymentStatus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", checkPaymentStatus);
    };
  }, [paymentConfirmed, pixData, product, slug]);

  const toggleBump = (id: string) => {
    setSelectedBumps((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };
  const handleCepChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const formatted = cleaned.length > 5 ? `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}` : cleaned;
    setCustomerCep(formatted);

    if (cleaned.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCustomerAddress(data.logradouro || "");
          setCustomerNeighborhood(data.bairro || "");
          setCustomerCity(data.localidade || "");
          setCustomerState(data.uf || "");
          setCustomerComplement(data.complemento || "");
        }
      } catch {
        // silently fail
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmitOrder = async () => {
    if (!customerName || !customerEmail || !customerPhone || !customerDocument) {
      // form is inline; just notify
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!product) return;

    setSubmitting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/create-pix-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            productId: product.id,
            productTitle: product.title,
            quantity,
            amount: Math.round(total * 100),
            customerName,
            customerEmail,
            customerPhone,
            customerDocument,
            customerCep: customerCep || undefined,
            customerAddress: customerAddress || undefined,
            customerNumber: customerNumber || undefined,
            customerComplement: customerComplement || undefined,
            customerNeighborhood: customerNeighborhood || undefined,
            customerCity: customerCity || undefined,
            customerState: customerState || undefined,
            customerUserAgent: navigator.userAgent,
            shippingOptionId: selectedShipping,
            shippingCost: Math.round(shippingCost * 100),
            selectedBumps: (orderBumps || [])
              .filter((b) => selectedBumps.includes(b.id))
              .map((b) => ({ id: b.id, title: b.title, price: Math.round(Number(b.price) * 100) })),
            productVariant: selectedVariant || undefined,
            utmParams: (() => {
              // Lê tracking params da URL atual + fallback do sessionStorage
              let stored: Record<string, string> = {};
              try { stored = JSON.parse(sessionStorage.getItem("tracking_params") || "{}"); } catch {}
              const get = (key: string) => searchParams.get(key) || stored[key] || null;
              return {
                src: get("src"),
                sck: get("sck"),
                ttclid: get("ttclid"),
                fbclid: get("fbclid"),
                gclid: get("gclid"),
                utm_source: get("utm_source"),
                utm_campaign: get("utm_campaign"),
                utm_medium: get("utm_medium"),
                utm_content: get("utm_content"),
                utm_term: get("utm_term"),
              };
            })(),
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao gerar pagamento");

      const nextPixData = {
        qrCode: typeof result.paymentData?.qrCode === "string" ? result.paymentData.qrCode.trim() : null,
        qrCodeBase64: typeof result.paymentData?.qrCodeBase64 === "string" ? result.paymentData.qrCodeBase64.trim() : null,
        copyPaste: typeof result.paymentData?.copyPaste === "string" ? result.paymentData.copyPaste.trim() : "",
        expiresAt: result.paymentData.expiresAt,
        orderId: result.orderId,
      };

      setPixData(nextPixData);
      setPaymentConfirmed(false);

      if (slug && result.orderId) {
        savePendingPixOrder({
          slug,
          orderId: result.orderId,
          copyPaste: nextPixData.copyPaste,
          expiresAt: nextPixData.expiresAt,
          qrCode: nextPixData.qrCode ?? null,
          qrCodeBase64: nextPixData.qrCodeBase64 ?? null,
          thankYouUrl: result.thankYouUrl || (product as any)?.thank_you_url || null,
        });
      }

      // Track PIX generation
      trackEvent("pix_generated", product?.user_id, { total, product_slug: slug });

      // Fire TikTok CompletePayment only for pixels WITHOUT fire_on_paid_only
      trackTikTokPurchase(total, "BRL", {
        orderId: result.orderId,
        contentId: product.id,
        contentName: selectedVariant ? `${product.title} - ${selectedVariant}` : product.title,
        quantity,
        email: customerEmail,
        phone: customerPhone,
        filterPaidOnly: false,
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar pagamento");
    } finally {
      setSubmitting(false);
    }
  };


  const registerPixCopiedClick = async (orderId?: string) => {
    if (!orderId) {
      return false;
    }

    if (pixCopiedRegistered) {
      return true;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/mark-pix-copied`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao registrar clique do PIX");
      }

      setPixCopiedRegistered(true);
      return true;
    } catch (error) {
      console.error("Error marking pix_copied:", error);
      return false;
    }
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }



  if (pixData) {
    return (
      <div className="min-h-screen bg-background pb-8">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center h-12 px-4">
            <button
              onClick={() => {
                clearPendingPixOrder(slug || "", pixData.orderId);
                setPixData(null);
              }}
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            {checkoutLogoUrl ? (
              <img src={checkoutLogoUrl} alt="Logo" style={{ height: checkoutLogoHeight }} className="object-contain max-w-[180px] mx-auto" />
            ) : (
              <p className="flex-1 text-center text-sm font-semibold text-foreground">Pagamento</p>
            )}
            <button onClick={() => navigate(-1)}><X className="w-5 h-5 text-foreground" /></button>
          </div>
        </header>

        {/* Stepper */}
        <div className="bg-card px-6 pt-4 pb-3">
          <div className="flex items-center justify-center gap-2 max-w-[260px] mx-auto">
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-marketplace-red flex items-center justify-center">
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
              <span className="text-[10px] font-medium text-foreground">Dados</span>
            </div>
            <div className="flex-1 h-[2px] bg-marketplace-red -mt-4" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-marketplace-red flex items-center justify-center">
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
              <span className="text-[10px] font-medium text-foreground">Pagamento</span>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 space-y-3">
          {/* Social proof bar */}
          <div className="flex items-center justify-between bg-marketplace-green/10 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-marketplace-green animate-pulse" />
              <span className="text-[12px] text-foreground"><strong>75 pessoas</strong> pagaram hoje</span>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-marketplace-green font-semibold">
              <Users className="w-3.5 h-3.5" /> 29 online
            </div>
          </div>

          {/* Recent purchase notification */}
          <div className="flex items-center gap-2 text-[12px] text-foreground px-1">
            <Check className="w-3.5 h-3.5 text-marketplace-green flex-shrink-0" />
            <span>Camila F. de Campinas/SP pagou via PIX <span className="text-marketplace-red font-semibold">há 2 min</span></span>
          </div>

          {/* Timer banner */}
          <div className="bg-marketplace-red rounded-xl py-3.5 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white text-xl font-extrabold tracking-wider">{pixTimeLeft}</span>
            </div>
            <span className="text-white/95 text-sm font-semibold">para pagar</span>
          </div>

          {/* Reservation notice */}
          <div className="flex items-start gap-2 bg-marketplace-yellow/15 border border-marketplace-yellow/30 rounded-lg px-3 py-2.5">
            <ZapIcon className="w-4 h-4 text-marketplace-orange flex-shrink-0 mt-0.5 fill-marketplace-orange" />
            <p className="text-[12px] text-foreground leading-snug">
              <strong>Seu estoque está reservado!</strong> Pague dentro do prazo para garantir.
            </p>
          </div>

          {/* QR Code section */}
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">Valor a pagar</p>
            <p className="text-3xl font-extrabold text-marketplace-green mt-1">{formatCurrency(total)}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 flex justify-center">
            {pixQrImageSrc ? (
              <img src={pixQrImageSrc} alt="QR Code PIX" className="w-56 h-56" />
            ) : (
              <p className="text-sm text-muted-foreground py-20">QR Code indisponível</p>
            )}
          </div>

          {/* Toggle copy paste view */}
          <button
            onClick={() => setShowCopyPaste((v) => !v)}
            className="w-full text-center text-[12px] font-medium text-muted-foreground tracking-wide uppercase py-1"
          >
            Código PIX copia e cola
          </button>

          {showCopyPaste && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-foreground break-all font-mono">{pixData.copyPaste?.trim()}</p>
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={async () => {
              try {
                const pixCode = pixData.copyPaste?.trim();
                if (!pixCode) {
                  toast.error("Código PIX indisponível no momento");
                  return;
                }
                const registerPromise = registerPixCopiedClick(pixData.orderId);
                const copied = await copyTextToClipboard(pixCode);
                const registered = await registerPromise;
                if (!registered) toast.error("Não foi possível registrar o clique do PIX");
                if (copied) toast.success("Código PIX copiado!");
                else { setShowCopyPaste(true); toast.success("Código PIX exibido abaixo!"); }
              } catch (e) { console.error("Copy error:", e); }
            }}
            className="w-full py-4 rounded-full bg-marketplace-red text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-transform"
          >
            <span className="text-base">📋</span> COPIAR CÓDIGO PIX
          </button>

          {/* Awaiting payment */}
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="w-3.5 h-3.5 border-2 border-marketplace-red border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Aguardando confirmação do pagamento...</span>
          </div>
        </div>
      </div>
    );
  }

  const mainImage = selectedVariantImage || product.product_images?.[0]?.url || "/placeholder.svg";

  return (
    <div className="min-h-screen bg-muted/30 pb-44">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 text-center">
            {checkoutLogoUrl ? (
              <img src={checkoutLogoUrl} alt="Logo" style={{ height: checkoutLogoHeight }} className="object-contain max-w-[180px] mx-auto" />
            ) : (
              <p className="text-sm font-semibold text-foreground">{checkoutSettings?.checkout_header_text || "Pagamento"}</p>
            )}
          </div>
          <button onClick={() => navigate(-1)}>
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* TikTok Shop brand bar */}
      <div className="bg-card flex items-center justify-center gap-1.5 py-2.5 border-b border-border">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg>
        <span className="text-base font-bold text-foreground">TikTok</span>
        <span className="text-base font-medium text-foreground">Shop</span>
      </div>

      {/* Section title + stepper */}
      <div className="bg-card pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-center mb-3 relative">
          <button
            onClick={() => {
              if (checkoutStep === "review") setCheckoutStep("info");
              else if (checkoutStep === "info") setCheckoutStep("cart");
              else navigate(-1);
            }}
            className="absolute left-4 top-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <p className="text-base font-semibold text-foreground">
            {checkoutStep === "cart" ? "Carrinho" : checkoutStep === "info" ? "Informações" : "Revisão do pedido"}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 max-w-[320px] mx-auto px-4">
          {[
            { id: "cart", label: "Carrinho", n: 1 },
            { id: "info", label: "Dados", n: 2 },
            { id: "review", label: "Pagamento", n: 3 },
          ].map((s, i, arr) => {
            const order = ["cart", "info", "review"];
            const currentIdx = order.indexOf(checkoutStep);
            const stepIdx = order.indexOf(s.id);
            const done = stepIdx < currentIdx;
            const active = stepIdx === currentIdx;
            return (
              <>
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${done || active ? "bg-marketplace-red" : "bg-muted border border-border"}`}>
                    {done ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <span className={`text-[12px] font-bold ${active ? "text-white" : "text-muted-foreground"}`}>{s.n}</span>}
                  </div>
                  <span className={`text-[10px] font-medium ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < arr.length - 1 && <div key={`sep-${s.id}`} className={`flex-1 h-[2px] -mt-4 ${stepIdx < currentIdx ? "bg-marketplace-red" : "bg-border"}`} />}
              </>
            );
          })}
        </div>
      </div>

      {/* Social proof */}
      <div className="bg-marketplace-green/10 mx-4 mt-3 rounded-lg px-3 py-2 flex items-center gap-2">
        <Check className="w-3.5 h-3.5 text-marketplace-green flex-shrink-0" />
        <span className="text-[12px] text-foreground">
          <strong>Juliana de Recife/PE</strong> acabou de comprar
        </span>
      </div>

      {checkoutStep === "info" && (
      <>
      {/* Personal info card */}
      <div className="mx-4 mt-3 bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
          <User className="w-4 h-4 text-foreground" />
          <p className="text-sm font-semibold text-foreground">Informações pessoais</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">Nome completo</label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="João da Silva"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">CPF</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="000.000.000-00"
                value={customerDocument}
                onChange={(e) => setCustomerDocument(formatCpf(e.target.value))}
                maxLength={14}
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="relative">
            <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="seu@email.com"
                type="email"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  setShowEmailSuggestions(!e.target.value.includes("@") && e.target.value.length > 2);
                }}
                onFocus={() => { if (!customerEmail.includes("@") && customerEmail.length > 2) setShowEmailSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
              />
            </div>
            {showEmailSuggestions && customerEmail.length > 2 && !customerEmail.includes("@") && (
              <div className="absolute left-0 right-0 top-full z-10 bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {EMAIL_DOMAINS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCustomerEmail(customerEmail + domain);
                      setShowEmailSuggestions(false);
                    }}
                  >
                    {customerEmail}{domain}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">Telefone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="(00) 00000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                maxLength={15}
                inputMode="numeric"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address card */}
      <div className="mx-4 mt-3 bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
          <MapPin className="w-4 h-4 text-marketplace-red" />
          <p className="text-sm font-semibold text-foreground">Endereço de entrega</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">CEP</label>
            <div className="relative">
              <input
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="00000-000"
                maxLength={9}
                value={customerCep}
                onChange={(e) => handleCepChange(e.target.value)}
                inputMode="numeric"
              />
              {cepLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">Buscando...</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">Rua</label>
            <input
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
              placeholder="Rua, Avenida..."
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">Número</label>
              <input
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="Nº"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">Complemento</label>
              <input
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="Apto, bloco..."
                value={customerComplement}
                onChange={(e) => setCustomerComplement(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">Bairro</label>
            <input
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
              placeholder="Bairro"
              value={customerNeighborhood}
              onChange={(e) => setCustomerNeighborhood(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">Cidade</label>
              <input
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="São Paulo"
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 block">UF</label>
              <input
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="SP"
                maxLength={2}
                value={customerState}
                onChange={(e) => setCustomerState(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {checkoutStep === "cart" && (
      <>
      {/* Cart card */}
      <div className="mx-4 mt-3 bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-marketplace-red text-white px-4 py-2.5 flex items-center justify-between">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold">Meu Carrinho</p>
            <p className="text-[10px] text-white/90">{quantity} {quantity === 1 ? "item selecionado" : "itens selecionados"}</p>
          </div>
          <div className="w-4" />
        </div>

        <div className="px-4 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-marketplace-green animate-pulse" />
            <span className="text-[12px] text-foreground"><strong>52 pessoas</strong> comprando agora</span>
          </div>
          <span className="text-[11px] font-semibold text-marketplace-green flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> FRETE GRÁTIS
          </span>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground">OL</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Loja</p>
              <p className="text-[10px] text-marketplace-green flex items-center gap-1 mt-0.5">
                <Check className="w-2.5 h-2.5" /> Loja Verificada
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <img src={mainImage} alt={product.title} className="w-20 h-20 rounded-lg object-cover bg-muted" />
              {product.discount_percent > 0 && (
                <span className="absolute -top-1 -left-1 bg-marketplace-red text-white text-[9px] font-bold px-1 py-0.5 rounded">
                  {product.discount_percent}% OFF
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground line-clamp-2 leading-snug">{product.title}{selectedVariantNames ? ` (${selectedVariantNames})` : ""}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-base font-extrabold text-marketplace-red">{formatCurrency(Number(product.sale_price))}</span>
                <span className="text-xs text-muted-foreground line-through">{formatCurrency(Number(product.original_price))}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button className="text-muted-foreground"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-3 bg-muted rounded-full px-1 py-1">
              <button
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-semibold w-5 text-center">{quantity}</span>
              <button
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {discount > 0 && (
          <div className="mx-3 my-3 bg-marketplace-green/10 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <ZapIcon className="w-4 h-4 text-marketplace-green flex-shrink-0 fill-marketplace-green" />
            <div>
              <p className="text-[11px] text-foreground">Você está economizando</p>
              <p className="text-sm font-extrabold text-marketplace-green">{formatCurrency(discount)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Consumer protection card */}
      <div className="mx-4 mt-3 bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-foreground" />
          <p className="text-sm font-bold text-foreground">Proteção ao Consumidor</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            "Devolução grátis em 7 dias",
            "Reembolso garantido",
            "Pagamento 100% seguro",
            "Rastreio em tempo real",
          ].map((t) => (
            <div key={t} className="flex items-start gap-1.5 bg-marketplace-green/10 rounded-lg px-2.5 py-2">
              <ShieldCheck className="w-3 h-3 text-marketplace-green flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-foreground leading-tight">{t}</span>
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {checkoutStep === "review" && (
      <>
      {/* Shipping options */}
      {shippingOptions && shippingOptions.length > 0 && (
        <div className="mx-4 mt-3 bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Método de entrega</p>
          </div>
          {shippingOptions.map((option, idx) => (
            <button
              key={option.id}
              onClick={() => setSelectedShipping(option.id)}
              className={`w-full px-4 py-3 flex items-center gap-3 ${idx < shippingOptions.length - 1 ? "border-b border-border" : ""} ${
                selectedShipping === option.id ? "bg-marketplace-red/5" : ""
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedShipping === option.id ? "border-marketplace-red" : "border-muted-foreground/30"}`}>
                {selectedShipping === option.id && <div className="w-2 h-2 rounded-full bg-marketplace-red" />}
              </div>
              {option.logo_url && <img src={option.logo_url} alt={option.name} className="w-8 h-8 rounded object-contain" />}
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{option.name}</p>
                {option.estimated_days && <p className="text-[11px] text-muted-foreground">Chega em {option.estimated_days}</p>}
              </div>
              <span className={`text-sm font-semibold ${option.free ? "text-marketplace-green" : "text-foreground"}`}>
                {option.free ? "GRÁTIS" : formatCurrency(Number(option.price))}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Order bumps */}
      {orderBumps && orderBumps.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          <div className="bg-marketplace-yellow/15 border border-marketplace-yellow/40 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-marketplace-orange fill-marketplace-orange" />
              <p className="text-sm font-bold text-foreground">Aproveite e leve junto:</p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">Ofertas exclusivas com desconto especial. Adicione com 1 clique.</p>
          </div>
          {orderBumps.map((bump) => {
            const checked = selectedBumps.includes(bump.id);
            return (
              <button
                key={bump.id}
                onClick={() => toggleBump(bump.id)}
                className={`w-full bg-card rounded-xl border-2 border-dashed px-3 py-3 flex items-center gap-3 transition-colors ${
                  checked ? "border-marketplace-orange bg-marketplace-orange/5" : "border-marketplace-yellow/60"
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? "border-marketplace-orange bg-marketplace-orange" : "border-muted-foreground/40"}`}>
                  {checked && <Check className="w-3 h-3 text-white" />}
                </div>
                {bump.image_url && <img src={bump.image_url} alt={bump.title} className="w-12 h-12 rounded object-cover" />}
                <div className="flex-1 text-left">
                  <p className="text-xs font-semibold text-foreground line-clamp-2">{bump.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground line-through">R$ 89,90</span>
                    <span className="text-sm font-bold text-marketplace-red">{formatCurrency(Number(bump.price))}</span>
                    <span className="text-[10px] font-bold text-marketplace-green bg-marketplace-green/10 px-1.5 py-0.5 rounded">-79%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Order summary card */}
      <div className="mx-4 mt-3 bg-card rounded-xl border border-border p-4 space-y-2">
        <p className="text-sm font-bold text-foreground mb-1">Resumo do pedido</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">{formatCurrency(productSubtotal)}</span>
        </div>
        {shippingCost === 0 && selectedShippingOption ? (
          <div className="flex justify-between text-sm">
            <span className="text-marketplace-green font-semibold">Frete</span>
            <span className="text-marketplace-green font-semibold">Grátis</span>
          </div>
        ) : shippingCost > 0 ? (
          <div className="flex justify-between text-sm">
            <span className="text-marketplace-green font-semibold">Frete</span>
            <span className="text-foreground">{formatCurrency(shippingCost)}</span>
          </div>
        ) : null}
        {bumpsTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ofertas extras</span>
            <span className="text-foreground">{formatCurrency(bumpsTotal)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-bold text-foreground">Total</span>
          <div className="text-right">
            <span className="text-lg font-extrabold text-marketplace-red">{formatCurrency(total)}</span>
            <p className="text-[10px] text-muted-foreground">Impostos inclusos</p>
          </div>
        </div>
      </div>

      {/* Address summary if filled */}
      {customerAddress && customerCity && (
        <div className="mx-4 mt-3 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-marketplace-red" />
              <p className="text-sm font-bold text-foreground">Endereço de entrega</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {customerPhone && <>{customerPhone} · {customerEmail}<br /></>}
            {customerAddress}{customerNumber ? `, ${customerNumber}` : ""}<br />
            {customerNeighborhood} · {customerCity}, {customerState}<br />
            {customerCep && `CEP: ${customerCep}`}
          </p>
        </div>
      )}

      {/* Trust strip */}
      <div className="mx-4 mt-3 mb-2 bg-card rounded-xl border border-border px-4 py-3 flex items-center justify-around text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Seguro</span>
        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Compra Protegida</span>
        <span className="flex items-center gap-1">⭐ 4.8/5</span>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.1)] pb-2">
        <div className="max-w-screen-lg mx-auto px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-sm text-foreground">Total ({quantity} {quantity === 1 ? "item" : "itens"}):</p>
          <p className="text-xl font-extrabold text-marketplace-red">{formatCurrency(total)}</p>
        </div>
        <div className="px-4 pb-2">
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-marketplace-red text-white text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform"
          >
            <Lock className="w-4 h-4" />
            {submitting ? "Processando..." : (checkoutSettings?.checkout_button_text || "Continuar para pagamento")}
          </button>
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-[11px] text-marketplace-red flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Cupom expira em 09:35
          </p>
          <p className="text-[11px] text-marketplace-green flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Seus dados estão protegidos com criptografia SSL
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
