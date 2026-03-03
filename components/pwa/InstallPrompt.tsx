"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ──────────────────────────────────────────────────── */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __karabo_deferredPrompt: BeforeInstallPromptEvent | null;
  }
}

type Platform = "android" | "ios" | "desktop" | "unsupported";

/* ── Platform detection ─────────────────────────────────────── */
function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unsupported";
  const ua = navigator.userAgent;
  // iOS must come before Android (iPads can include "Android" in some UAs)
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  // Android must come before the generic Chrome/desktop check — Chrome on
  // Android contains "Chrome" in the UA so without this order it would be
  // misclassified as "desktop" and never get the Android install flow.
  if (/Android/.test(ua)) return "android";
  if (/Chrome|Edg|Samsung/.test(ua)) return "desktop";
  return "unsupported";
}

function isAlreadyInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as any).standalone === true
  );
}

/* ── Dismissal cooldown (3 days) ────────────────────────────── */
const DISMISS_KEY = "karabo-pwa-dismissed-at";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    return ts ? Date.now() - Number(ts) < COOLDOWN_MS : false;
  } catch { return false; }
}

function recordDismissal() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

/* ── Component ──────────────────────────────────────────────── */
export default function InstallPrompt() {
  const [showBanner, setShowBanner]     = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [platform, setPlatform]         = useState<Platform>("unsupported");
  const [installing, setInstalling]     = useState(false);
  const [canInstall, setCanInstall]     = useState(false);  // true = native prompt available
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isAlreadyInstalled() || wasDismissedRecently()) return;

    const p = detectPlatform();
    setPlatform(p);
    if (p === "unsupported") return;

    // ── KEY FIX ────────────────────────────────────────────────
    // The browser fires beforeinstallprompt VERY early — before React
    // hydrates. Our layout.tsx <head> script catches it and stores it
    // on window.__karabo_deferredPrompt. We read it here.
    const consumeEarly = (): boolean => {
      const early = window.__karabo_deferredPrompt;
      if (early) {
        promptRef.current = early;
        window.__karabo_deferredPrompt = null;
        setCanInstall(true);
        // Delay past the 2500ms splash so the banner never fires invisibly
        // underneath it — Chrome counts that as a missed interaction and
        // won't re-show the native prompt.
        setTimeout(() => setShowBanner(true), 3200);
        return true;
      }
      return false;
    };

    if (consumeEarly()) return;

    // Fallback: browser fires it late (slow connection / first visit)
    const nativeHandler = (e: Event) => {
      (e as BeforeInstallPromptEvent).preventDefault?.();
      promptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
      setTimeout(() => setShowBanner(true), 3200);
    };
    window.addEventListener("beforeinstallprompt", nativeHandler);

    // Relay from our inline <head> script (fires if React mounted first)
    const relayHandler = () => consumeEarly();
    window.addEventListener("karabo-install-ready", relayHandler);

    // iOS — no native prompt, show manual guide after delay
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (p === "ios") {
      iosTimer = setTimeout(() => {
        setCanInstall(false);
        setShowBanner(true);
      }, 3500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", nativeHandler);
      window.removeEventListener("karabo-install-ready", relayHandler);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    // iOS / no native prompt → show manual guide
    if (!promptRef.current) {
      setShowIOSGuide(true);
      return;
    }
    setInstalling(true);
    try {
      await promptRef.current.prompt();
      const { outcome } = await promptRef.current.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        promptRef.current = null;
      }
    } catch (err) {
      console.warn("[PWA] install error:", err);
    } finally {
      setInstalling(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    setShowIOSGuide(false);
    recordDismissal();
  }, []);

  if (!showBanner) return null;

  /* ── iOS guide sheet ── */
  if (showIOSGuide) {
    return (
      <>
        <style>{`
          @keyframes ks-fadeIn  { from{opacity:0}        to{opacity:1} }
          @keyframes ks-slideUp { from{transform:translateY(40px);opacity:0} to{transform:none;opacity:1} }
        `}</style>
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && dismiss()}>
          <div style={s.sheet}>
            <AppIcon size={52} />
            <h2 style={s.sheetTitle}>Install Karabo's Store App</h2>
            <p style={s.sheetBody}>Add to your home screen for the full app experience — faster, offline-ready, full-screen.</p>
            <div style={s.steps}>
              <IOSStep n={1} icon="⬆️" text={<>Tap the <strong>Share</strong> button in Safari's toolbar (bottom centre)</>} />
              <IOSStep n={2} icon="📲" text={<>Scroll down and tap <strong>"Add to Home Screen"</strong></>} />
              <IOSStep n={3} icon="✅" text={<>Tap <strong>"Add"</strong> in the top-right corner</>} />
            </div>
            <button onClick={dismiss} style={s.closeBtnPrimary}>Got it</button>
            <button onClick={dismiss} style={s.closeBtnGhost}>Maybe later</button>
          </div>
        </div>
      </>
    );
  }

  /* ── Install banner ── */
  return (
    <>
      <style>{`
        @keyframes ks-slideUp {
          from { transform:translateY(80px); opacity:0 }
          to   { transform:none; opacity:1 }
        }
        @keyframes ks-spin { to{transform:rotate(360deg)} }
      `}</style>
      <div style={s.banner} role="banner" aria-label="Install app banner">
        <AppIcon size={44} />
        <div style={s.bannerText}>
          <p style={s.bannerTitle}>Install Karabo's Store App</p>
          <p style={s.bannerSub}>
            {platform === "desktop"
              ? "Install for faster access & offline shopping"
              : "Shop faster, offline & full-screen on your home screen"}
          </p>
        </div>
        <div style={s.bannerActions}>
          <button onClick={handleInstall} disabled={installing} style={{ ...s.installBtn, opacity: installing ? 0.7 : 1 }}>
            {installing ? (
              <span style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ width:12, height:12, border:"2px solid rgba(255,255,255,0.35)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"ks-spin 0.7s linear infinite" }} />
                Installing…
              </span>
            ) : canInstall ? "Install" : "How to Install"}
          </button>
          <button onClick={dismiss} style={s.dismissBtn} aria-label="Dismiss">✕</button>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */
function AppIcon({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.22),
      background: "linear-gradient(135deg, #0033a0, #009543)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, fontWeight: 900, color: "#fff", flexShrink: 0,
      boxShadow: "0 2px 10px rgba(0,51,160,.3)",
    }}>K</div>
  );
}

function IOSStep({ n, icon, text }: { n: number; icon: string; text: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"10px 0", borderBottom:"1px solid #F1F5F9" }}>
      <div style={{
        width:28, height:28, borderRadius:"50%", background:"#EFF6FF",
        color:"#1D4ED8", display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:12, fontWeight:800, flexShrink:0,
      }}>{n}</div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <p style={{ fontSize:14, color:"#374151", lineHeight:1.5, margin:0 }}>{text}</p>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const FF = "'Sora', -apple-system, BlinkMacSystemFont, sans-serif";

const s: Record<string, React.CSSProperties> = {
  banner: {
    position:"fixed", bottom:16, left:16, right:16, zIndex:999999,
    display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
    background:"#fff", border:"1px solid #E2E8F0", borderRadius:16,
    boxShadow:"0 8px 32px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.06)",
    fontFamily:FF, animation:"ks-slideUp .4s cubic-bezier(0.34,1.56,0.64,1)",
    maxWidth:480, margin:"0 auto",
  },
  bannerText: { flex:1, minWidth:0 },
  bannerTitle: { fontSize:14, fontWeight:700, color:"#0F172A", margin:"0 0 2px", fontFamily:FF },
  bannerSub:   { fontSize:12, color:"#64748B", margin:0, fontFamily:FF },
  bannerActions: { display:"flex", alignItems:"center", gap:8, flexShrink:0 },
  installBtn: {
    padding:"9px 18px", borderRadius:9, background:"#1E3A8A", color:"#fff",
    border:"none", fontWeight:700, fontSize:13, cursor:"pointer",
    fontFamily:FF, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6,
  },
  dismissBtn: {
    width:30, height:30, borderRadius:"50%", background:"#F1F5F9",
    border:"none", color:"#94A3B8", fontSize:13, cursor:"pointer",
    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
  },
  overlay: {
    position:"fixed", inset:0, zIndex:999999, background:"rgba(0,0,0,.5)",
    display:"flex", alignItems:"flex-end", justifyContent:"center",
    padding:"0 16px 16px", animation:"ks-fadeIn .25s ease", fontFamily:FF,
  },
  sheet: {
    background:"#fff", borderRadius:20, padding:"28px 24px 20px",
    width:"100%", maxWidth:420,
    display:"flex", flexDirection:"column", alignItems:"center", gap:16,
    boxShadow:"0 -4px 24px rgba(0,0,0,.12)",
    animation:"ks-slideUp .35s cubic-bezier(0.34,1.56,0.64,1)",
  },
  sheetTitle: { fontSize:18, fontWeight:700, color:"#0F172A", textAlign:"center", margin:0, fontFamily:FF },
  sheetBody:  { fontSize:14, color:"#64748B", textAlign:"center", margin:0, fontFamily:FF },
  steps: { width:"100%", borderTop:"1px solid #F1F5F9" },
  closeBtnPrimary: {
    width:"100%", padding:"13px", borderRadius:12, background:"#1E3A8A",
    color:"#fff", border:"none", fontWeight:700, fontSize:15, cursor:"pointer",
    fontFamily:FF, marginTop:4,
  },
  closeBtnGhost: {
    width:"100%", padding:"10px", borderRadius:12, background:"transparent",
    color:"#94A3B8", border:"none", fontWeight:500, fontSize:13, cursor:"pointer",
    fontFamily:FF,
  },
};