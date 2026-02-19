"use client";

import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";
import { useAuth } from "@/lib/auth";
import FloatingCartButton from "@/components/store/FloatingCartButton";
import InstallPrompt from "@/components/pwa/InstallPrompt";

/**
 * CLIENT SHELL — PRODUCTION DOMINATION VERSION
 *
 * RESPONSIBILITIES:
 * - Global layout shell
 * - ONE-TIME auth hydration
 * - Global floating cart system
 * - Service Worker registration (PWA)
 * - Install prompt (PWA)
 *
 * RULES:
 * - Hydrate auth ONCE here
 * - NO redirects here
 * - NO conditional rendering here
 * - Floating cart must exist globally
 *
 * NOTE:
 * - Zustand does NOT require CartProvider
 */

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuth((s) => s.hydrate);

  /* 🔥 SINGLE SOURCE OF AUTH HYDRATION */
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  /* 📲 SERVICE WORKER REGISTRATION
     - Registers sw.js from /public/sw.js
     - Handles updates gracefully: new SW waits, then activates on next visit
     - Only runs in production-like environments (not localhost dev by default,
       but you can remove the hostname check if you want dev SW support)
  */
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none", // always check for SW updates on navigate
        });

        /* Check for updates every time the app gains focus */
        window.addEventListener("focus", () => {
          registration.update().catch(() => {});
        });

        /* When a new SW is waiting, tell it to activate */
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              /* A new version is ready — you can show a toast here if you want:
                 toast("Update available — refresh to get the latest version") */
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        console.log("[PWA] Service Worker registered:", registration.scope);
      } catch (err) {
        console.warn("[PWA] Service Worker registration failed:", err);
      }
    };

    /* Register after page load to not block initial render */
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW, { once: true });
    }
  }, []);

  return (
    <UIProvider>
      {/* HEADER */}
      <Header />

      {/* MAIN LAYOUT */}
      <div className="appShell">
        <Sidebar />
        <main className="pageContentWrap">
          {children}
        </main>
      </div>

      {/* GLOBAL FLOATING CART SYSTEM */}
      <FloatingCartButton />

      {/* PWA INSTALL PROMPT — shows install banner on compatible browsers/devices */}
      <InstallPrompt />
    </UIProvider>
  );
}