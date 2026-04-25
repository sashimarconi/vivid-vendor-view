// Service Worker - VoidTok Push Notifications
// Version: 2026-04-22-v3

self.addEventListener("install", (event) => {
  // Force this SW to become active immediately, replacing any old version
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of all open clients (tabs) right away
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Nova venda!",
    body: "Você recebeu um novo pagamento.",
    url: "/dashboard/orders",
  };

  try {
    if (event.data) {
      const text = event.data.text();
      try {
        data = { ...data, ...JSON.parse(text) };
      } catch {
        data.body = text;
      }
    }
  } catch (err) {
    // keep defaults
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    image: data.image || undefined,
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || `sale-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || "/dashboard/orders",
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration
      .showNotification(data.title || "Nova venda!", options)
      .catch((err) => console.error("[SW] showNotification error:", err))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard/orders";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            try {
              client.navigate?.(targetUrl);
            } catch {
              // ignore
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
