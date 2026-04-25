export interface PendingPixOrderData {
  slug: string;
  orderId: string;
  copyPaste: string;
  expiresAt: string;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  thankYouUrl?: string | null;
}

const pendingOrderKey = (slug: string) => `pendingPixOrder:${slug}`;
const thankYouKey = (orderId: string) => `thankYouUrl:${orderId}`;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const savePendingPixOrder = (data: PendingPixOrderData) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      pendingOrderKey(data.slug),
      JSON.stringify({
        ...data,
        savedAt: Date.now(),
      })
    );

    if (data.thankYouUrl) {
      window.localStorage.setItem(thankYouKey(data.orderId), data.thankYouUrl);
    }
  } catch {
    // ignore storage failures
  }
};

export const readPendingPixOrder = (slug: string): PendingPixOrderData | null => {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(pendingOrderKey(slug));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingPixOrderData> & { savedAt?: number };

    if (!parsed.orderId || !parsed.copyPaste || !parsed.expiresAt) {
      window.localStorage.removeItem(pendingOrderKey(slug));
      return null;
    }

    const expiresAt = new Date(parsed.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      window.localStorage.removeItem(pendingOrderKey(slug));
      window.localStorage.removeItem(thankYouKey(parsed.orderId));
      return null;
    }

    return {
      slug,
      orderId: parsed.orderId,
      copyPaste: parsed.copyPaste,
      expiresAt: parsed.expiresAt,
      qrCode: parsed.qrCode ?? null,
      qrCodeBase64: parsed.qrCodeBase64 ?? null,
      thankYouUrl: parsed.thankYouUrl ?? window.localStorage.getItem(thankYouKey(parsed.orderId)),
    };
  } catch {
    return null;
  }
};

export const clearPendingPixOrder = (slug: string, orderId?: string | null) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(pendingOrderKey(slug));
    if (orderId) {
      window.localStorage.removeItem(thankYouKey(orderId));
    }
  } catch {
    // ignore storage failures
  }
};

export const readStoredThankYouUrl = (orderId: string) => {
  if (!canUseStorage()) return null;

  try {
    return window.localStorage.getItem(thankYouKey(orderId));
  } catch {
    return null;
  }
};

export const saveStoredThankYouUrl = (orderId: string, thankYouUrl: string) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(thankYouKey(orderId), thankYouUrl);
  } catch {
    // ignore storage failures
  }
};