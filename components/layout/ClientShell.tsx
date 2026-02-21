"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";
import { useAuth } from "@/lib/auth";
import FloatingCartButton from "@/components/store/FloatingCartButton";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import SplashScreen from "@/components/pwa/SplashScreen";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuth((s) => s.hydrate);
  // Show splash on every load — both desktop browsers and installed PWA.
  // The splash auto-dismisses after 2 seconds via the timer below.
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Auto-dismiss splash after 2.5 seconds on all devices/browsers.
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);

    const vp = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as any).standalone === true;

    // Calculate scale so the 1024px layout fits the screen width exactly —
    // no horizontal scroll, no manual zoom-out needed, like Jumia/Shein.
    const scale = Math.min(1, window.screen.width / 1024);

    if (vp) {
      if (isStandalone) {
        // Installed PWA — fit to device screen, allow pinch-zoom
        vp.content = `width=1024, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=5, user-scalable=yes, viewport-fit=cover`;
      } else {
        // Browser tab — same auto-fit scale, allow pinch-zoom to read details
        vp.content = `width=1024, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=5, user-scalable=yes, viewport-fit=cover`;
      }
    }

    return () => clearTimeout(splashTimer);
  }, []);

  /* 🔥 SINGLE SOURCE OF AUTH HYDRATION */
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  /* 📲 SERVICE WORKER REGISTRATION */
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        window.addEventListener("focus", () => {
          registration.update().catch(() => {});
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        console.log("[PWA] Service Worker registered:", registration.scope);
      } catch (err) {
        console.warn("[PWA] Service Worker registration failed:", err);
      }
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW, { once: true });
    }
  }, []);

  return (
    <UIProvider>
      {/* LUXURY SPLASH SCREEN — shows on first load */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* HEADER */}
      <Header />

      {/* MAIN LAYOUT */}
      <div className="appShell">
        <Sidebar />
        <main className="pageContentWrap">
          {children}
        </main>
      </div>

      {/* GLOBAL FLOATING CART */}
      <FloatingCartButton />

      {/* PWA INSTALL PROMPT */}
      <InstallPrompt />
    </UIProvider>
  );
}