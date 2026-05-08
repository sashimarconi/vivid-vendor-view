import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UtmParamsSchema = z.object({
  src: z.string().nullable().optional(),
  sck: z.string().nullable().optional(),
  ttclid: z.string().nullable().optional(),
  utm_source: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_content: z.string().nullable().optional(),
  utm_term: z.string().nullable().optional(),
}).optional().default({});

const BodySchema = z.object({
  productId: z.string().uuid(),
  productTitle: z.string().min(1).max(500),
  productVariant: z.string().max(255).nullable().optional(),
  quantity: z.number().int().min(1).max(100),
  amount: z.number().int().min(1),
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().max(255),
  customerPhone: z.string().min(8).max(20),
  customerDocument: z.string().min(11).max(14),
  customerCep: z.string().max(20).nullable().optional(),
  customerAddress: z.string().max(500).nullable().optional(),
  customerNumber: z.string().max(50).nullable().optional(),
  customerComplement: z.string().max(255).nullable().optional(),
  customerNeighborhood: z.string().max(255).nullable().optional(),
  customerCity: z.string().max(255).nullable().optional(),
  customerState: z.string().max(50).nullable().optional(),
  customerUserAgent: z.string().max(1000).nullable().optional(),
  shippingOptionId: z.string().uuid().nullable().optional(),
  shippingCost: z.number().int().min(0).optional(),
  selectedBumps: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        price: z.number().int().min(0),
      })
    )
    .optional()
    .default([]),
  utmParams: UtmParamsSchema,
});

function getWebhookFields(webhookUrl: string) {
  return {
    webhookUrl,
    webhook_url: webhookUrl,
    callbackUrl: webhookUrl,
    callback_url: webhookUrl,
    notificationUrl: webhookUrl,
    notification_url: webhookUrl,
    post_back_url: webhookUrl,
    postbackUrl: webhookUrl,
    postback_url: webhookUrl,
  };
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Dispara CompletePayment via TikTok Events API S2S.
 * Roda no momento da geração do PIX (mesmo evento que o pixel client-side dispara),
 * garantindo entrega mesmo se o navegador do visitante bloquear o script do TikTok.
 * O event_id = order.id permite deduplicação automática com o evento client-side.
 *
 * Respeita fire_on_paid_only: pixels marcados como "só após pagamento" NÃO disparam aqui.
 */
async function dispatchTikTokPixGenerated(supabase: any, params: {
  userId: string;
  orderId: string;
  productId: string;
  productTitle: string;
  quantity: number;
  total: number;
  customerEmail: string;
  customerPhone: string;
  customerIp: string | null;
  customerUserAgent: string | null;
  ttclid?: string | null;
}) {
  try {
    const { data: pixels } = await supabase
      .from("tracking_pixels")
      .select("pixel_id, access_token, fire_on_paid_only")
      .eq("user_id", params.userId)
      .eq("platform", "tiktok")
      .eq("active", true);

    if (!pixels || pixels.length === 0) {
      console.log("[TikTok S2S PIX] Nenhum pixel ativo para user", params.userId);
      return;
    }

    const userData: Record<string, string> = {};
    if (params.customerEmail) userData.email = await sha256Hex(params.customerEmail);
    if (params.customerPhone) userData.phone = await sha256Hex(params.customerPhone);
    if (params.customerIp) userData.ip = params.customerIp;
    if (params.customerUserAgent) userData.user_agent = params.customerUserAgent;
    if (params.ttclid) userData.ttclid = params.ttclid;

    for (const pixel of pixels) {
      // Pixels "fire_on_paid_only" só disparam no webhook de pagamento confirmado
      if (pixel.fire_on_paid_only) {
        console.log(`[TikTok S2S PIX] Pixel ${pixel.pixel_id} é fire_on_paid_only, pulando geração de PIX.`);
        continue;
      }
      if (!pixel.access_token) {
        console.warn(`[TikTok S2S PIX] Pixel ${pixel.pixel_id} sem access_token (cadastre o token em /nimda/pixels para enviar via S2S).`);
        continue;
      }

      for (const eventName of ["PlaceAnOrder", "CompletePayment"]) {
        const body = {
          event_source: "web",
          event_source_id: pixel.pixel_id,
          data: [{
            event: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: params.orderId,
            user: userData,
            properties: {
              currency: "BRL",
              value: Number(params.total) || 0,
              content_type: "product",
              order_id: params.orderId,
              ...(params.productId ? { content_id: params.productId } : {}),
              contents: [{
                content_type: "product",
                ...(params.productId ? { content_id: params.productId } : {}),
                ...(params.productTitle ? { content_name: params.productTitle } : {}),
                quantity: Number(params.quantity) || 1,
                price: Number(params.total) || 0,
              }],
            },
          }],
        };

        const resp = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Access-Token": pixel.access_token },
          body: JSON.stringify(body),
        });
        const result = await resp.json().catch(() => ({}));
        if (resp.ok && result?.code === 0) {
          console.log(`[TikTok S2S PIX] ✅ Pixel ${pixel.pixel_id} → ${eventName} (event_id: ${params.orderId})`);
        } else {
          console.error(`[TikTok S2S PIX] ❌ Pixel ${pixel.pixel_id} → erro em ${eventName}`, JSON.stringify(result));
        }
      }
    }
  } catch (err) {
    console.error("[TikTok S2S PIX] Error:", err);
  }
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function toAbsoluteUrl(baseUrl: string, value?: string | null) {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const base = baseUrl.replace(/\/+$/, "");
  const path = normalized.startsWith("/") ? normalized : `/${normalized.replace(/^\/+/, "")}`;
  return `${base}${path}`;
}

async function getGatewaysForProductOwner(supabase: any, productId: string) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, user_id, thank_you_url")
    .eq("id", productId)
    .maybeSingle() as { data: any; error: any };

  if (productError) {
    throw new Error(`Erro ao buscar produto: ${productError.message}`);
  }

  if (!product) {
    throw new Error("Produto não encontrado");
  }

  if (!product.user_id) {
    throw new Error("Produto sem proprietário configurado");
  }

  // Pega o gateway ativo + os demais configurados (com chaves) ordenados por fallback_priority desc
  // Para uso como fallback se o ativo falhar.
  const { data: gateways, error: gatewayError } = await supabase
    .from("gateway_settings")
    .select("*")
    .eq("user_id", product.user_id)
    .not("secret_key", "is", null)
    .order("active", { ascending: false })
    .order("fallback_priority", { ascending: false }) as { data: any; error: any };

  if (gatewayError) {
    throw new Error(`Erro ao buscar gateway: ${gatewayError.message}`);
  }

  const valid = (gateways || []).filter((g: any) => g.secret_key && g.secret_key.trim().length > 0);

  if (valid.length === 0) {
    throw new Error("Gateway de pagamento não configurado para o dono do produto");
  }

  return { gateways: valid, product };
}

async function logGatewayHealth(supabase: any, params: {
  userId: string;
  gatewayName: string;
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage?: string | null;
  fallbackFrom?: string | null;
  orderId?: string | null;
}) {
  try {
    await supabase.from("gateway_health_logs").insert({
      user_id: params.userId,
      gateway_name: params.gatewayName,
      success: params.success,
      status_code: params.statusCode,
      latency_ms: params.latencyMs,
      error_message: params.errorMessage || null,
      fallback_from: params.fallbackFrom || null,
      order_id: params.orderId || null,
    });
  } catch (e) {
    console.error("[health log] insert error:", e);
  }
}

async function callGateway(name: string, gateway: any, body: any, items: any[], webhookUrl: string) {
  switch (name) {
    case "blackcatpay": return callBlackCatPay(gateway, body, items, webhookUrl);
    case "ghostspay":   return callGhostsPay(gateway, body, items, webhookUrl);
    case "duck":        return callDuck(gateway, body, items, webhookUrl);
    case "hisounique":  return callHisoUnique(gateway, body, items, webhookUrl);
    case "paradise":    return callParadise(gateway, body, items, webhookUrl);
    case "magicpay":    return callMagicPay(gateway, body, items, webhookUrl);
    default: throw new Error(`Gateway desconhecido: ${name}`);
  }
}

// ─── Gateway-specific payment callers ───

async function callBlackCatPay(gateway: any, body: any, items: any[], webhookUrl: string) {
  const webhookFields = getWebhookFields(webhookUrl);
  const res = await fetch("https://api.blackcatpay.com.br/api/sales/create-sale", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": gateway.secret_key,
    },
    body: JSON.stringify({
      amount: body.amount,
      currency: "BRL",
      paymentMethod: "pix",
      items,
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone.replace(/\D/g, ""),
        document: {
          number: body.customerDocument.replace(/\D/g, ""),
          type: body.customerDocument.replace(/\D/g, "").length <= 11 ? "cpf" : "cnpj",
        },
      },
      pix: { expiresInDays: 1 },
      ...webhookFields,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    transactionId: data.data?.transactionId,
    qrCode: data.data?.paymentData?.qrCode,
    copyPaste: data.data?.paymentData?.copyPaste,
    qrCodeBase64: data.data?.paymentData?.qrCodeBase64,
    expiresAt: data.data?.paymentData?.expiresAt,
  };
}

async function callGhostsPay(gateway: any, body: any, items: any[], webhookUrl: string) {
  const webhookFields = getWebhookFields(webhookUrl);
  const products = items.map((item) => ({
    product_name: item.title,
    quantity: item.quantity,
    value: item.unitPrice / 100,
  }));

  const res = await fetch("https://api.ghostspaysv1.com/api/generate-transaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Secret-Key": gateway.secret_key,
      "X-Public-Key": gateway.public_key,
    },
    body: JSON.stringify({
      client_name: body.customerName,
      client_email: body.customerEmail,
      client_document: body.customerDocument.replace(/\D/g, ""),
      client_mobile_phone: body.customerPhone.replace(/\D/g, ""),
      products,
      ...webhookFields,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };

  const pix = data.pix ?? data.data?.pix ?? {};

  return {
    transactionId: pickString(
      data.transaction_id, data.data?.transaction_id, data.data?.transactionId,
      data.id, data.data?.id, data.payment_id,
    ),
    qrCode: pickString(
      toAbsoluteUrl("https://ghostspaysv1.com", pix.qr_code_url),
      toAbsoluteUrl("https://ghostspaysv1.com", pix.qr_code_image),
      pix.qrCode, pix.code,
    ),
    copyPaste: pickString(pix.code, pix.copyPaste, pix.qrCode, data.pix_code),
    qrCodeBase64: pickString(pix.qrCodeBase64, pix.qr_code_base64),
    expiresAt: pickString(pix.expiration_date, pix.expiresAt),
  };
}

async function callDuck(gateway: any, body: any, items: any[], webhookUrl: string) {
  const identifier = `${Date.now()}${Math.random().toString(36).slice(2, 16).toUpperCase()}`;

  const products = items.map((item, idx) => ({
    id: `prod_${idx}`,
    name: item.title,
    quantity: item.quantity,
    price: item.unitPrice / 100,
  }));

  const res = await fetch("https://api.duckoficial.com/api/v1/gateway/pix/receive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": gateway.secret_key,
      "x-public-key": gateway.public_key,
    },
    body: JSON.stringify({
      identifier,
      amount: body.amount / 100,
      client: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone.replace(/\D/g, ""),
        document: body.customerDocument.replace(/\D/g, ""),
      },
      products,
      callbackUrl: webhookUrl,
      metadata: {
        source: "lovable_checkout",
      },
    }),
  });
  const data = await res.json();
  console.log("Duck response:", JSON.stringify(data));
  if (!res.ok) throw { status: res.status, data };

  const pix = data.pix ?? {};

  return {
    transactionId: pickString(data.transactionId, data.order?.id),
    qrCode: pickString(pix.image),
    copyPaste: pickString(pix.code),
    qrCodeBase64: pickString(pix.base64),
    expiresAt: null,
  };
}

async function callHisoUnique(gateway: any, body: any, items: any[], webhookUrl: string) {
  // Hiso Unique uses Basic Auth: Base64(PUBLIC_KEY:SECRET_KEY)
  const authToken = btoa(`${gateway.public_key}:${gateway.secret_key}`);

  const requestBody = {
    amount: body.amount, // in cents
    payment_method: "pix",
    postback_url: webhookUrl,
    customer: {
      name: body.customerName,
      email: body.customerEmail,
      phone: body.customerPhone.replace(/\D/g, ""),
      document: {
        number: body.customerDocument.replace(/\D/g, ""),
        type: body.customerDocument.replace(/\D/g, "").length <= 11 ? "cpf" : "cnpj",
      },
    },
    items: items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tangible: false,
    })),
    pix: {
      expires_in_minutes: 30,
    },
    metadata: {
      provider_name: "VoidTok Checkout",
    },
  };

  console.log("[HiSo] Request:", JSON.stringify(requestBody));

  const res = await fetch("https://api.hiso.com.br/v1/payment-transaction/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
      "Authorization": `Basic ${authToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const rawText = await res.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("[HiSo] Non-JSON response:", rawText);
    throw { status: res.status, data: { error: "Invalid response from Hiso", raw: rawText } };
  }

  console.log("[HiSo] Response status:", res.status);
  console.log("[HiSo] Response body:", JSON.stringify(data));

  if (!res.ok) throw { status: res.status, data };

  // Hiso may nest data under .data, .transaction, or root
  // Try every plausible shape
  const txn = data?.data ?? data?.transaction ?? data;
  const pix = txn?.pix ?? txn?.paymentData ?? txn?.payment_data ?? txn?.qr_code_data ?? txn;

  const transactionId = pickString(
    txn?.Id, txn?.id, txn?.transactionId, txn?.transaction_id, txn?.uuid,
    data?.Id, data?.id, data?.transactionId, data?.transaction_id,
  );

  // Hiso may return qr_code as base64 image OR as EMV string
  // Try multiple candidates for each field
  const qrCodeRaw = pickString(
    pix?.qrCode, pix?.qr_code, pix?.qrCodeUrl, pix?.qr_code_url,
    pix?.qrCodeImage, pix?.qr_code_image, pix?.image, pix?.qrcode,
    txn?.qrCode, txn?.qr_code, txn?.qr_code_url,
  );

  const copyPaste = pickString(
    pix?.copyPaste, pix?.copy_paste, pix?.copyAndPaste, pix?.copy_and_paste,
    pix?.pixCopiaECola, pix?.pix_copia_e_cola,
    pix?.code, pix?.pixCode, pix?.pix_code, pix?.emv,
    txn?.copyPaste, txn?.copy_paste, txn?.code, txn?.pixCode, txn?.pix_code,
    // Sometimes qrCode field IS the EMV string when no separate copyPaste is provided
    typeof pix?.qrCode === "string" && pix.qrCode.startsWith("0002") ? pix.qrCode : null,
    typeof pix?.qr_code === "string" && pix.qr_code.startsWith("0002") ? pix.qr_code : null,
  );

  const qrCodeBase64 = pickString(
    pix?.qrCodeBase64, pix?.qr_code_base64, pix?.qrcodeBase64,
    pix?.imageBase64, pix?.image_base64, pix?.base64,
    txn?.qrCodeBase64, txn?.qr_code_base64,
  );

  // If qrCodeRaw is an EMV string (starts with 0002) it's not an image URL
  const qrCodeIsImage = qrCodeRaw && (qrCodeRaw.startsWith("http") || qrCodeRaw.startsWith("data:"));

  return {
    transactionId,
    qrCode: qrCodeIsImage ? qrCodeRaw : null,
    copyPaste: copyPaste || (qrCodeRaw && !qrCodeIsImage ? qrCodeRaw : null),
    qrCodeBase64,
    expiresAt: pickString(
      pix?.expiresAt, pix?.expires_at, pix?.expiration_date, pix?.expirationDate,
      txn?.expiresAt, txn?.expires_at,
    ),
  };
}

async function callParadise(gateway: any, body: any, _items: any[], webhookUrl: string) {
  // Paradise uses X-API-Key header, amount in centavos
  const reference = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": gateway.secret_key,
    },
    body: JSON.stringify({
      amount: body.amount, // centavos
      description: body.productTitle,
      reference,
      source: "api_externa", // skip productHash validation
      postback_url: webhookUrl,
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        document: body.customerDocument.replace(/\D/g, ""),
        phone: body.customerPhone.replace(/\D/g, ""),
      },
    }),
  });
  const data = await res.json();
  console.log("Paradise response:", JSON.stringify(data));
  if (!res.ok && data?.status !== "success") throw { status: res.status, data };

  // Response: { status:"success", transaction_id:238, id:"REF", qr_code:"EMV...", qr_code_base64:"data:image/png;base64,...", amount, expires_at }
  return {
    transactionId: pickString(data?.transaction_id, data?.id, reference),
    qrCode: null, // qr_code is EMV string not image URL
    copyPaste: pickString(data?.qr_code, data?.pix_code),
    qrCodeBase64: pickString(data?.qr_code_base64),
    expiresAt: pickString(data?.expires_at),
  };
}

async function callMagicPay(gateway: any, body: any, items: any[], webhookUrl: string) {
  const reference = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const payload = {
    amount: body.amount, // centavos
    currency: "BRL",
    method: "PIX",
    description: body.productTitle,
    externalRef: reference,
    notificationUrl: webhookUrl,
    payer: {
      name: body.customerName,
      taxId: body.customerDocument.replace(/\D/g, ""),
      email: body.customerEmail,
      phone: body.customerPhone.replace(/\D/g, ""),
    },
    items: items.map((item) => ({
      quantity: item.quantity,
      name: item.title,
      price: item.unitPrice, // centavos
      type: "PHYSICAL",
    })),
  };

  const res = await fetch("https://api.sistema-magicpay.com/v1/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${gateway.secret_key}`,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("[MagicPay] Non-JSON response:", rawText);
    throw { status: res.status, data: { error: "Invalid response from MagicPay", raw: rawText } };
  }

  console.log("[MagicPay] Response status:", res.status);
  console.log("[MagicPay] Response body:", JSON.stringify(data));

  if (!res.ok) throw { status: res.status, data };

  // Defensive parsing — try common shapes
  const txn = data?.data ?? data?.payment ?? data?.transaction ?? data;
  const pix = txn?.pix ?? txn?.qrCode ?? txn?.qr_code ?? txn?.paymentData ?? txn?.payment_data ?? txn;

  const transactionId = pickString(
    txn?.id, txn?.Id, txn?.transactionId, txn?.transaction_id, txn?.paymentId, txn?.payment_id,
    txn?.externalRef, data?.id, data?.transactionId, reference,
  );

  const copyPaste = pickString(
    pix?.copyPaste, pix?.copy_paste, pix?.pixCopyPaste, pix?.pix_copy_paste,
    pix?.code, pix?.emv, pix?.payload, pix?.pixCode, pix?.pix_code,
    pix?.qrCode, pix?.qr_code,
    txn?.copyPaste, txn?.copy_paste, txn?.pixCode, txn?.pix_code,
    typeof pix === "string" ? pix : null,
  );

  const qrCodeBase64 = pickString(
    pix?.qrCodeBase64, pix?.qr_code_base64, pix?.imageBase64, pix?.image_base64, pix?.base64,
    txn?.qrCodeBase64, txn?.qr_code_base64,
  );

  const qrCodeUrl = pickString(
    pix?.qrCodeUrl, pix?.qr_code_url, pix?.imageUrl, pix?.image_url, pix?.image,
    txn?.qrCodeUrl, txn?.qr_code_url,
  );

  return {
    transactionId,
    qrCode: qrCodeUrl,
    copyPaste,
    qrCodeBase64,
    expiresAt: pickString(
      pix?.expiresAt, pix?.expires_at, pix?.expiration_date, pix?.expirationDate,
      txn?.expiresAt, txn?.expires_at,
    ),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = parsed.data;

    // Capture customer IP from request headers
    const customerIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let gateways: any[] = [];
    let product;
    try {
      const lookup = await getGatewaysForProductOwner(supabase, body.productId);
      gateways = lookup.gateways;
      product = lookup.product;
    } catch (gatewayLookupError: any) {
      console.error("Gateway lookup error:", gatewayLookupError?.message || gatewayLookupError);
      return new Response(
        JSON.stringify({ error: gatewayLookupError?.message || "Gateway de pagamento não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build items
    const items = [
      {
        title: body.productTitle,
        unitPrice: Math.round(body.amount - (body.shippingCost || 0) - body.selectedBumps.reduce((s, b) => s + b.price, 0)),
        quantity: body.quantity,
        tangible: false,
      },
      ...body.selectedBumps.map((b) => ({
        title: b.title,
        unitPrice: b.price,
        quantity: 1,
        tangible: false,
      })),
    ];

    if (body.shippingCost && body.shippingCost > 0) {
      items.push({
        title: "Frete",
        unitPrice: body.shippingCost,
        quantity: 1,
        tangible: false,
      });
    }

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

    // Tenta cada gateway em ordem (ativo primeiro, depois fallbacks por prioridade).
    // Logs cada tentativa em gateway_health_logs.
    let paymentResult: any = null;
    let usedGateway: any = null;
    let lastError: any = null;
    const tried: string[] = [];

    for (let i = 0; i < gateways.length; i++) {
      const gw = gateways[i];
      const fallbackFrom = i > 0 ? tried[tried.length - 1] : null;
      const startedAt = Date.now();
      try {
        paymentResult = await callGateway(gw.gateway_name, gw, body, items, webhookUrl);
        const latency = Date.now() - startedAt;
        await logGatewayHealth(supabase, {
          userId: product.user_id,
          gatewayName: gw.gateway_name,
          success: true,
          statusCode: 200,
          latencyMs: latency,
          fallbackFrom,
        });
        usedGateway = gw;
        tried.push(gw.gateway_name);
        if (fallbackFrom) {
          console.log(`[Fallback] ✅ ${gw.gateway_name} OK depois de ${fallbackFrom} falhar`);
        }
        break;
      } catch (err: any) {
        const latency = Date.now() - startedAt;
        const errMsg = (err?.data ? JSON.stringify(err.data).slice(0, 500) : String(err?.message || err)).slice(0, 500);
        console.error(`[Gateway ${gw.gateway_name}] erro (tentativa ${i + 1}/${gateways.length}):`, errMsg);
        await logGatewayHealth(supabase, {
          userId: product.user_id,
          gatewayName: gw.gateway_name,
          success: false,
          statusCode: err?.status || null,
          latencyMs: latency,
          errorMessage: errMsg,
          fallbackFrom,
        });
        tried.push(gw.gateway_name);
        lastError = err;
        // segue para próximo gateway
      }
    }

    if (!paymentResult || !usedGateway) {
      return new Response(
        JSON.stringify({
          error: "Todos os gateways de pagamento falharam",
          tried,
          details: lastError?.data || null,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gateway = usedGateway;

    // Sanitize expiresAt
    let safeExpiresAt: string | null = null;
    if (paymentResult.expiresAt) {
      const parsedDate = new Date(paymentResult.expiresAt);
      const maxExpiry = Date.now() + 30 * 60 * 1000;
      if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
        safeExpiresAt = parsedDate.getTime() > maxExpiry
          ? new Date(maxExpiry).toISOString()
          : parsedDate.toISOString();
      }
    }
    if (!safeExpiresAt) {
      safeExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }

    // Save order
    const { data: orderData, error: orderError } = await supabase.from("orders").insert({
      product_id: body.productId,
      quantity: body.quantity,
      subtotal: body.amount / 100,
      shipping_cost: (body.shippingCost || 0) / 100,
      shipping_option_id: body.shippingOptionId || null,
      bumps_total: body.selectedBumps.reduce((s, b) => s + b.price, 0) / 100,
      total: body.amount / 100,
      customer_name: body.customerName,
      customer_email: body.customerEmail,
      customer_phone: body.customerPhone,
      customer_document: body.customerDocument,
      customer_cep: body.customerCep || null,
      customer_address: body.customerAddress || null,
      customer_number: body.customerNumber || null,
      customer_complement: body.customerComplement || null,
      customer_neighborhood: body.customerNeighborhood || null,
      customer_city: body.customerCity || null,
      customer_state: body.customerState || null,
      customer_ip: customerIp,
      customer_user_agent: body.customerUserAgent || null,
      payment_method: "pix",
      payment_status: "pending",
      transaction_id: paymentResult.transactionId,
      pix_qr_code: paymentResult.qrCode,
      pix_copy_paste: paymentResult.copyPaste,
      pix_qr_code_base64: paymentResult.qrCodeBase64,
      pix_expires_at: safeExpiresAt,
      selected_bumps: body.selectedBumps,
      product_variant: body.productVariant || null,
      utm_params: body.utmParams || {},
    }).select("id").single();

    if (orderError) {
      console.error("Order save error:", orderError);
    }

    // Fire TikTok CompletePayment via Server-to-Server quando o PIX é gerado.
    // Bypassa ad-blockers do navegador do visitante (que comumente bloqueiam
    // analytics.tiktok.com). Roda em paralelo, sem await, pra não atrasar a resposta.
    if (orderData?.id && product.user_id) {
      dispatchTikTokPixGenerated(supabase, {
        userId: product.user_id,
        orderId: orderData.id,
        productId: body.productId,
        productTitle: body.productTitle,
        quantity: body.quantity,
        total: body.amount / 100,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        customerIp,
        customerUserAgent: body.customerUserAgent || null,
        ttclid: body.utmParams?.ttclid ?? null,
      });
    }

    // Dispatch order_created webhook
    if (orderData?.id) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/dispatch-webhooks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            event: "order_created",
            owner_user_id: product.user_id,
            payload: {
              order_id: orderData.id,
              transaction_id: paymentResult.transactionId,
              utm_source: body.utmParams?.utm_source || body.utmParams?.src || "",
              utm_params: body.utmParams || {},
              customer_name: body.customerName,
              customer_email: body.customerEmail,
              customer_phone: body.customerPhone,
              customer_document: body.customerDocument,
              total: body.amount / 100,
              product_id: body.productId,
              product_variant: body.productVariant || null,
              payment_method: "pix",
              selected_bumps: body.selectedBumps,
            },
          }),
        });
      } catch (whErr) {
        console.error("Webhook dispatch error:", whErr);
      }

      // Send push notification for pending order - "Venda Pendente"
      try {
        const totalFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(body.amount / 100);
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            title: "🔔 Venda Pendente",
            body: `${body.customerName} • ${totalFormatted}`,
            customer_name: body.customerName,
            total_amount: body.amount / 100,
            gateway_name: gateway.display_name || gateway.gateway_name,
            product_title: body.productTitle,
             url: "/daisakoikeda/orders",
            event_type: "order_pending",
            owner_user_id: product.user_id,
            tag: `order-pending-${orderData?.id || Date.now()}`,
          }),
        });
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }

      // Send to Utmify (waiting_payment)
      if (orderData?.id) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-utmify-order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              order_id: orderData.id,
              status: "pending",
            }),
          });
        } catch (utmifyErr) {
          console.error("Utmify dispatch error:", utmifyErr);
        }

        // Xtracky deduplica orderId + utm_source; se enviarmos waiting_payment aqui,
        // o evento paid posterior pode ser ignorado como duplicado.
        // Por isso, o envio fica somente na confirmação real do pagamento.
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: paymentResult.transactionId,
        paymentData: {
          qrCode: paymentResult.qrCode,
          copyPaste: paymentResult.copyPaste,
          qrCodeBase64: paymentResult.qrCodeBase64,
          expiresAt: safeExpiresAt,
        },
        orderId: orderData?.id || null,
        thankYouUrl: product?.thank_you_url || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
