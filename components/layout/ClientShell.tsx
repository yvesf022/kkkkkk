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
  const [showSplash, setShowSplash] = useState(true);

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