"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductListItem } from "@/lib/types";
import { categoriesApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
}

function optimizeImg(url: string | null | undefined, size: 300 | 500 | 1500 = 300): string | null {
  if (!url) return null;
  if (!url.includes("m.media-amazon.com")) return url;
  return url.replace(/_AC_S[LY]\d+_/g, `_AC_SL${size}_`);
}

interface HP {
  id: string; title: string; price: number; compare_price?: number | null;
  discount_pct?: number | null; brand?: string; category?: string;
  rating?: number | null; rating_number?: number | null;
  in_stock: boolean; main_image?: string | null; sales?: number;
}
interface Section {
  key: string; title: string; subtitle: string;
  badge: string | null; theme: string;
  view_all: string; products: HP[];
}

function safeViewAll(raw: string): string {
  try {
    const url = new URL(raw, "http://x");
    const search = url.searchParams.get("search");
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q");
    const sort = url.searchParams.get("sort");
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    return `/store${params.toString() ? "?" + params.toString() : ""}`;
  } catch { return "/store"; }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const THEME_MAP: Record<string, { primary: string; glow: string }> = {
  red:    { primary: "#c0392b", glow: "rgba(192,57,43,0.15)" },
  green:  { primary: "#0f3f2f", glow: "rgba(15,63,47,0.15)" },
  gold:   { primary: "#b8860b", glow: "rgba(184,134,11,0.15)" },
  forest: { primary: "#1b5e4a", glow: "rgba(27,94,74,0.15)" },
  navy:   { primary: "#1a3a6b", glow: "rgba(26,58,107,0.15)" },
  plum:   { primary: "#6b1f7c", glow: "rgba(107,31,124,0.15)" },
  teal:   { primary: "#00695c", glow: "rgba(0,105,92,0.15)" },
  rust:   { primary: "#a0390f", glow: "rgba(160,57,15,0.15)" },
  slate:  { primary: "#2c3e50", glow: "rgba(44,62,80,0.15)" },
  olive:  { primary: "#4a6741", glow: "rgba(74,103,65,0.15)" },
  rose:   { primary: "#8e1a4a", glow: "rgba(142,26,74,0.15)" },
  indigo: { primary: "#2d3561", glow: "rgba(45,53,97,0.15)" },
  amber:  { primary: "#9a4400", glow: "rgba(154,68,0,0.15)" },
  sage:   { primary: "#3d6b52", glow: "rgba(61,107,82,0.15)" },
  stone:  { primary: "#4a3728", glow: "rgba(74,55,40,0.15)" },
};

/* ═══════════════════════════════════
   COUNTDOWN TIMER HOOK
═══════════════════════════════════ */
function useCountdown(targetHours = 6) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const end = Date.now() + targetHours * 3600 * 1000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHours]);
  return time;
}

/* ═══════════════════════════════════
   ANNOUNCEMENT BAR
═══════════════════════════════════ */
function AnnouncementBar() {
  const msgs = [
    "🎉 Free delivery on orders over M500",
    "✨ 100% authentic products — guaranteed",
    "🔒 Secure payment & encrypted checkout",
    "🎁 Premium gift wrapping available",
    "📦 Easy 7-day returns & exchanges",
    "💎 Lesotho's finest luxury boutique",
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % msgs.length), 3500);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      background: "var(--primary)",
      color: "white",
      height: 36,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: 0.3,
      overflow: "hidden",
      position: "relative",
    }}>
      {msgs.map((m, i) => (
        <span key={i} style={{
          position: "absolute",
          opacity: i === idx ? 1 : 0,
          transform: i === idx ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          whiteSpace: "nowrap",
        }}>{m}</span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════
   HERO BANNER CAROUSEL
═══════════════════════════════════ */
const HERO_SLIDES = [
  {
    tag: "New Collection",
    headline: "Elevate Your\nStyle Game",
    sub: "Premium fashion curated for Lesotho's finest",
    cta: "Shop Fashion",
    ctaLink: "/store?main_cat=beauty",
    bg: "linear-gradient(135deg, #0f3f2f 0%, #1b5e4a 50%, #0d3328 100%)",
    accent: "#c8a75a",
    img: "https://m.media-amazon.com/images/I/71aZHLk28TL._AC_SL500_.jpg",
  },
  {
    tag: "Flash Deals",
    headline: "Up to 60% Off\nTop Brands",
    sub: "Limited time — grab the best deals before they're gone",
    cta: "View Deals",
    ctaLink: "/store?sort=discount",
    bg: "linear-gradient(135deg, #c0392b 0%, #e74c3c 50%, #a93226 100%)",
    accent: "#f5c842",
    img: "https://m.media-amazon.com/images/I/61RyQSOaP9L._AC_SL500_.jpg",
  },
  {
    tag: "Beauty Picks",
    headline: "Glow Up With\nPremium Skincare",
    sub: "Authentic beauty products from world-class brands",
    cta: "Shop Beauty",
    ctaLink: "/store?main_cat=beauty",
    bg: "linear-gradient(135deg, #6b1f7c 0%, #8e44ad 50%, #5b1768 100%)",
    accent: "#f8c8e0",
    img: "https://m.media-amazon.com/images/I/71rJyMDJDML._AC_SL500_.jpg",
  },
];

function HeroBanner({ products }: { products: HP[] }) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [animIn, setAnimIn] = useState(true);
  const featured = products.slice(0, 4);

  const goTo = useCallback((i: number) => {
    setAnimIn(false);
    setTimeout(() => { setSlide(i); setAnimIn(true); }, 300);
  }, []);

  useEffect(() => {
    const id = setInterval(() => goTo((slide + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [slide, goTo]);

  const s = HERO_SLIDES[slide];

  return (
    <div style={{ position: "relative", overflow: "hidden", background: s.bg, transition: "background 0.6s ease" }}>
      {/* Main hero content */}
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "0 clamp(16px,4vw,40px)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 40,
        minHeight: 340,
        alignItems: "center",
      }}>
        {/* Left: Text */}
        <div style={{
          padding: "40px 0",
          opacity: animIn ? 1 : 0,
          transform: animIn ? "none" : "translateX(-20px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}>
          <div style={{
            display: "inline-block",
            background: s.accent,
            color: "#1a1a1a",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            padding: "5px 14px",
            borderRadius: 20,
            marginBottom: 16,
          }}>{s.tag}</div>
          <h1 style={{
            color: "white",
            fontSize: "clamp(28px,5vw,52px)",
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 14,
            letterSpacing: -1,
            whiteSpace: "pre-line",
          }}>{s.headline}</h1>
          <p style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 14,
            marginBottom: 28,
            lineHeight: 1.6,
          }}>{s.sub}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={s.ctaLink} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: s.accent,
              color: "#1a1a1a",
              padding: "13px 28px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "none")}
            >{s.cta} →</Link>
            <Link href="/store" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.15)",
              color: "white",
              padding: "13px 24px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.3)",
            }}>Browse All</Link>
          </div>

          {/* Slide dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 32 }}>
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  height: 4,
                  width: i === slide ? 32 : 12,
                  borderRadius: 2,
                  background: i === slide ? s.accent : "rgba(255,255,255,0.3)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  padding: 0,
                  minHeight: "auto",
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: Featured products mini grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,1fr)",
          gap: 10,
          padding: "20px 0",
          opacity: animIn ? 1 : 0,
          transform: animIn ? "none" : "translateX(20px)",
          transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
        }}>
          {featured.length > 0 ? featured.map((p, i) => (
            <HeroMiniCard key={p.id} p={p} delay={i * 60} onClick={() => router.push(`/store/product/${p.id}`)} />
          )) : Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimbox" style={{ height: 150, borderRadius: 12 }} />
          ))}
        </div>
      </div>

      {/* Decorative bottom wave */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        background: "var(--gray-50)",
        clipPath: "ellipse(55% 100% at 50% 100%)",
      }} />
    </div>
  );
}

function HeroMiniCard({ p, delay, onClick }: { p: HP; delay: number; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.25s, background 0.25s",
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "none")}
    >
      {resolveImg(p.main_image) && !err ? (
        <img
          src={optimizeImg(resolveImg(p.main_image))!}
          alt={p.title}
          onError={() => setErr(true)}
          style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }}
        />
      ) : (
        <div style={{ aspectRatio: "1/1", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
        </div>
      )}
      <div style={{ padding: "10px 10px 12px" }}>
        {disc && disc >= 5 && (
          <span style={{ fontSize: 9, fontWeight: 800, color: "#f5c842", display: "block", marginBottom: 3 }}>-{disc}% OFF</span>
        )}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginTop: 6 }}>{formatCurrency(p.price)}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   CATEGORY NAV GRID
═══════════════════════════════════ */
const NAV_CATS = [
  { icon: "💄", label: "Skincare", href: "/store?category=moisturizer" },
  { icon: "📱", label: "Phones", href: "/store?main_cat=phones" },
  { icon: "💊", label: "Wellness", href: "/store?category=collagen" },
  { icon: "🧴", label: "Body Care", href: "/store?category=body_lotion" },
  { icon: "☀️", label: "Sunscreen", href: "/store?category=sunscreen" },
  { icon: "✨", label: "Serums", href: "/store?category=serum" },
  { icon: "🌿", label: "Natural Oils", href: "/store?category=herbal_oils" },
  { icon: "🎁", label: "Gift Sets", href: "/store?sort=discount" },
  { icon: "👁️", label: "Eye Care", href: "/store?category=eye_mask" },
  { icon: "🧼", label: "Cleansers", href: "/store?category=face_wash" },
  { icon: "💫", label: "Brightening", href: "/store?category=skin_brightening" },
  { icon: "🔋", label: "Anti-Aging", href: "/store?category=anti_wrinkles" },
];

function CategoryNav() {
  return (
    <div style={{ background: "white", borderBottom: "1px solid var(--gray-200)", padding: "16px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 8,
        }}>
          {NAV_CATS.map(cat => (
            <Link
              key={cat.href}
              href={cat.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "12px 8px",
                borderRadius: 10,
                textDecoration: "none",
                transition: "background 0.2s",
                background: "transparent",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--gray-100)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: 22, lineHeight: 1 }}>{cat.icon}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-700)", textAlign: "center", lineHeight: 1.2, letterSpacing: 0.2 }}>{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   FLASH DEALS SECTION
═══════════════════════════════════ */
function FlashDeals({ products }: { products: HP[] }) {
  const countdown = useCountdown(6);
  const rowRef = useRef<HTMLDivElement>(null);
  const flash = products.filter(p => (p.discount_pct ?? 0) >= 10 || (p.compare_price && p.compare_price > p.price * 1.1));
  if (flash.length === 0) return null;
  const router = useRouter();

  const scroll = (dir: "l" | "r") =>
    rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });

  return (
    <div style={{ background: "white", margin: "6px 0", padding: "20px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <h2 style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#c0392b",
                margin: 0,
                letterSpacing: -0.3,
              }}>Flash Deals</h2>
            </div>
            {/* Countdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--gray-600)", fontWeight: 600 }}>Ends in</span>
              {[countdown.h, countdown.m, countdown.s].map((val, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{
                    background: "#c0392b",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "3px 7px",
                    borderRadius: 4,
                    minWidth: 30,
                    textAlign: "center",
                    fontVariantNumeric: "tabular-nums",
                  }}>{String(val).padStart(2, "0")}</span>
                  {i < 2 && <span style={{ color: "#c0392b", fontWeight: 800, fontSize: 13 }}>:</span>}
                </span>
              ))}
            </div>
          </div>
          <Link href="/store?sort=discount" style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#c0392b",
            textDecoration: "none",
            border: "1.5px solid #c0392b",
            padding: "6px 16px",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>See All Deals →</Link>
        </div>

        {/* Scroll row */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => scroll("l")}
            style={{
              position: "absolute",
              left: -16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "white",
              border: "1px solid var(--gray-300)",
              boxShadow: "var(--shadow-card)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "auto",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div ref={rowRef} style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            padding: "4px 2px 8px",
          }}>
            {flash.slice(0, 14).map((p, i) => (
              <FlashCard key={p.id} p={p} delay={i * 40} onClick={() => router.push(`/store/product/${p.id}`)} />
            ))}
          </div>
          <button
            onClick={() => scroll("r")}
            style={{
              position: "absolute",
              right: -16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "white",
              border: "1px solid var(--gray-300)",
              boxShadow: "var(--shadow-card)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "auto",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function FlashCard({ p, delay, onClick }: { p: HP; delay: number; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  const sold = Math.floor(Math.random() * 40 + 10);

  return (
    <div
      onClick={onClick}
      style={{
        width: 165,
        flexShrink: 0,
        scrollSnapAlign: "start",
        background: "white",
        border: "1px solid var(--gray-200)",
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        animationDelay: `${delay}ms`,
        position: "relative",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-elevated)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {/* Discount badge */}
      {disc && disc >= 5 && (
        <div style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 2,
          background: "#c0392b",
          color: "white",
          fontSize: 10,
          fontWeight: 800,
          padding: "2px 7px",
          borderRadius: 4,
        }}>-{disc}%</div>
      )}

      {/* Image */}
      {resolveImg(p.main_image) && !err ? (
        <img
          src={optimizeImg(resolveImg(p.main_image))!}
          alt={p.title}
          onError={() => setErr(true)}
          style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }}
        />
      ) : (
        <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </div>
      )}

      <div style={{ padding: "10px 10px 12px" }}>
        <div style={{ fontSize: 11, color: "var(--gray-700)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 8, minHeight: 30 }}>{p.title}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#c0392b", marginBottom: 2 }}>{formatCurrency(p.price)}</div>
        {p.compare_price && p.compare_price > p.price && (
          <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>
        )}
        {/* Sold progress bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 4, background: "#fde8e8", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${sold}%`, background: "#c0392b", borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 9, color: "#c0392b", fontWeight: 700, marginTop: 3, display: "block" }}>{sold}% claimed</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PROMO BANNERS ROW
═══════════════════════════════════ */
function PromoBanners() {
  const banners = [
    { bg: "linear-gradient(135deg,#0f3f2f,#1b5e4a)", tag: "Beauty", title: "Skincare\nEssentials", sub: "Up to 40% off premium brands", href: "/store?main_cat=beauty", accent: "#c8a75a", emoji: "✨" },
    { bg: "linear-gradient(135deg,#1a3a6b,#2d5a9b)", tag: "Phones", title: "Latest\nSmartphones", sub: "Top brands at best prices", href: "/store?main_cat=phones", accent: "#7eb8ff", emoji: "📱" },
    { bg: "linear-gradient(135deg,#6b1f7c,#9b59b6)", tag: "Wellness", title: "Health &\nWellness", sub: "Natural & organic products", href: "/store?category=collagen", accent: "#f8c8e0", emoji: "💊" },
  ];
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px clamp(16px,4vw,40px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {banners.map((b, i) => (
          <Link key={i} href={b.href} style={{
            background: b.bg,
            borderRadius: 14,
            padding: "28px 24px",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
            position: "relative",
            transition: "transform 0.25s, box-shadow 0.25s",
            boxShadow: "var(--shadow-card)",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-elevated)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "none";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-card)";
            }}
          >
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: b.accent, display: "block", marginBottom: 8 }}>{b.tag}</span>
              <h3 style={{ color: "white", fontSize: 20, fontWeight: 900, lineHeight: 1.15, margin: "0 0 8px", whiteSpace: "pre-line", letterSpacing: -0.5 }}>{b.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "0 0 16px", lineHeight: 1.4 }}>{b.sub}</p>
              <span style={{ background: b.accent, color: "#1a1a1a", fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 6, display: "inline-block" }}>Shop Now →</span>
            </div>
            <div style={{ fontSize: 52, opacity: 0.4, position: "absolute", right: 20, top: "50%", transform: "translateY(-50%) rotate(10deg)" }}>{b.emoji}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   SECTION PRODUCT CARD
═══════════════════════════════════ */
function SectionCard({ p, accentColor, onClick }: { p: HP; accentColor: string; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);

  return (
    <div
      onClick={onClick}
      style={{
        width: 168,
        flexShrink: 0,
        background: "white",
        border: "1px solid var(--gray-200)",
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        scrollSnapAlign: "start",
        position: "relative",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-elevated)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {disc && disc >= 5 && (
        <div style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 2,
          background: accentColor,
          color: "white",
          fontSize: 9,
          fontWeight: 800,
          padding: "2px 7px",
          borderRadius: 4,
        }}>-{disc}%</div>
      )}
      {!p.in_stock && (
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 2,
          background: "rgba(0,0,0,0.55)",
          color: "white",
          fontSize: 9,
          fontWeight: 600,
          padding: "2px 7px",
          borderRadius: 4,
        }}>Sold Out</div>
      )}
      {resolveImg(p.main_image) && !err ? (
        <img
          src={optimizeImg(resolveImg(p.main_image))!}
          alt={p.title}
          onError={() => setErr(true)}
          style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", transition: "transform 0.3s" }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        />
      ) : (
        <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </div>
      )}
      <div style={{ padding: "10px 10px 12px" }}>
        {(p.brand || p.category) && (
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: accentColor, marginBottom: 3 }}>{p.brand ?? p.category}</div>
        )}
        <div style={{ fontSize: 12, color: "var(--gray-700)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 32, marginBottom: 6 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gray-900)" }}>{formatCurrency(p.price)}</div>
            {p.compare_price && p.compare_price > p.price && (
              <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>
            )}
          </div>
          {p.rating && p.rating >= 4 && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#c8a75a" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-700)" }}>{p.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   SECTION ROW
═══════════════════════════════════ */
function SectionRow({ sec, onProductClick }: { sec: Section; onProductClick: (id: string) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th = THEME_MAP[sec.theme] ?? THEME_MAP.forest;
  const href = safeViewAll(sec.view_all);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scroll = (dir: "l" | "r") =>
    rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });

  return (
    <div
      ref={wrapRef}
      style={{
        background: "white",
        margin: "6px 0",
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        transition: "opacity 0.55s ease, transform 0.55s ease",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px clamp(16px,4vw,40px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 36, background: th.primary, borderRadius: 2 }} />
            <div>
              {sec.badge && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "white",
                  background: th.primary,
                  padding: "2px 8px",
                  borderRadius: 4,
                  display: "inline-block",
                  marginBottom: 4,
                }}>{sec.badge}</span>
              )}
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--gray-900)", margin: 0, letterSpacing: -0.3 }}>{sec.title}</h2>
              {sec.subtitle && <p style={{ fontSize: 12, color: "var(--gray-600)", margin: "2px 0 0" }}>{sec.subtitle}</p>}
            </div>
          </div>
          <Link href={href} style={{
            fontSize: 12,
            fontWeight: 700,
            color: th.primary,
            textDecoration: "none",
            border: `1.5px solid ${th.primary}`,
            padding: "6px 16px",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "background 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = th.primary; (e.currentTarget as HTMLAnchorElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = th.primary; }}
          >View All →</Link>
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 1400, margin: "0 auto" }}>
        <button onClick={() => scroll("l")} style={{
          position: "absolute",
          left: "clamp(0px,2vw,20px)",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "white",
          border: "1px solid var(--gray-300)",
          boxShadow: "var(--shadow-card)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "auto",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div ref={rowRef} style={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          padding: "8px clamp(16px,4vw,40px) 20px",
        }}>
          {sec.products.map(p => (
            <SectionCard key={p.id} p={p} accentColor={th.primary} onClick={() => onProductClick(p.id)} />
          ))}
          <Link href={href} style={{
            width: 130,
            flexShrink: 0,
            background: "var(--gray-50)",
            border: `2px dashed ${th.primary}40`,
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            textDecoration: "none",
            padding: "20px 12px",
            scrollSnapAlign: "start",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gray-100)")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gray-50)")}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `2px solid ${th.primary}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: th.primary,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.4 }}>See All<br/>{sec.title}</span>
          </Link>
        </div>

        <button onClick={() => scroll("r")} style={{
          position: "absolute",
          right: "clamp(0px,2vw,20px)",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "white",
          border: "1px solid var(--gray-300)",
          boxShadow: "var(--shadow-card)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "auto",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
}

function SkeletonSection() {
  return (
    <div style={{ background: "white", margin: "6px 0", padding: "20px clamp(16px,4vw,40px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="shimbox" style={{ width: 4, height: 36, borderRadius: 2 }} />
          <div>
            <div className="shimbox" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 6 }} />
            <div className="shimbox" style={{ width: 100, height: 10, borderRadius: 4 }} />
          </div>
        </div>
        <div className="shimbox" style={{ width: 80, height: 30, borderRadius: 20 }} />
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shimbox" style={{ width: 168, height: 250, flexShrink: 0, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   TRUST BAR
═══════════════════════════════════ */
function TrustBar() {
  const items = [
    {
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
      title: "Free Delivery",
      sub: "Orders over M500",
    },
    {
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
      title: "100% Authentic",
      sub: "Verified products",
    },
    {
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 .7-3.6"/></svg>,
      title: "Easy Returns",
      sub: "7-day hassle-free",
    },
    {
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      title: "Secure Payment",
      sub: "Encrypted checkout",
    },
    {
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
      title: "Gift Packaging",
      sub: "Premium wrapping",
    },
  ];
  return (
    <div style={{ background: "white", borderTop: "1px solid var(--gray-200)", borderBottom: "1px solid var(--gray-200)", margin: "6px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0 }}>
          {items.map((item, i) => (
            <div key={item.title} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "18px 16px",
              borderRight: i < items.length - 1 ? "1px solid var(--gray-200)" : "none",
            }}>
              <div style={{ color: "var(--primary)", flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-900)", lineHeight: 1.2 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 2 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   MARQUEE
═══════════════════════════════════ */
function Marquee() {
  const items = [
    "Free Delivery on Orders over M500",
    "100% Authentic Products",
    "Secure & Encrypted Checkout",
    "7-Day Easy Returns",
    "Premium Gift Packaging",
    "Lesotho's Finest Boutique",
    "New Collections Weekly",
    "Exclusive Member Rewards",
  ];
  return (
    <div style={{ background: "var(--primary)", overflow: "hidden", height: 40, display: "flex", alignItems: "center" }}>
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>
      <div style={{
        display: "flex",
        gap: 0,
        whiteSpace: "nowrap",
        animation: "marquee 28s linear infinite",
        willChange: "transform",
      }}>
        {[...items, ...items, ...items, ...items].map((t, i) => (
          <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.8)", padding: "0 28px", display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="5" height="5" viewBox="0 0 10 10" fill="#c8a75a" stroke="none"><polygon points="5 0 6.12 3.38 9.51 3.45 6.97 5.56 7.94 9 5 7.02 2.06 9 3.03 5.56 0.49 3.45 3.88 3.38"/></svg>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   CATEGORY IMAGE GRID (Amazon/Jumia style)
═══════════════════════════════════ */
interface SubCat { key: string; label: string; href: string; image?: string | null; }

function CategoryImageGrid() {
  const [loaded, setLoaded] = useState(false);
  const [beauty, setBeauty] = useState<{ subcategories?: SubCat[] } | null>(null);
  const [phones, setPhones] = useState<{ subcategories?: SubCat[] } | null>(null);

  useEffect(() => {
    Promise.all([
      categoriesApi.getWithImages?.("beauty").catch(() => null),
      categoriesApi.getWithImages?.("phones").catch(() => null),
    ]).then(([b, p]) => {
      if (b) setBeauty(b);
      if (p) setPhones(p);
      setLoaded(true);
    });
  }, []);

  const BEAUTY_SUBS_FALLBACK: SubCat[] = [
    { key: "moisturizer", label: "Moisturiser", href: "/store?category=moisturizer" },
    { key: "sunscreen", label: "Sunscreen", href: "/store?category=sunscreen" },
    { key: "face_wash", label: "Face Wash", href: "/store?category=face_wash" },
    { key: "serum", label: "Serum", href: "/store?category=serum" },
    { key: "body_lotion", label: "Body Lotion", href: "/store?category=body_lotion" },
    { key: "face_mask", label: "Face Mask", href: "/store?category=face_mask" },
    { key: "eye_mask", label: "Eye Mask", href: "/store?category=eye_mask" },
    { key: "anti_acne", label: "Anti-Acne", href: "/store?category=anti_acne" },
    { key: "skin_brightening", label: "Brightening", href: "/store?category=skin_brightening" },
    { key: "collagen", label: "Collagen", href: "/store?category=collagen" },
    { key: "skin_natural_oils", label: "Natural Oils", href: "/store?category=skin_natural_oils" },
    { key: "herbal_oils", label: "Herbal Oils", href: "/store?category=herbal_oils" },
    { key: "anti_wrinkles", label: "Anti-Wrinkle", href: "/store?category=anti_wrinkles" },
    { key: "body_wash", label: "Body Wash", href: "/store?category=body_wash" },
    { key: "exfoliator", label: "Exfoliator", href: "/store?category=exfoliator" },
    { key: "lip_mask", label: "Lip Mask", href: "/store?category=lip_mask" },
  ];

  const PHONE_SUBS_FALLBACK: SubCat[] = [
    { key: "samsung", label: "Samsung", href: "/store?category=samsung" },
    { key: "apple", label: "Apple", href: "/store?category=apple" },
    { key: "xiaomi", label: "Xiaomi", href: "/store?category=xiaomi" },
    { key: "motorola", label: "Motorola", href: "/store?category=motorola" },
    { key: "oneplus", label: "OnePlus", href: "/store?category=oneplus" },
    { key: "google", label: "Google Pixel", href: "/store?category=google" },
    { key: "realme", label: "Realme", href: "/store?category=realme" },
  ];

  const beautySubs = (beauty?.subcategories?.length ? beauty.subcategories : BEAUTY_SUBS_FALLBACK);
  const phoneSubs  = (phones?.subcategories?.length  ? phones.subcategories  : PHONE_SUBS_FALLBACK);

  return (
    <div style={{ background: "var(--gray-50)" }}>
      {/* Beauty */}
      <div style={{ background: "white", margin: "6px 0", padding: "24px 0 20px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "var(--primary)", color: "white", fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", padding: "3px 10px", borderRadius: 20 }}>Beauty</span>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--gray-900)", margin: 0, letterSpacing: -0.3 }}>Beauty &amp; Personal Care</h2>
            </div>
            <Link href="/store?main_cat=beauty" style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View All →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
            {!loaded
              ? Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="shimbox" style={{ height: 110, borderRadius: 10 }} />
                ))
              : beautySubs.slice(0, 16).map(sub => (
                  <Link key={sub.key} href={sub.href} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid var(--gray-200)",
                      transition: "box-shadow 0.2s, transform 0.2s",
                      background: "white",
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                    >
                      {sub.image ? (
                        <img src={optimizeImg(sub.image)!} alt={sub.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
                      ) : (
                        <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                          💄
                        </div>
                      )}
                      <div style={{ padding: "6px 8px 8px", fontSize: 11, fontWeight: 600, color: "var(--gray-800)", textAlign: "center", lineHeight: 1.2 }}>{sub.label}</div>
                    </div>
                  </Link>
                ))
            }
          </div>
        </div>
      </div>

      {/* Phones */}
      <div style={{ background: "#0d1b2a", margin: "6px 0", padding: "24px 0 20px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "#2563eb", color: "white", fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", padding: "3px 10px", borderRadius: 20 }}>Phones</span>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "white", margin: 0, letterSpacing: -0.3 }}>Cell Phones &amp; Accessories</h2>
            </div>
            <Link href="/store?main_cat=phones" style={{ fontSize: 12, fontWeight: 700, color: "#7eb8ff", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View All →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(phoneSubs.length + 1, 8)}, 1fr)`, gap: 10 }}>
            {!loaded
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="shimbox" style={{ height: 120, borderRadius: 10 }} />
                ))
              : [...phoneSubs, { key: "all", label: "All Phones", href: "/store?main_cat=phones", image: null }].map(sub => (
                  <Link key={sub.key} href={sub.href} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.06)",
                      transition: "background 0.2s, transform 0.2s",
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                    >
                      {sub.image ? (
                        <img src={optimizeImg(sub.image)!} alt={sub.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
                      ) : (
                        <div style={{ aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                          📱
                        </div>
                      )}
                      <div style={{ padding: "6px 8px 8px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 1.2 }}>{sub.label}</div>
                    </div>
                  </Link>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   JUST FOR YOU — full grid
═══════════════════════════════════ */
function JustForYou({ products }: { products: HP[] }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const display = showAll ? products : products.slice(0, 20);
  if (products.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      style={{
        background: "white",
        margin: "6px 0",
        padding: "24px 0",
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 36, background: "var(--accent)", borderRadius: 2 }} />
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--gray-900)", margin: 0, letterSpacing: -0.3 }}>Just For You</h2>
              <p style={{ fontSize: 12, color: "var(--gray-600)", margin: "2px 0 0" }}>Curated recommendations for Karabo customers</p>
            </div>
          </div>
          <Link href="/store" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none", border: "1.5px solid var(--accent)", padding: "6px 16px", borderRadius: 20 }}>
            See All →
          </Link>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}>
          {display.map((p, i) => {
            const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price
              ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
            return (
              <JFYCard key={p.id} p={p} disc={disc} delay={Math.min(i, 15) * 40} onClick={() => router.push(`/store/product/${p.id}`)} />
            );
          })}
        </div>

        {!showAll && products.length > 20 && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={() => setShowAll(true)}
              style={{
                background: "var(--primary)",
                color: "white",
                border: "none",
                padding: "13px 36px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "background 0.2s, transform 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-dark)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary)"; (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
            >
              Load More Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function JFYCard({ p, disc, delay, onClick }: { p: HP; disc: number | null; delay: number; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        border: "1px solid var(--gray-200)",
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        position: "relative",
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-elevated)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      {disc && disc >= 5 && (
        <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "#c0392b", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>
      )}
      {!p.in_stock && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.6)", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-600)", background: "white", border: "1px solid var(--gray-300)", padding: "4px 12px", borderRadius: 4 }}>Sold Out</span>
        </div>
      )}
      <button
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 4,
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "white",
          border: "none",
          boxShadow: "var(--shadow-soft)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "auto",
          padding: 0,
        }}
        onClick={e => { e.stopPropagation(); setSaved(!saved); }}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? "#c0392b" : "none"} stroke={saved ? "#c0392b" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      {resolveImg(p.main_image) && !err ? (
        <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
      ) : (
        <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </div>
      )}
      <div style={{ padding: "10px 12px 14px" }}>
        {p.brand && <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: 0.8, marginBottom: 3 }}>{p.brand}</div>}
        <div style={{ fontSize: 12, color: "var(--gray-700)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 34, marginBottom: 8 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gray-900)" }}>{formatCurrency(p.price)}</div>
            {p.compare_price && p.compare_price > p.price && (
              <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>
            )}
          </div>
          {p.rating && p.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#c8a75a" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style={{ fontSize: 10, color: "var(--gray-600)", fontWeight: 600 }}>{p.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   NEWSLETTER
═══════════════════════════════════ */
function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <div style={{
      background: "linear-gradient(135deg,var(--primary) 0%,var(--primary-light) 100%)",
      padding: "56px 0",
      margin: "6px 0",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💌</div>
        <h2 style={{ color: "white", fontSize: 26, fontWeight: 900, margin: "0 0 10px", letterSpacing: -0.5 }}>Stay in the loop</h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Subscribe for exclusive deals, new arrivals, and curated style tips from Karabo&apos;s Store.
        </p>
        {done ? (
          <div style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "16px 28px", color: "white", fontWeight: 600 }}>
            ✅ You&apos;re subscribed! Watch your inbox for exclusive deals.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, maxWidth: 480, margin: "0 auto" }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              style={{
                flex: 1,
                padding: "13px 18px",
                borderRadius: 8,
                border: "none",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={() => { if (email.includes("@")) setDone(true); }}
              style={{
                background: "var(--accent)",
                color: "#1a1a1a",
                border: "none",
                padding: "13px 24px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = "none")}
            >
              Subscribe →
            </button>
          </div>
        )}
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 14 }}>No spam, ever. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();
  const [heroProducts, setHeroProducts] = useState<HP[]>([]);
  const [heroLoad, setHeroLoad] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [secLoad, setSecLoad] = useState(true);
  const [allProducts, setAllProducts] = useState<HP[]>([]);

  // Fetch hero / featured products
  useEffect(() => {
    fetch(`${API}/api/products?limit=24&sort=sales&in_stock=true`)
      .then(r => r.json())
      .then(d => {
        const items: HP[] = d.products ?? d.items ?? d ?? [];
        setHeroProducts(shuffle(items));
      })
      .catch(() => {})
      .finally(() => setHeroLoad(false));
  }, []);

  // Fetch page sections
  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? d ?? []))
      .catch(() => {})
      .finally(() => setSecLoad(false));
  }, []);

  // Fetch "just for you" — all products
  useEffect(() => {
    fetch(`${API}/api/products?limit=40&sort=rating`)
      .then(r => r.json())
      .then(d => setAllProducts(d.products ?? d.items ?? d ?? []))
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: "var(--gray-50)", minHeight: "100vh" }}>
      {/* Announcement bar */}
      <AnnouncementBar />

      {/* Category nav */}
      <CategoryNav />

      {/* Hero banner */}
      <HeroBanner products={heroProducts} />

      {/* Trust bar */}
      <TrustBar />

      {/* Promo banners */}
      <PromoBanners />

      {/* Flash deals */}
      <FlashDeals products={heroProducts} />

      {/* Marquee */}
      <Marquee />

      {/* Category image grids */}
      <CategoryImageGrid />

      {/* Product sections */}
      <div>
        {secLoad ? (
          <><SkeletonSection /><SkeletonSection /><SkeletonSection /></>
        ) : sections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "white", margin: "6px 0" }}>
            <p style={{ fontSize: 18, color: "var(--gray-400)", fontStyle: "italic" }}>Add products to your store — sections will appear automatically.</p>
          </div>
        ) : (
          sections.map(sec => (
            <SectionRow key={sec.key} sec={sec} onProductClick={id => router.push(`/store/product/${id}`)} />
          ))
        )}
      </div>

      {/* Just for You */}
      <JustForYou products={allProducts} />

      {/* Newsletter */}
      <Newsletter />

      {/* Shimmer styles */}
      <style>{`
        .shimbox {
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}