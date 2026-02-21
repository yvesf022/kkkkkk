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
    // Auto-dismiss splash after 2 seconds on all devices/browsers.
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);

    const vp = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone && vp) {
      // Installed PWA on mobile — use normal responsive viewport so the app
      // scales to fit the screen instead of rendering at 1024px and zooming in.
      vp.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    }

    // JS zoom-lock: only apply when NOT in standalone (browser tab desktop lock).
    const lockZoom = () => {
      if (isStandalone || !vp) return;
      vp.content = "width=1024, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no";
    };

    // Block double-tap zoom (browser only)
    let lastTap = 0;
    const onTouchEnd = (e: TouchEvent) => {
      if (isStandalone) return;
      const now = Date.now();
      if (now - lastTap < 300) {
        e.preventDefault();
        lockZoom();
      }
      lastTap = now;
    };

    // Block pinch-zoom (browser only)
    const onTouchMove = (e: TouchEvent) => {
      if (isStandalone) return;
      if (e.touches.length > 1) {
        e.preventDefault();
        lockZoom();
      }
    };

    document.addEventListener("touchend",  onTouchEnd,  { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      clearTimeout(splashTimer);
      document.removeEventListener("touchend",  onTouchEnd);
      document.removeEventListener("touchmove", onTouchMove);
    };
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