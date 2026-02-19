"use client";

import { useState, useEffect, useCallback } from "react";

type Platform = "android" | "ios" | "desktop" | "unsupported";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unsupported";
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid;
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  if (!isMobile) return "desktop";
  return "unsupported";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

const DISMISS_KEY = "karabo-pwa-dismissed";
const COOLDOWN_DAYS = 7;

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const daysSince = (Date.now() - Number(ts)) / (1000 * 60 * 60 * 24);
    return daysSince < COOLDOWN_DAYS;
  } catch {
    return false;
  }
}

function recordDismissal() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [platform, setPlatform]             = useState<Platform>("unsupported");
  const [showIOSGuide, setShowIOSGuide]     = useState(false);
  const [installing, setInstalling]         = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const p = detectPlatform();
    setPlatform(p);

    if (p === "ios") {
      const t = setTimeout(() => setShowBanner(true), 3500);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      setShowIOSGuide(true);
      return;
    }
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    setShowIOSGuide(false);
    recordDismissal();
  }, []);

  if (!showBanner) return null;

  if (showIOSGuide) {
    return (
      <div style={s.overlay}>
        <div style={s.sheet}>
          <AppIcon />
          <h2 style={s.sheetTitle}>Install Karabo's Store App</h2>
          <p style={s.sheetBody}>Follow these steps to add the app to your home screen:</p>
          <div style={s.steps}>
            <IOSStep n={1} icon="⬆️" text={<>Tap the <strong>Share</strong> button in Safari's toolbar</>} />
            <IOSStep n={2} icon="📲" text={<>Scroll down and tap <strong>"Add to Home Screen"</strong></>} />
            <IOSStep n={3} icon="✅" text={<>Tap <strong>"Add"</strong> in the top-right corner</>} />
          </div>
          <button onClick={dismiss} style={s.closeBtn}>Got it</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.banner} role="banner" aria-label="Install app banner">
      <AppIcon size={44} />
      <div style={s.bannerText}>
        {/* ✅ FIXED: was "Add to Desktop/Home Screen" */}
        <p style={s.bannerTitle}>Install Karabo's Store App</p>
        <p style={s.bannerSub}>
          {platform === "desktop"
            ? "Install for faster access & offline shopping"
            : "Shop faster, offline & full-screen"}
        </p>
      </div>
      <div style={s.bannerActions}>
        <button onClick={handleInstall} disabled={installing} style={s.installBtn}>
          {installing ? "Installing…" : "Install"}
        </button>
        <button onClick={dismiss} style={s.dismissBtn} aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}

function AppIcon({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: "linear-gradient(135deg, #0033a0, #009543)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, fontWeight: 900, color: "#fff", flexShrink: 0,
      boxShadow: "0 2px 10px rgba(0,51,160,.3)",
    }}>K</div>
  );
}

function IOSStep({ n, icon, text }: { n: number; icon: string; text: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "#EFF6FF", color: "#1D4ED8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, flexShrink: 0,
      }}>{n}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{text}</p>
      </div>
    </div>
  );
}

const FF = "'Sora', -apple-system, BlinkMacSystemFont, sans-serif";

const s: Record<string, React.CSSProperties> = {
  banner: {
    position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 9999,
    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
    background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.06)",
    fontFamily: FF, animation: "slideUp .4s cubic-bezier(0.34,1.56,0.64,1)",
    maxWidth: 480, margin: "0 auto",
  },
  bannerText: { flex: 1, minWidth: 0 },
  bannerTitle: { fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 2px" },
  bannerSub:   { fontSize: 12, color: "#64748B", margin: 0 },
  bannerActions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  installBtn: {
    padding: "9px 18px", borderRadius: 9, background: "#1E3A8A", color: "#fff",
    border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
    fontFamily: FF, whiteSpace: "nowrap",
  },
  dismissBtn: {
    width: 30, height: 30, borderRadius: "50%", background: "#F1F5F9", border: "none",
    color: "#94A3B8", fontSize: 13, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  overlay: {
    position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.5)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    padding: "0 16px 16px", animation: "fadeIn .25s ease", fontFamily: FF,
  },
  sheet: {
    background: "#fff", borderRadius: 20, padding: "28px 24px 20px",
    width: "100%", maxWidth: 420,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
    boxShadow: "0 -4px 24px rgba(0,0,0,.12)",
    animation: "slideUp .35s cubic-bezier(0.34,1.56,0.64,1)",
  },
  sheetTitle: { fontSize: 18, fontWeight: 700, color: "#0F172A", textAlign: "center", margin: 0 },
  sheetBody:  { fontSize: 14, color: "#64748B", textAlign: "center", margin: 0 },
  steps: { width: "100%", borderTop: "1px solid #F1F5F9" },
  closeBtn: {
    width: "100%", padding: "13px", borderRadius: 12, background: "#1E3A8A", color: "#fff",
    border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FF, marginTop: 4,
  },
};