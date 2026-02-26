"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

// ─────────────────────────────────────────────────────────────────
// API BASE
// ─────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─────────────────────────────────────────────────────────────────
// IMAGE HELPERS
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// TYPES — exact shapes from API responses
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/products/random  →  { count, products: HP[] }
 * GET /api/homepage/sections products array also uses this shape
 */
interface HP {
  id: string;
  title: string;
  price: number;
  compare_price?: number | null;
  discount_pct?: number | null;
  brand?: string | null;
  category?: string | null;
  rating?: number | null;
  rating_number?: number | null;
  in_stock: boolean;
  main_image?: string | null;
  sales?: number | null;
}

/**
 * GET /api/homepage/sections  →  { sections: Section[], total_sections }
 */
interface Section {
  key: string;
  title: string;
  subtitle: string;
  badge: string | null;
  theme: string;
  view_all: string;      // e.g. "/store?sort=discount"  or  "/store?q=Hair+Care"
  products: HP[];
}

/**
 * GET /api/categories/departments
 * →  [{ key, title, href, image, subcategories: SubCat[] }]
 *
 * NOTE: backend sends "label" (not "name") for subcategories — see categories_router.py
 */
interface SubCat {
  key: string;
  label: string;     // ← "label" from BEAUTY_SUBCATS / PHONE_SUBCATS tuples
  href: string;
  image: string | null;
}
interface DeptCategory {
  key: string;
  title: string;
  href: string;
  image: string | null;
  subcategories: SubCat[];
}

// ─────────────────────────────────────────────────────────────────
// THEME MAP  (matches homepage_sections.py theme strings)
// ─────────────────────────────────────────────────────────────────
const THEME_MAP: Record<string, { primary: string }> = {
  red:    { primary: "#c0392b" },
  green:  { primary: "#0f3f2f" },
  gold:   { primary: "#b8860b" },
  forest: { primary: "#1b5e4a" },
  navy:   { primary: "#1a3a6b" },
  plum:   { primary: "#6b1f7c" },
  teal:   { primary: "#00695c" },
  rust:   { primary: "#a0390f" },
  slate:  { primary: "#2c3e50" },
  olive:  { primary: "#4a6741" },
  rose:   { primary: "#8e1a4a" },
  indigo: { primary: "#2d3561" },
  amber:  { primary: "#9a4400" },
  sage:   { primary: "#3d6b52" },
  stone:  { primary: "#4a3728" },
};

// ─────────────────────────────────────────────────────────────────
// SAFE VIEW-ALL — converts backend view_all paths to /store URLs
// backend sends e.g. "/store?sort=discount"  or  "/store?q=Hair+Care"
// ─────────────────────────────────────────────────────────────────
function safeViewAll(raw: string): string {
  try {
    const url    = new URL(raw, "http://x");
    const params = new URLSearchParams();
    const q    = url.searchParams.get("q");
    const sort = url.searchParams.get("sort");
    if (q)    params.set("q", q);
    if (sort) params.set("sort", sort);
    return `/store${params.toString() ? "?" + params.toString() : ""}`;
  } catch { return "/store"; }
}

// ─────────────────────────────────────────────────────────────────
// COUNTDOWN TIMER HOOK
// ─────────────────────────────────────────────────────────────────
function useCountdown(targetHours = 6) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const end = Date.now() + targetHours * 3_600_000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      setTime({ h: Math.floor(diff / 3_600_000), m: Math.floor((diff % 3_600_000) / 60_000), s: Math.floor((diff % 60_000) / 1_000) });
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetHours]);
  return time;
}

// ═══════════════════════════════════════════════════════════════
//  SHARED — SCROLL BUTTON
// ═══════════════════════════════════════════════════════════════
function ScrollBtn({ dir, onClick, extraStyle }: { dir: "l" | "r"; onClick: () => void; extraStyle?: React.CSSProperties }) {
  return (
    <button onClick={onClick} aria-label={dir === "l" ? "Scroll left" : "Scroll right"} style={{ position: "absolute", [dir === "l" ? "left" : "right"]: 0, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 36, height: 36, borderRadius: "50%", background: "white", border: "1px solid var(--gray-300)", boxShadow: "var(--shadow-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "auto", ...extraStyle }}>
      {dir === "l"
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      }
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ANNOUNCEMENT BAR
// ═══════════════════════════════════════════════════════════════
function AnnouncementBar() {
  const msgs = ["🎉 Free delivery on orders over M500","✨ 100% authentic products — guaranteed","🔒 Secure payment & encrypted checkout","🎁 Premium gift wrapping available","📦 Easy 7-day returns & exchanges","💎 Lesotho's finest luxury boutique"];
  const [idx, setIdx] = useState(0);
  useEffect(() => { const id = setInterval(() => setIdx(i => (i + 1) % msgs.length), 3_500); return () => clearInterval(id); }, []);
  return (
    <div style={{ background: "var(--primary)", color: "white", height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, overflow: "hidden", position: "relative" }}>
      {msgs.map((m, i) => (
        <span key={i} style={{ position: "absolute", opacity: i === idx ? 1 : 0, transform: i === idx ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.5s ease, transform 0.5s ease", whiteSpace: "nowrap" }}>{m}</span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CATEGORY NAV STRIP
// ═══════════════════════════════════════════════════════════════
const NAV_CATS = [
  { icon: "💄", label: "Skincare",     href: "/store?category=moisturizer" },
  { icon: "📱", label: "Phones",       href: "/store?main_cat=phones" },
  { icon: "💊", label: "Wellness",     href: "/store?category=collagen" },
  { icon: "🧴", label: "Body Care",    href: "/store?category=body_lotion" },
  { icon: "☀️", label: "Sunscreen",   href: "/store?category=sunscreen" },
  { icon: "✨", label: "Serums",       href: "/store?category=serum" },
  { icon: "🌿", label: "Natural Oils", href: "/store?category=herbal_oils" },
  { icon: "🎁", label: "Gift Sets",    href: "/store?sort=discount" },
  { icon: "👁️", label: "Eye Care",    href: "/store?category=eye_mask" },
  { icon: "🧼", label: "Cleansers",   href: "/store?category=face_wash" },
  { icon: "💫", label: "Brightening", href: "/store?category=skin_brightening" },
  { icon: "🔋", label: "Anti-Aging",  href: "/store?category=anti_wrinkles" },
];
function CategoryNav() {
  return (
    <div style={{ background: "white", borderBottom: "1px solid var(--gray-200)", padding: "16px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 8 }}>
          {NAV_CATS.map(c => (
            <Link key={c.href} href={c.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 10, textDecoration: "none", transition: "background 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gray-100)")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")}
            >
              <div style={{ fontSize: 22, lineHeight: 1 }}>{c.icon}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-700)", textAlign: "center", lineHeight: 1.2 }}>{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HERO BANNER — carousel, right pane shows real /api/products/random
// ═══════════════════════════════════════════════════════════════
const HERO_SLIDES = [
  { tag: "New Collection", headline: "Elevate Your\nStyle Game",      sub: "Premium fashion curated for Lesotho's finest",           cta: "Shop Fashion", ctaLink: "/store?main_cat=beauty", bg: "linear-gradient(135deg,#0f3f2f,#1b5e4a,#0d3328)", accent: "#c8a75a" },
  { tag: "Flash Deals",    headline: "Up to 60% Off\nTop Brands",     sub: "Limited time — grab the best deals before they're gone", cta: "View Deals",   ctaLink: "/store?sort=discount",   bg: "linear-gradient(135deg,#c0392b,#e74c3c,#a93226)",  accent: "#f5c842" },
  { tag: "Beauty Picks",   headline: "Glow Up With\nPremium Skincare",sub: "Authentic beauty products from world-class brands",       cta: "Shop Beauty",  ctaLink: "/store?main_cat=beauty", bg: "linear-gradient(135deg,#6b1f7c,#8e44ad,#5b1768)",  accent: "#f8c8e0" },
];

function HeroBanner({ products }: { products: HP[] }) {
  const router = useRouter();
  const [slide, setSlide]   = useState(0);
  const [animIn, setAnimIn] = useState(true);
  const featured = products.slice(0, 4);

  const goTo = useCallback((i: number) => {
    setAnimIn(false);
    setTimeout(() => { setSlide(i); setAnimIn(true); }, 300);
  }, []);
  useEffect(() => {
    const id = setInterval(() => goTo((slide + 1) % HERO_SLIDES.length), 5_000);
    return () => clearInterval(id);
  }, [slide, goTo]);

  const s = HERO_SLIDES[slide];
  return (
    <div style={{ position: "relative", overflow: "hidden", background: s.bg, transition: "background 0.6s ease" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, minHeight: 340, alignItems: "center" }}>
        {/* Text */}
        <div style={{ padding: "40px 0", opacity: animIn ? 1 : 0, transform: animIn ? "none" : "translateX(-20px)", transition: "opacity 0.5s, transform 0.5s" }}>
          <div style={{ display: "inline-block", background: s.accent, color: "#1a1a1a", fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 16 }}>{s.tag}</div>
          <h1 style={{ color: "white", fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 14, letterSpacing: -1, whiteSpace: "pre-line" }}>{s.headline}</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>{s.sub}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={s.ctaLink} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: s.accent, color: "#1a1a1a", padding: "13px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", transition: "transform 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.transform = "none")}
            >{s.cta} →</Link>
            <Link href="/store" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", color: "white", padding: "13px 24px", borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>Browse All</Link>
          </div>
          {/* Dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 32 }}>
            {HERO_SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{ height: 4, width: i === slide ? 32 : 12, borderRadius: 2, background: i === slide ? s.accent : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", transition: "all 0.3s", padding: 0, minHeight: "auto" }} />
            ))}
          </div>
        </div>
        {/* Product mini-grid from /api/products/random */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, padding: "20px 0", opacity: animIn ? 1 : 0, transform: animIn ? "none" : "translateX(20px)", transition: "opacity 0.5s 0.1s, transform 0.5s 0.1s" }}>
          {featured.length > 0
            ? featured.map(p => <HeroMiniCard key={p.id} p={p} onClick={() => router.push(`/store/product/${p.id}`)} />)
            : Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimbox" style={{ height: 150, borderRadius: 12 }} />)
          }
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "var(--gray-50)", clipPath: "ellipse(55% 100% at 50% 100%)" }} />
    </div>
  );
}

function HeroMiniCard({ p, onClick }: { p: HP; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  return (
    <div onClick={onClick} style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "transform 0.25s" }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)")}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.transform = "none")}
    >
      {resolveImg(p.main_image) && !err
        ? <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
        : <div style={{ aspectRatio: "1/1", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛍️</div>
      }
      <div style={{ padding: "10px 10px 12px" }}>
        {disc && disc >= 5 && <span style={{ fontSize: 9, fontWeight: 800, color: "#f5c842", display: "block", marginBottom: 3 }}>-{disc}% OFF</span>}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginTop: 6 }}>{formatCurrency(p.price)}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TRUST BAR
// ═══════════════════════════════════════════════════════════════
function TrustBar() {
  const items = [
    { icon: "🚚", title: "Free Delivery",  sub: "Orders over M500" },
    { icon: "✅", title: "100% Authentic", sub: "Verified products" },
    { icon: "🔄", title: "Easy Returns",   sub: "7-day hassle-free" },
    { icon: "🔒", title: "Secure Payment", sub: "Encrypted checkout" },
    { icon: "🎁", title: "Gift Packaging", sub: "Premium wrapping" },
  ];
  return (
    <div style={{ background: "white", borderTop: "1px solid var(--gray-200)", borderBottom: "1px solid var(--gray-200)", margin: "6px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
          {items.map((item, i) => (
            <div key={item.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 16px", borderRight: i < items.length - 1 ? "1px solid var(--gray-200)" : "none" }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
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

// ═══════════════════════════════════════════════════════════════
//  PROMO BANNERS
// ═══════════════════════════════════════════════════════════════
function PromoBanners() {
  const banners = [
    { bg: "linear-gradient(135deg,#0f3f2f,#1b5e4a)", tag: "Beauty",   title: "Skincare\nEssentials",sub: "Up to 40% off premium brands",href: "/store?main_cat=beauty",accent: "#c8a75a", emoji: "✨" },
    { bg: "linear-gradient(135deg,#1a3a6b,#2d5a9b)", tag: "Phones",   title: "Latest\nSmartphones", sub: "Top brands at best prices",   href: "/store?main_cat=phones",accent: "#7eb8ff", emoji: "📱" },
    { bg: "linear-gradient(135deg,#6b1f7c,#9b59b6)", tag: "Wellness", title: "Health &\nWellness",  sub: "Natural & organic products",  href: "/store?q=wellness",     accent: "#f8c8e0", emoji: "💊" },
  ];
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px clamp(16px,4vw,40px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {banners.map((b, i) => (
          <Link key={i} href={b.href} style={{ background: b.bg, borderRadius: 14, padding: "28px 24px", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden", position: "relative", transition: "transform 0.25s, box-shadow 0.25s", boxShadow: "var(--shadow-card)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-elevated)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-card)"; }}
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

// ═══════════════════════════════════════════════════════════════
//  FLASH DEALS
//  Products come from heroProducts (already fetched from /api/products/random)
//  filtered for discount_pct >= 10 or compare_price > price * 1.1
//  View-All → /store?sort=discount   (sort=discount is valid in products.py)
// ═══════════════════════════════════════════════════════════════
function FlashDeals({ products }: { products: HP[] }) {
  const router    = useRouter();
  const countdown = useCountdown(6);
  const rowRef    = useRef<HTMLDivElement>(null);
  const flash     = products.filter(p => (p.discount_pct ?? 0) >= 10 || (p.compare_price && p.compare_price > p.price * 1.1));
  if (flash.length === 0) return null;
  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });
  return (
    <div style={{ background: "white", margin: "6px 0", padding: "20px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#c0392b", margin: 0, letterSpacing: -0.3 }}>Flash Deals</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--gray-600)", fontWeight: 600 }}>Ends in</span>
              {[countdown.h, countdown.m, countdown.s].map((val, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ background: "#c0392b", color: "white", fontSize: 12, fontWeight: 800, padding: "3px 7px", borderRadius: 4, minWidth: 30, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{String(val).padStart(2, "0")}</span>
                  {i < 2 && <span style={{ color: "#c0392b", fontWeight: 800, fontSize: 13 }}>:</span>}
                </span>
              ))}
            </div>
          </div>
          {/* sort=discount is accepted by GET /api/products */}
          <Link href="/store?sort=discount" style={{ fontSize: 12, fontWeight: 700, color: "#c0392b", textDecoration: "none", border: "1.5px solid #c0392b", padding: "6px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>See All Deals →</Link>
        </div>
        <div style={{ position: "relative" }}>
          <ScrollBtn dir="l" onClick={() => scroll("l")} />
          <div ref={rowRef} style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", padding: "4px 2px 8px" }}>
            {flash.slice(0, 14).map(p => <FlashCard key={p.id} p={p} onClick={() => router.push(`/store/product/${p.id}`)} />)}
          </div>
          <ScrollBtn dir="r" onClick={() => scroll("r")} />
        </div>
      </div>
    </div>
  );
}

function FlashCard({ p, onClick }: { p: HP; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  // stable random sold % per card
  const sold = useRef(Math.floor(Math.random() * 40 + 10)).current;
  return (
    <div onClick={onClick} style={{ width: 165, flexShrink: 0, scrollSnapAlign: "start", background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s", position: "relative" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-elevated)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      {disc && disc >= 5 && <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "#c0392b", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>}
      {resolveImg(p.main_image) && !err
        ? <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
        : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛍️</div>
      }
      <div style={{ padding: "10px 10px 12px" }}>
        <div style={{ fontSize: 11, color: "var(--gray-700)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 8, minHeight: 30 }}>{p.title}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#c0392b", marginBottom: 2 }}>{formatCurrency(p.price)}</div>
        {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
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

// ═══════════════════════════════════════════════════════════════
//  MARQUEE
// ═══════════════════════════════════════════════════════════════
function Marquee() {
  const items = ["Free Delivery on Orders over M500","100% Authentic Products","Secure & Encrypted Checkout","7-Day Easy Returns","Premium Gift Packaging","Lesotho's Finest Boutique","New Collections Weekly","Exclusive Member Rewards"];
  return (
    <div style={{ background: "var(--primary)", overflow: "hidden", height: 40, display: "flex", alignItems: "center" }}>
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", whiteSpace: "nowrap", animation: "marquee 28s linear infinite", willChange: "transform" }}>
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

// ═══════════════════════════════════════════════════════════════
//  CATEGORY IMAGE GRID
//  GET /api/categories/departments
//  Response: [{ key, title, href, image, subcategories: [{key, label, href, image}] }]
//  IMPORTANT: subcategories use "label" field (not "name")
// ═══════════════════════════════════════════════════════════════
function CategoryImageGrid() {
  const [depts, setDepts]   = useState<DeptCategory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/categories/departments`)
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => setDepts(Array.isArray(data) ? (data as DeptCategory[]) : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const beauty = depts.find(d => d.key === "beauty");
  const phones = depts.find(d => d.key === "phones");

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
            <Link href="/store?main_cat=beauty" style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>View All →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 8 }}>
            {!loaded
              ? Array.from({ length: 16 }).map((_, i) => <div key={i} className="shimbox" style={{ height: 110, borderRadius: 10 }} />)
              : (beauty?.subcategories ?? []).slice(0, 16).map(sub => (
                  <Link key={sub.key} href={sub.href} style={{ textDecoration: "none" }}>
                    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--gray-200)", transition: "box-shadow 0.2s, transform 0.2s", background: "white" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                    >
                      {sub.image
                        ? <img src={optimizeImg(resolveImg(sub.image))!} alt={sub.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
                        : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>💄</div>
                      }
                      {/* "label" field — matches backend BEAUTY_SUBCATS tuples */}
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
            <Link href="/store?main_cat=phones" style={{ fontSize: 12, fontWeight: 700, color: "#7eb8ff", textDecoration: "none" }}>View All →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min((phones?.subcategories?.length ?? 0) + 1, 8)},1fr)`, gap: 10 }}>
            {!loaded
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimbox" style={{ height: 120, borderRadius: 10 }} />)
              : [...(phones?.subcategories ?? []), { key: "__all", label: "All Phones", href: "/store?main_cat=phones", image: null } as SubCat].map(sub => (
                  <Link key={sub.key} href={sub.href} style={{ textDecoration: "none" }}>
                    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", transition: "background 0.2s, transform 0.2s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                    >
                      {sub.image
                        ? <img src={optimizeImg(resolveImg(sub.image))!} alt={sub.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
                        : <div style={{ aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📱</div>
                      }
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

// ═══════════════════════════════════════════════════════════════
//  SECTION CARD
// ═══════════════════════════════════════════════════════════════
function SectionCard({ p, accentColor, onClick }: { p: HP; accentColor: string; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  return (
    <div onClick={onClick} style={{ width: 168, flexShrink: 0, background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s", scrollSnapAlign: "start", position: "relative" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-elevated)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      {disc && disc >= 5 && <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: accentColor, color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>}
      {!p.in_stock && <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, background: "rgba(0,0,0,0.55)", color: "white", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>Sold Out</div>}
      {resolveImg(p.main_image) && !err
        ? <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", transition: "transform 0.3s" }} onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")} onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
        : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛍️</div>
      }
      <div style={{ padding: "10px 10px 12px" }}>
        {(p.brand || p.category) && <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: accentColor, marginBottom: 3 }}>{p.brand ?? p.category}</div>}
        <div style={{ fontSize: 12, color: "var(--gray-700)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 32, marginBottom: 6 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gray-900)" }}>{formatCurrency(p.price)}</div>
            {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
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

// ═══════════════════════════════════════════════════════════════
//  SECTION ROW  — renders one Section from /api/homepage/sections
//  view_all from backend is already a valid /store?… path
// ═══════════════════════════════════════════════════════════════
function SectionRow({ sec, onProductClick }: { sec: Section; onProductClick: (id: string) => void }) {
  const rowRef  = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th   = THEME_MAP[sec.theme] ?? THEME_MAP.forest;
  const href = safeViewAll(sec.view_all);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });

  return (
    <div ref={wrapRef} style={{ background: "white", margin: "6px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.55s ease, transform 0.55s ease" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px clamp(16px,4vw,40px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 36, background: th.primary, borderRadius: 2 }} />
            <div>
              {sec.badge && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "white", background: th.primary, padding: "2px 8px", borderRadius: 4, display: "inline-block", marginBottom: 4 }}>{sec.badge}</span>}
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--gray-900)", margin: 0, letterSpacing: -0.3 }}>{sec.title}</h2>
              {sec.subtitle && <p style={{ fontSize: 12, color: "var(--gray-600)", margin: "2px 0 0" }}>{sec.subtitle}</p>}
            </div>
          </div>
          <Link href={href} style={{ fontSize: 12, fontWeight: 700, color: th.primary, textDecoration: "none", border: `1.5px solid ${th.primary}`, padding: "6px 16px", borderRadius: 20, transition: "background 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = th.primary; (e.currentTarget as HTMLAnchorElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = th.primary; }}
          >View All →</Link>
        </div>
      </div>
      <div style={{ position: "relative", maxWidth: 1400, margin: "0 auto" }}>
        <ScrollBtn dir="l" onClick={() => scroll("l")} extraStyle={{ left: "clamp(0px,2vw,20px)" }} />
        <div ref={rowRef} style={{ display: "flex", gap: 2, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", padding: "8px clamp(16px,4vw,40px) 20px" }}>
          {sec.products.map(p => <SectionCard key={p.id} p={p} accentColor={th.primary} onClick={() => onProductClick(p.id)} />)}
          <Link href={href} style={{ width: 130, flexShrink: 0, background: "var(--gray-50)", border: `2px dashed ${th.primary}40`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textDecoration: "none", padding: "20px 12px", scrollSnapAlign: "start", transition: "background 0.2s" }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gray-100)")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gray-50)")}
          >
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${th.primary}`, display: "flex", alignItems: "center", justifyContent: "center", color: th.primary }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.4 }}>See All<br/>{sec.title}</span>
          </Link>
        </div>
        <ScrollBtn dir="r" onClick={() => scroll("r")} extraStyle={{ right: "clamp(0px,2vw,20px)" }} />
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
          <div><div className="shimbox" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 6 }} /><div className="shimbox" style={{ width: 100, height: 10, borderRadius: 4 }} /></div>
        </div>
        <div className="shimbox" style={{ width: 80, height: 30, borderRadius: 20 }} />
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimbox" style={{ width: 168, height: 250, flexShrink: 0, borderRadius: 10 }} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  JUST FOR YOU
//  GET /api/products/random?count=40&with_images=true
//  Response: { count: number, products: HP[] }
// ═══════════════════════════════════════════════════════════════
function JustForYou({ products }: { products: HP[] }) {
  const router  = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (products.length === 0) return null;
  const display = showAll ? products : products.slice(0, 20);

  return (
    <div ref={wrapRef} style={{ background: "white", margin: "6px 0", padding: "24px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 36, background: "var(--accent)", borderRadius: 2 }} />
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--gray-900)", margin: 0, letterSpacing: -0.3 }}>Just For You</h2>
              <p style={{ fontSize: 12, color: "var(--gray-600)", margin: "2px 0 0" }}>Curated recommendations for Karabo customers</p>
            </div>
          </div>
          <Link href="/store" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none", border: "1.5px solid var(--accent)", padding: "6px 16px", borderRadius: 20 }}>See All →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
          {display.map((p, i) => {
            const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
            return <JFYCard key={p.id} p={p} disc={disc} delay={Math.min(i, 15) * 40} onClick={() => router.push(`/store/product/${p.id}`)} />;
          })}
        </div>
        {!showAll && products.length > 20 && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button onClick={() => setShowAll(true)} style={{ background: "var(--primary)", color: "white", border: "none", padding: "13px 36px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary-dark)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary)")}
            >Load More Products</button>
          </div>
        )}
      </div>
    </div>
  );
}

function JFYCard({ p, disc, delay, onClick }: { p: HP; disc: number | null; delay: number; onClick: () => void }) {
  const [err, setErr]     = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div onClick={onClick} style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s", position: "relative", animationDelay: `${delay}ms` }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-elevated)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      {disc && disc >= 5 && <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "#c0392b", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>}
      {!p.in_stock && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.6)", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-600)", background: "white", border: "1px solid var(--gray-300)", padding: "4px 12px", borderRadius: 4 }}>Sold Out</span>
        </div>
      )}
      <button style={{ position: "absolute", top: 8, right: 8, zIndex: 4, width: 30, height: 30, borderRadius: "50%", background: "white", border: "none", boxShadow: "var(--shadow-soft)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "auto", padding: 0 }}
        onClick={e => { e.stopPropagation(); setSaved(!saved); }} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? "#c0392b" : "none"} stroke={saved ? "#c0392b" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
      {resolveImg(p.main_image) && !err
        ? <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} onError={() => setErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} loading="lazy" />
        : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛍️</div>
      }
      <div style={{ padding: "10px 12px 14px" }}>
        {p.brand && <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: 0.8, marginBottom: 3 }}>{p.brand}</div>}
        <div style={{ fontSize: 12, color: "var(--gray-700)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 34, marginBottom: 8 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gray-900)" }}>{formatCurrency(p.price)}</div>
            {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
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

// ═══════════════════════════════════════════════════════════════
//  NEWSLETTER
// ═══════════════════════════════════════════════════════════════
function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone]   = useState(false);
  return (
    <div style={{ background: "linear-gradient(135deg,var(--primary),var(--primary-light))", padding: "56px 0", margin: "6px 0" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💌</div>
        <h2 style={{ color: "white", fontSize: 26, fontWeight: 900, margin: "0 0 10px", letterSpacing: -0.5 }}>Stay in the loop</h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Subscribe for exclusive deals, new arrivals, and curated style tips from Karabo&apos;s Store.</p>
        {done ? (
          <div style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "16px 28px", color: "white", fontWeight: 600 }}>✅ You&apos;re subscribed! Watch your inbox for exclusive deals.</div>
        ) : (
          <div style={{ display: "flex", gap: 10, maxWidth: 480, margin: "0 auto" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" style={{ flex: 1, padding: "13px 18px", borderRadius: 8, border: "none", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <button onClick={() => { if (email.includes("@")) setDone(true); }} style={{ background: "var(--accent)", color: "#1a1a1a", border: "none", padding: "13px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "transform 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = "none")}
            >Subscribe →</button>
          </div>
        )}
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 14 }}>No spam, ever. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function HomePage() {
  const router = useRouter();

  /**
   * FETCH 1 — Hero products
   * GET /api/products/random?count=20&with_images=true&diverse=true
   * Response shape: { count: number, products: HP[] }
   */
  const [heroProducts, setHeroProducts] = useState<HP[]>([]);
  const [heroLoad, setHeroLoad]         = useState(true);

  /**
   * FETCH 2 — Homepage sections
   * GET /api/homepage/sections
   * Response shape: { sections: Section[], total_sections: number }
   */
  const [sections, setSections] = useState<Section[]>([]);
  const [secLoad, setSecLoad]   = useState(true);

  /**
   * FETCH 3 — Just For You
   * GET /api/products/random?count=40&with_images=true
   * Response shape: { count: number, products: HP[] }
   */
  const [jfyProducts, setJfyProducts] = useState<HP[]>([]);

  useEffect(() => {
    fetch(`${API}/api/products/random?count=20&with_images=true&diverse=true`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then((d: { products?: HP[] }) => setHeroProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setHeroLoad(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.ok ? r.json() : { sections: [] })
      .then((d: { sections?: Section[] }) => setSections(d.sections ?? []))
      .catch(() => {})
      .finally(() => setSecLoad(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/products/random?count=40&with_images=true`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then((d: { products?: HP[] }) => setJfyProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: "var(--gray-50)", minHeight: "100vh" }}>
      <style>{`
        .shimbox{background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      <AnnouncementBar />
      <CategoryNav />
      <HeroBanner products={heroLoad ? [] : heroProducts} />
      <TrustBar />
      <PromoBanners />

      {/* Flash Deals — filtered subset of heroProducts */}
      <FlashDeals products={heroProducts} />
      <Marquee />

      {/* Category images — GET /api/categories/departments */}
      <CategoryImageGrid />

      {/* Section rows — GET /api/homepage/sections */}
      {secLoad ? (
        <><SkeletonSection /><SkeletonSection /><SkeletonSection /></>
      ) : sections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "white", margin: "6px 0" }}>
          <p style={{ fontSize: 18, color: "var(--gray-400)", fontStyle: "italic" }}>Add products to your store — sections will appear automatically.</p>
        </div>
      ) : (
        sections.map(sec => <SectionRow key={sec.key} sec={sec} onProductClick={id => router.push(`/store/product/${id}`)} />)
      )}

      {/* Just For You — GET /api/products/random */}
      <JustForYou products={jfyProducts} />
      <Newsletter />
    </div>
  );
}