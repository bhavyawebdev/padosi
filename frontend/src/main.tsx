import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { ViewLocalityProvider } from "@/features/locality/localityStore";
import "@/styles/global.css";

// PWA service worker.
// - Production: register the real worker (network-first, safe offline fallback).
// - Development: NEVER register — and actively clear any stale worker + caches from
//   earlier sessions, because a dev-mode SW caching old bundles caused the app to
//   serve outdated pages (e.g. the old "/admin" error screen). Vite HMR is the
//   source of truth in dev; a service worker only gets in the way.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW is progressive enhancement — never block the app on it */
      });
    } else {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {});
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ViewLocalityProvider>
              <App />
            </ViewLocalityProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
