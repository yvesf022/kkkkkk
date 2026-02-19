"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function AdminInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => setVisible(false);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#1e293b",
        color: "#fff",
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        maxWidth: 400,
        width: "calc(100% - 48px)",
        fontFamily: "'Sora', -apple-system, sans-serif",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: "linear-gradient(135deg, #0033a0, #009543)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 900,
          flexShrink: 0,
        }}
      >
        K
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Install Karabo's Store Admin</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
          Manage your store from your home screen
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            background: "#0033a0",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            color: "#94a3b8",
            border: "none",
            borderRadius: 8,
            padding: "4px 14px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}