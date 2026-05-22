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
import { ArrowLeft, Minus, Plus, Check, ShieldCheck, Clock, X, User, Hash, Mail, Phone, MapPin, Lock, Flame, Users, Zap as ZapIcon, QrCode, Smartphone, Copy } from "lucide-react";
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
  const [submitting, setSubmitting] = useState(false);
  const [couponSecondsLeft, setCouponSecondsLeft] = useState(15 * 60);

  useEffect(() => {
    const t = setInterval(() => setCouponSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const couponMmSs = `${String(Math.floor(couponSecondsLeft / 60)).padStart(2, "0")}:${String(couponSecondsLeft % 60).padStart(2, "0")}`;
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
  const [pixJustCopied, setPixJustCopied] = useState(false);

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

  if (ipBlocked) return <BlockedScreen />;



  if (pixData) {
    const firstName = (customerName || "").trim().split(" ")[0];
    const handleCopyPix = async () => {
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
        if (copied) {
          toast.success("Código PIX copiado! Cole no app do seu banco");
          setPixJustCopied(true);
          setTimeout(() => setPixJustCopied(false), 3000);
        } else {
          setShowCopyPaste(true);
          toast.success("Código PIX exibido abaixo");
        }
      } catch (e) { console.error("Copy error:", e); }
    };

    // Timer dinâmico: vermelho só quando <5min, caso contrário neutro
    const [mm, ss] = pixTimeLeft.split(":");
    const totalSecondsLeft = (parseInt(mm || "0", 10) * 60) + parseInt(ss || "0", 10);
    const urgent = totalSecondsLeft > 0 && totalSecondsLeft < 300;

    return (
      <div className="min-h-screen bg-muted/30 pb-10">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center h-12 px-4">
            <button
              onClick={() => {
                clearPendingPixOrder(slug || "", pixData.orderId);
                setPixData(null);
              }}
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <p className="flex-1 text-center text-sm font-semibold text-foreground">Pagamento</p>
            <span className="w-5 h-5" />
          </div>

          {/* Stepper */}
          <div className="px-6 pb-3 pt-1">
            <div className="flex items-start justify-between max-w-sm mx-auto">
              {[
                { label: "Revisão", done: true },
                { label: "Dados", done: true },
                { label: "Pagamento", current: true },
              ].map((s, i, arr) => (
                <div key={s.label} className="flex-1 flex flex-col items-center relative">
                  {i < arr.length - 1 && (
                    <div className="absolute top-3 left-1/2 w-full h-[2px] bg-marketplace-red" />
                  )}
                  <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    s.current ? "bg-card border-2 border-marketplace-red text-marketplace-red" : "bg-marketplace-red text-white"
                  }`}>
                    {s.done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : (i + 1)}
                  </div>
                  <span className={`mt-1 text-[10px] font-medium ${s.current ? "text-marketplace-red" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 space-y-3 pt-3">
          {/* Timer banner — urgência clara */}
          <div className={`rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-white font-bold shadow-sm ${urgent ? "bg-marketplace-red animate-pulse" : "bg-marketplace-red"}`}>
            <Clock className="w-5 h-5" />
            <span className="text-lg tabular-nums">{pixTimeLeft || "--:--"}</span>
            <span className="text-sm font-medium opacity-90">para pagar</span>
          </div>

          {/* QR Code Card */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 pt-5 pb-4 text-center">
              <p className="text-[15px] font-semibold text-foreground leading-tight">
                {firstName ? `${firstName}, finalize seu pedido` : "Efetue o pagamento agora"}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> Aponte a câmera do seu celular
              </p>

              <div className="mt-3 inline-flex flex-col items-center bg-muted/30 rounded-lg px-4 py-2">
                <span className="text-[11px] text-muted-foreground">Valor no PIX</span>
                <span className="text-2xl font-extrabold text-marketplace-red tabular-nums leading-tight">{formatCurrency(total)}</span>
              </div>

              <div className="mt-4 flex justify-center">
                {pixQrImageSrc ? (
                  <img src={pixQrImageSrc} alt="QR Code PIX" className="w-52 h-52" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-sm text-muted-foreground bg-muted/40 rounded">QR indisponível</div>
                )}
              </div>
            </div>
            <div className="bg-muted/40 border-t border-border px-5 py-3 text-center">
              <p className="text-[11px] text-muted-foreground leading-snug">
                O Pix será destinado à empresa que realiza o<br />processamento seguro dos nossos pagamentos:
              </p>
              <p className="text-[12px] font-bold text-foreground mt-1">Pagamento Seguro</p>
            </div>
          </div>

          {/* Como pagar */}
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-center text-[14px] font-bold text-foreground mb-3">Como pagar o seu pedido</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-[12px] text-foreground/90 leading-snug">
                <Smartphone className="w-4 h-4 text-marketplace-red flex-shrink-0 mt-0.5" />
                <span>Abra o aplicativo do seu banco e selecione <b>QR Code</b> na opção de pagamento por <b>PIX</b>.</span>
              </li>
              <li className="flex items-start gap-3 text-[12px] text-foreground/90 leading-snug">
                <QrCode className="w-4 h-4 text-marketplace-red flex-shrink-0 mt-0.5" />
                <span>Utilize a câmera do celular para <b>escanear o QR Code</b>, certifique-se que os dados estão corretos e finalize o pagamento.</span>
              </li>
            </ul>
          </div>

          {/* Divisor "ou" */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Botão PIX Copia e Cola — CTA principal */}
          <button
            onClick={handleCopyPix}
            className={`w-full py-4 rounded-xl text-white text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all ${
              pixJustCopied ? "bg-marketplace-green" : "bg-marketplace-red hover:bg-marketplace-red/90"
            }`}
          >
            {pixJustCopied ? (
              <><Check className="w-5 h-5" strokeWidth={3} /> CÓDIGO COPIADO!</>
            ) : (
              <><Copy className="w-5 h-5" /> UTILIZAR PIX COPIA E COLA</>
            )}
          </button>
          {pixJustCopied && (
            <p className="text-center text-[12px] text-marketplace-green font-semibold flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" strokeWidth={3} /> Agora abra o app do seu banco e cole no PIX
            </p>
          )}

          {/* Aguardando pagamento */}
          <div className="bg-marketplace-green/5 border border-marketplace-green/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-marketplace-green animate-pulse" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-marketplace-green/40 animate-ping" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-foreground leading-tight">Aguardando seu pagamento</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Você será redirecionado automaticamente após a confirmação</p>
            </div>
          </div>

          {/* Trust footer */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-marketplace-green" /> Pagamento 100% seguro</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-marketplace-green" /> Dados criptografados</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1"><ZapIcon className="w-3 h-3 text-marketplace-green" /> Aprovação imediata</span>
          </div>
        </div>
      </div>
    );
  }

  const mainImage = selectedVariantImage || product.product_images?.[0]?.url || "/placeholder.svg";
  const sellerName = (product as any)?.store_name || (product as any)?.brand || "Loja oficial";
  const hasAddress = !!(customerName && customerCep && customerAddress);
  const maskedPhone = customerPhone
    ? customerPhone.replace(/(\(\d{2}\)\s?\d)\d{4}(-?\d{2})/, "$1****$2")
    : "";

  return (
    <div className="min-h-screen bg-muted/40 pb-44">
      {/* Header — TikTok Shop style */}
      <header className="sticky top-0 z-40 bg-card">
        <div className="relative flex items-center justify-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="absolute left-3 active:scale-95 transition-transform">
            <ArrowLeft className="w-6 h-6 text-foreground" strokeWidth={2.2} />
          </button>
          <p className="text-[17px] font-bold text-foreground tracking-tight">
            {checkoutSettings?.checkout_header_text || "Resumo do pedido"}
          </p>
        </div>
        <div className="flex items-center justify-center gap-1.5 pb-2 -mt-1">
          <ShieldCheck className="w-3.5 h-3.5 tt-teal" strokeWidth={2.5} />
          <p className="text-[12px] tt-teal font-medium">
            {checkoutSettings?.checkout_security_text || "Seus dados estão seguros conosco"}
          </p>
        </div>

        {/* Address row (mostra quando preenchido) */}
        {hasAddress && (
          <button className="w-full px-4 pb-3 pt-1 flex items-start gap-2 text-left border-t border-border/60">
            <MapPin className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" strokeWidth={2.2} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-foreground truncate">
                {customerName}{maskedPhone ? `, ${maskedPhone}` : ""}
              </p>
              <p className="text-[12px] text-muted-foreground leading-snug">
                {customerAddress}, {customerNumber}, {customerNeighborhood}, {customerCity}, {customerState}, {customerCep}
              </p>
            </div>
            <ChevronRightIcon />
          </button>
        )}

        {/* Colorful dashed ribbon */}
        <div className="tt-ribbon" />
      </header>

      {/* Store + product card */}
      <section className="bg-card px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[15px] font-bold text-foreground">{sellerName}</p>
          <button className="flex items-center gap-1 text-muted-foreground text-[13px]">
            Adicionar nota <ChevronRightIcon />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[#f5a623] text-[15px] leading-none">★</span>
          <p className="text-[12px] font-semibold text-[#b88517]">Muito bem avaliado! 4.9/5,0</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-shrink-0">
            <img src={mainImage} alt={product.title} className="w-[88px] h-[88px] rounded-md object-cover bg-muted" />
            {quantity > 1 && (
              <span className="absolute top-1 left-1 text-marketplace-red text-[18px] font-extrabold drop-shadow-sm">
                {quantity}x
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <p className="text-[14px] text-foreground line-clamp-2 leading-snug font-medium">
              {product.title}{selectedVariantNames ? ` (${selectedVariantNames})` : ""}
            </p>
            <div className="mt-1.5">
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 text-[11px] font-semibold px-1.5 py-0.5 rounded">
                <span className="w-3 h-3 rounded-full bg-orange-400 text-white text-[8px] flex items-center justify-center font-bold">↺</span>
                Devolução gratuita
              </span>
            </div>
            <div className="mt-auto flex items-end justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-[18px] font-extrabold text-marketplace-red leading-none">
                  {formatCurrency(Number(product.sale_price))}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  {Number(product.original_price) > Number(product.sale_price) && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      {formatCurrency(Number(product.original_price))}
                    </span>
                  )}
                  {product.discount_percent > 0 && (
                    <span className="bg-marketplace-red/10 text-marketplace-red text-[10px] font-bold px-1 py-0.5 rounded">
                      -{product.discount_percent}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center bg-muted rounded-full overflow-hidden">
                <button className="w-7 h-7 flex items-center justify-center text-foreground active:bg-border" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
                <span className="text-[14px] font-semibold w-7 text-center">{quantity}</span>
                <button className="w-7 h-7 flex items-center justify-center text-foreground active:bg-border" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Coupon row */}
      <section className="mt-2 bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-marketplace-red">
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9z" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 9v6M15 9v6" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2"/>
          </svg>
          <p className="text-[14px] font-semibold text-foreground">Desconto do TikTok Shop</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="tt-teal-bg text-[11px] font-semibold px-2 py-1 rounded">Frete grátis</span>
          <ChevronRightIcon />
        </div>
      </section>

      {/* Personal info form */}
      <section className="mt-2 bg-card px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-foreground" />
          <p className="text-[14px] font-bold text-foreground">Seus dados</p>
        </div>
        <div className="space-y-2.5">
          <div className="relative">
            <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
              placeholder="Nome completo"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative">
              <Hash className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="CPF"
                value={customerDocument}
                onChange={(e) => setCustomerDocument(formatCpf(e.target.value))}
                maxLength={14}
                inputMode="numeric"
              />
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="Telefone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                maxLength={15}
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>
          </div>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
              placeholder="E-mail"
              type="email"
              value={customerEmail}
              onChange={(e) => {
                setCustomerEmail(e.target.value);
                setShowEmailSuggestions(!e.target.value.includes("@") && e.target.value.length > 2);
              }}
              onFocus={() => { if (!customerEmail.includes("@") && customerEmail.length > 2) setShowEmailSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
              autoComplete="email"
            />
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
        </div>
      </section>

      {/* Address form */}
      <section className="mt-2 bg-card px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-marketplace-red" />
          <p className="text-[14px] font-bold text-foreground">Endereço de entrega</p>
        </div>
        <div className="space-y-2.5">
          <div className="grid grid-cols-[1fr_90px] gap-2.5">
            <div className="relative">
              <input
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="CEP"
                maxLength={9}
                value={customerCep}
                onChange={(e) => handleCepChange(e.target.value)}
                inputMode="numeric"
                autoComplete="postal-code"
              />
              {cepLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">…</span>
              )}
            </div>
            <input
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
              placeholder="Número"
              value={customerNumber}
              onChange={(e) => setCustomerNumber(e.target.value)}
            />
          </div>
          {customerAddress && (
            <>
              <input
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                placeholder="Rua"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                autoComplete="address-line1"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                  placeholder="Bairro"
                  value={customerNeighborhood}
                  onChange={(e) => setCustomerNeighborhood(e.target.value)}
                />
                <input
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                  placeholder="Complemento"
                  value={customerComplement}
                  onChange={(e) => setCustomerComplement(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-[1fr_70px] gap-2.5">
                <input
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                  placeholder="Cidade"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                />
                <input
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-marketplace-red focus:ring-1 focus:ring-marketplace-red/30"
                  placeholder="UF"
                  maxLength={2}
                  value={customerState}
                  onChange={(e) => setCustomerState(e.target.value.toUpperCase())}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Shipping row (TikTok style) — aparece depois do endereço */}
      {customerCep.replace(/\D/g, "").length === 8 && customerAddress && shippingOptions && shippingOptions.length > 0 && (
        <section className="mt-2 bg-card">
          <div className="px-4 py-3 tt-teal-bg flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Receba até {selectedShippingOption?.estimated_days || "5–9 dias"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {selectedShippingOption?.name || "Envio padrão"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold tt-teal">
                {shippingCost === 0 ? "Grátis" : formatCurrency(shippingCost)}
              </span>
            </div>

          </div>

          {shippingOptions.length > 1 && (
            <div className="border-t border-border">
              {shippingOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedShipping(option.id)}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 border-b border-border last:border-b-0 ${
                    selectedShipping === option.id ? "bg-marketplace-red/5" : ""
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedShipping === option.id ? "border-marketplace-red" : "border-muted-foreground/30"}`}>
                    {selectedShipping === option.id && <div className="w-2 h-2 rounded-full bg-marketplace-red" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[13px] font-medium text-foreground">{option.name}</p>
                    {option.estimated_days && <p className="text-[11px] text-muted-foreground">Chega em {option.estimated_days}</p>}
                  </div>
                  <span className={`text-[13px] font-semibold ${option.free ? "tt-teal" : "text-foreground"}`}>
                    {option.free ? "GRÁTIS" : formatCurrency(Number(option.price))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}



      {/* Order bumps */}
      {orderBumps && orderBumps.length > 0 && (
        <section className="mt-2 bg-card px-4 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-marketplace-orange to-marketplace-red shadow-sm">
              <Flame className="w-3.5 h-3.5 text-white fill-white" />
              <p className="text-[11px] font-bold text-white uppercase tracking-wide">Oferta exclusiva</p>
            </div>
            <p className="text-[13px] font-bold text-foreground">Adicione com 1 clique</p>
          </div>
          <div className="space-y-2.5">
            {orderBumps.map((bump) => {
              const checked = selectedBumps.includes(bump.id);
              return (
                <button
                  key={bump.id}
                  onClick={() => toggleBump(bump.id)}
                  className={`group w-full relative rounded-2xl px-3 py-3 flex items-center gap-3 transition-all duration-200 active:scale-[0.99] ${
                    checked
                      ? "bg-gradient-to-r from-marketplace-orange/10 via-marketplace-red/5 to-transparent ring-2 ring-marketplace-orange shadow-md"
                      : "bg-card ring-1 ring-border hover:ring-marketplace-orange/40 shadow-sm"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      checked
                        ? "border-marketplace-orange bg-marketplace-orange scale-110"
                        : "border-muted-foreground/30 bg-card"
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  {bump.image_url && (
                    <div className="relative flex-shrink-0">
                      <img
                        src={bump.image_url}
                        alt={bump.title}
                        className="w-14 h-14 rounded-xl object-cover bg-muted"
                      />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[12.5px] font-semibold text-foreground line-clamp-2 leading-tight">
                      {bump.title}
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-[15px] font-extrabold text-marketplace-red leading-none">
                        {formatCurrency(Number(bump.price))}
                      </span>
                      <span className="text-[10px] font-bold text-marketplace-orange uppercase">
                        + Adicionar
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}


      {/* Order summary — TikTok style */}
      <section className="mt-2 bg-card px-4 py-4">
        <p className="text-[15px] font-bold text-foreground mb-3">Resumo do pedido</p>
        <div className="space-y-2">
          <div className="flex justify-between text-[13px]">
            <span className="text-foreground font-semibold">Subtotal do produto</span>
            <span className="text-foreground font-semibold">{formatCurrency(productSubtotal)}</span>
          </div>
          {originalSubtotal > productSubtotal && (
            <>
              <div className="flex justify-between text-[12px] pl-3">
                <span className="text-muted-foreground">Preço original</span>
                <span className="text-muted-foreground">{formatCurrency(originalSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[12px] pl-3">
                <span className="text-muted-foreground">Desconto no produto</span>
                <span className="text-marketplace-red">- {formatCurrency(discount)}</span>
              </div>
            </>
          )}
          {selectedShippingOption && (
            <>
              <div className="flex justify-between text-[13px] pt-1">
                <span className="text-foreground font-semibold">Subtotal do envio</span>
                <span className="text-foreground font-semibold">{formatCurrency(shippingCost)}</span>
              </div>
              {!selectedShippingOption.free && Number(selectedShippingOption.price) > 0 && (
                <div className="flex justify-between text-[12px] pl-3">
                  <span className="text-muted-foreground">Taxa de envio</span>
                  <span className="text-muted-foreground">{formatCurrency(Number(selectedShippingOption.price))}</span>
                </div>
              )}
              {selectedShippingOption.free && Number(selectedShippingOption.price) > 0 && (
                <>
                  <div className="flex justify-between text-[12px] pl-3">
                    <span className="text-muted-foreground">Taxa de envio</span>
                    <span className="text-muted-foreground">{formatCurrency(Number(selectedShippingOption.price))}</span>
                  </div>
                  <div className="flex justify-between text-[12px] pl-3">
                    <span className="text-muted-foreground">Desconto de envio</span>
                    <span className="text-marketplace-red">- {formatCurrency(Number(selectedShippingOption.price))}</span>
                  </div>
                </>
              )}
            </>
          )}
          {bumpsTotal > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-foreground font-semibold">Ofertas extras</span>
              <span className="text-foreground font-semibold">{formatCurrency(bumpsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-3 border-t border-border">
            <span className="text-[15px] font-bold text-foreground">Total</span>
            <div className="text-right">
              <p className="text-[18px] font-extrabold text-foreground leading-none">{formatCurrency(total)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Impostos inclusos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment method preview */}
      <section className="mt-2 bg-card px-4 py-4">
        <p className="text-[15px] font-bold text-foreground mb-3">Forma de pagamento</p>
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
            <img src="/pix-logo.png" alt="Pix" className="h-7 w-7 object-contain" />
          </div>
          <p className="flex-1 text-[14px] font-semibold text-foreground">Pix</p>
          <div className="w-4 h-4 rounded-full border-2 border-marketplace-red flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-marketplace-red" />
          </div>
        </div>

        {/* Cartão de crédito — desabilitado */}
        <div className="mt-2 pt-3 border-t border-border opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-lg bg-muted/60 border border-border flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="hsl(var(--muted-foreground))" strokeWidth="2"/>
                <path d="M2 10h20" stroke="hsl(var(--muted-foreground))" strokeWidth="2"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-muted-foreground">Cartão de crédito</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-bold bg-[#ff5f00] text-white px-1 rounded">master</span>
                <span className="text-[9px] font-bold bg-[#1a1f71] text-white px-1 rounded">VISA</span>
                <span className="text-[9px] font-bold bg-[#ed1c24] text-white px-1 rounded">elo</span>
                <span className="text-[9px] font-bold bg-[#006fcf] text-white px-1 rounded">AMEX</span>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
          </div>
          <div className="mt-2 bg-marketplace-red/5 border border-marketplace-red/20 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-marketplace-red fill-marketplace-red flex-shrink-0" />
            <p className="text-[11px] font-semibold text-marketplace-red leading-tight">
              Método de pagamento não disponível para o desconto relâmpago
            </p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mt-2">
          Ao fazer um pedido, você concorda com os <b>Termos de uso e venda</b> e reconhece que leu e concordou com a <b>Política de privacidade</b>.
        </p>
      </section>

      {/* Savings banner */}
      {discount > 0 && (
        <div className="mt-2 tt-savings-bg px-4 py-2.5 flex items-center gap-2">
          <span className="text-base">😄</span>
          <p className="text-[12px] font-semibold">
            Você está economizando {formatCurrency(discount + (selectedShippingOption?.free ? Number(selectedShippingOption.price || 0) : 0))} nesse pedido.
          </p>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-screen-lg mx-auto px-4 pt-2.5 pb-1 flex items-center justify-between">
          <p className="text-[14px] text-foreground">Total ({quantity} {quantity === 1 ? "item" : "itens"})</p>
          <p className="text-[18px] font-extrabold text-marketplace-red">{formatCurrency(total)}</p>
        </div>
        <div className="px-4 pb-2 pt-1">
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-marketplace-red text-white text-[15px] font-extrabold disabled:opacity-50 flex flex-col items-center justify-center shadow-md active:scale-[0.99] transition-transform"
          >
            <span>{submitting ? "Processando..." : (checkoutSettings?.checkout_button_text || "Fazer pedido")}</span>
            <span className="text-[10px] font-medium opacity-90 mt-0.5">
              O cupom expira em {couponMmSs}{selectedShippingOption?.free ? " | Frete grátis" : ""}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Small chevron helper used inline
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-muted-foreground flex-shrink-0">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default CheckoutPage;
