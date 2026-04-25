import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for push notifications.
// Skip ONLY in the Lovable editor iframe preview (id-preview--*).
// We DO register on the published domain (lovable.app, custom domains, etc.)
if ("serviceWorker" in navigator) {
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // Only the editor preview host has "id-preview--" prefix
  const isEditorPreview = window.location.hostname.startsWith("id-preview--");

  if (!isInIframe && !isEditorPreview) {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(async (reg) => {
        // Force check for updates so the new SW (with skipWaiting) takes over
        try {
          await reg.update();
        } catch {
          // ignore
        }
      })
      .catch((err) => console.error("[SW] register error:", err));
  } else {
    // Inside the editor iframe: clean up any previously registered SW
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.forEach((r) => r.unregister())
    );
  }
}

createRoot(document.getElementById("root")!).render(<App />);
