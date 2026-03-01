"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/* ─────────────────────────────────────────────────
   IMAGE HELPERS
───────────────────────────────────────────────── */
function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
}
function optimizeImg(url: string | null | undefined, size: 300 | 500 | 1500 = 300): string | null {
  if (!url) return null;
  if (!url.includes("m.media-amazon.com")) return url;
  return url.replace(/_AC_S[LY]\d+_/g, `_AC_SL${size}_`).replace(/_SL\d+_/g, `_AC_SL${size}_`);
}

/* ─────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────── */
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
  images?: string[] | null;
  sales?: number | null;
}

interface Section {
  key: string;
  title: string;
  subtitle: string;
  badge: string | null;
  theme: string;
  view_all: string;
  products: HP[];
}

interface DeptSubCat {
  key: string;
  label: string;
  href: string;
  image: string | null;
}
interface DeptCategory {
  key: string;
  title: string;
  href: string;
  image: string | null;
  subcategories: DeptSubCat[];
}

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  product_count: number;
}

/* ─────────────────────────────────────────────────
   THEME MAP
───────────────────────────────────────────────── */
const THEME_MAP: Record<string, { primary: string; light: string }> = {
  red:    { primary: "#c0392b", light: "#fdecea" },
  green:  { primary: "#0f3f2f", light: "#e6f2ee" },
  gold:   { primary: "#b8860b", light: "#fef9e7" },
  forest: { primary: "#1b5e4a", light: "#e8f5f0" },
  navy:   { primary: "#1a3a6b", light: "#e8eef8" },
  plum:   { primary: "#6b1f7c", light: "#f5e8f8" },
  teal:   { primary: "#00695c", light: "#e0f2f1" },
  rust:   { primary: "#a0390f", light: "#fbe9e4" },
  slate:  { primary: "#2c3e50", light: "#eaecee" },
  rose:   { primary: "#8e1a4a", light: "#f8e8ef" },
  indigo: { primary: "#2d3561", light: "#e8e9f5" },
  amber:  { primary: "#9a4400", light: "#fef0e6" },
};

function safeViewAll(raw: string): string {
  try {
    const url = new URL(raw, "http://x");
    const params = new URLSearchParams();
    for (const key of ["q", "sort", "category", "brand", "main_cat", "main_category", "tag",
                        "min_price", "max_price", "in_stock", "min_rating"]) {
      const val = url.searchParams.get(key);
      if (val) params.set(key, val);
    }
    return `/store${params.toString() ? "?" + params.toString() : ""}`;
  } catch { return "/store"; }
}

/* ─────────────────────────────────────────────────
   COUNTDOWN HOOK
───────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────
   ROTATING INDEX HOOK
───────────────────────────────────────────────── */
function useRotatingIndex(total: number, intervalMs: number, offset = 0): number {
  const [idx, setIdx] = useState(offset % Math.max(total, 1));
  useEffect(() => {
    if (total < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % total), intervalMs);
    return () => clearInterval(id);
  }, [total, intervalMs]);
  return idx;
}

/* ─────────────────────────────────────────────────
   SCROLL BUTTON
───────────────────────────────────────────────── */
function ScrollBtn({ dir, onClick, style: extraStyle }: { dir: "l" | "r"; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "l" ? "Scroll left" : "Scroll right"}
      style={{
        position: "absolute",
        [dir === "l" ? "left" : "right"]: -4,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "white",
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        color: "#0f3f2f",
        fontWeight: 700,
        minHeight: "auto",
        transition: "box-shadow 0.2s, background 0.2s",
        ...extraStyle,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf4"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.18)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "white"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.14)"; }}
    >
      {dir === "l" ? "‹" : "›"}
    </button>
  );
}

/* ─────────────────────────────────────────────────
   PRODUCT IMAGE with crossfade
───────────────────────────────────────────────── */
function ProductImg({ src, alt, size = 300, style: extraStyle }: { src: string | null; alt: string; size?: 300 | 500; style?: React.CSSProperties }) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const resolved = resolveImg(src);
  const optimized = optimizeImg(resolved, size);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#f1f5f9", ...extraStyle }}>
      {optimized && (
        <img
          src={optimized}
          alt={alt}
          loading="lazy"
          onLoad={() => { setLoaded(true); setVisible(true); }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        />
      )}
      {!loaded && (
        <div className="shimbox" style={{ position: "absolute", inset: 0 }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANNOUNCEMENT BAR
═══════════════════════════════════════════════════════════════ */
function AnnouncementBar() {
  const msgs = [
    "Free delivery on orders over M500  —  Shop Now",
    "100% authentic products guaranteed",
    "Secure payment & encrypted checkout",
    "Premium gift wrapping available",
    "Easy 7-day returns & exchanges",
    "Lesotho's premier beauty boutique",
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => { const id = setInterval(() => setIdx(i => (i + 1) % msgs.length), 3_500); return () => clearInterval(id); }, []);
  return (
    <div style={{ background: "#0a2518", height: 38, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
      {msgs.map((m, i) => (
        <span key={i} style={{
          position: "absolute",
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: 0.3,
          opacity: i === idx ? 1 : 0,
          transform: i === idx ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#c8a75a", display: "inline-block", flexShrink: 0 }} />
          {m}
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#c8a75a", display: "inline-block", flexShrink: 0 }} />
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CATEGORY NAV — real product images fetched from backend
═══════════════════════════════════════════════════════════════ */
const NAV_CATS = [
  { label: "Anti-Aging",          tag: "anti_aging" },
  { label: "Acne",                tag: "acne" },
  { label: "Brightening",         tag: "brightening" },
  { label: "Whitening",           tag: "whitening" },
  { label: "Hydration",           tag: "hydration" },
  { label: "Repair",              tag: "repair" },
  { label: "Barrier",             tag: "barrier" },
  { label: "Eczema",              tag: "eczema" },
  { label: "Sunscreen",           tag: "sunscreen" },
  { label: "Oils",                tag: "oils" },
  { label: "Soaps",               tag: "soaps" },
  { label: "Masks",               tag: "masks" },
  { label: "Exfoliation",         tag: "exfoliation" },
  { label: "Clinical Acids",      tag: "clinical_acids" },
  { label: "African Picks",       tag: "african_ingredients" },
  { label: "K-Beauty",            tag: "korean_ingredients" },
];

function CategoryNav({ categoryImages }: { categoryImages: Record<string, string | null> }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 600 : -600, behavior: "smooth" });

  return (
    <div style={{ background: "white", borderBottom: "1px solid #e8ecef", padding: "10px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(12px,3vw,40px)", position: "relative" }}>
        <ScrollBtn dir="l" onClick={() => scroll("l")} style={{ left: -2, width: 32, height: 32, fontSize: 14 }} />
        <div ref={rowRef} style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none", padding: "2px 20px" }}>
          {NAV_CATS.map(c => {
            const img = categoryImages[c.tag];
            return (
              <Link
                key={c.tag}
                href={`/store?tag=${c.tag}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 10, textDecoration: "none", flexShrink: 0, transition: "background 0.2s, transform 0.2s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "#f0fdf4"; el.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.transform = "none"; }}
              >
                <div style={{ width: 60, height: 60, borderRadius: 14, overflow: "hidden", border: "2px solid #e2ece8", flexShrink: 0, background: "#f1f5f9" }}>
                  {img ? (
                    <img src={optimizeImg(resolveImg(img), 300)!} alt={c.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.12)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                    />
                  ) : (
                    <div className="shimbox" style={{ width: "100%", height: "100%" }} />
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#374151", textAlign: "center", lineHeight: 1.25, whiteSpace: "nowrap", letterSpacing: 0.1 }}>{c.label}</span>
              </Link>
            );
          })}
        </div>
        <ScrollBtn dir="r" onClick={() => scroll("r")} style={{ right: -2, width: 32, height: 32, fontSize: 14 }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO BANNER — real product photos from backend
═══════════════════════════════════════════════════════════════ */
const HERO_SLIDES = [
  {
    tag: "Hydration & Repair",
    headline: "Glow Up With\nHydrated Skin",
    sub: "Shop hydration, barrier & repair products — delivered to Lesotho",
    cta: "Shop Hydration",
    ctaLink: "/store?tag=hydration",
    bg: "linear-gradient(135deg, #061a12 0%, #0a2a1f 50%, #1b5e4a 100%)",
    accent: "#c8a75a",
    filterTag: "hydration",
  },
  {
    tag: "Flash Deals",
    headline: "Up to 60% Off\nTop Beauty Brands",
    sub: "Limited time — brightening, anti-aging & more on sale now",
    cta: "View All Deals",
    ctaLink: "/store?sort=discount",
    bg: "linear-gradient(135deg, #5f0a0a, #8b1a1a, #c0392b)",
    accent: "#fde68a",
    filterTag: "",
  },
  {
    tag: "African × Korean",
    headline: "The Best of\nBoth Worlds",
    sub: "African botanicals meets K-beauty innovation — exclusively curated",
    cta: "Explore Now",
    ctaLink: "/store?tag=african_ingredients",
    bg: "linear-gradient(135deg, #2d1b69, #5b21b6, #7c3aed)",
    accent: "#fce7f3",
    filterTag: "african_ingredients",
  },
];

function HeroBanner({ products }: { products: HP[] }) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [animIn, setAnimIn] = useState(true);

  const slot0 = useRotatingIndex(products.length, 2600, 0);
  const slot1 = useRotatingIndex(products.length, 3200, 5);
  const slot2 = useRotatingIndex(products.length, 2900, 10);
  const slot3 = useRotatingIndex(products.length, 3500, 15);
  const slots = [slot0, slot1, slot2, slot3];

  const goTo = useCallback((i: number) => {
    setAnimIn(false);
    setTimeout(() => { setSlide(i); setAnimIn(true); }, 280);
  }, []);

  useEffect(() => {
    const id = setInterval(() => goTo((slide + 1) % HERO_SLIDES.length), 6_000);
    return () => clearInterval(id);
  }, [slide, goTo]);

  const s = HERO_SLIDES[slide];

  return (
    <div style={{ position: "relative", overflow: "hidden", background: s.bg, transition: "background 0.8s ease" }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: `${s.accent}12`, filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: 60, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(40px)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,48px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, minHeight: 380, alignItems: "center", position: "relative", zIndex: 1 }}>
        {/* Left: Text */}
        <div style={{ padding: "48px 0", opacity: animIn ? 1 : 0, transform: animIn ? "none" : "translateX(-20px)", transition: "opacity 0.45s ease, transform 0.45s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: `1px solid ${s.accent}40`, color: s.accent, fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 22 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.accent, display: "inline-block" }} />
            {s.tag}
          </div>
          <h1 style={{ color: "white", fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, lineHeight: 1.07, marginBottom: 18, letterSpacing: -1.5, whiteSpace: "pre-line" }}>{s.headline}</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 34, lineHeight: 1.75, maxWidth: 380 }}>{s.sub}</p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href={s.ctaLink} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: s.accent, color: "#1a1a1a", padding: "14px 32px", borderRadius: 9, fontWeight: 800, fontSize: 14, textDecoration: "none", letterSpacing: 0.2, boxShadow: `0 6px 24px ${s.accent}40`, transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = `0 10px 32px ${s.accent}55`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = `0 6px 24px ${s.accent}40`; }}
            >{s.cta} →</Link>
            <Link href="/store" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", color: "white", padding: "14px 26px", borderRadius: 9, fontWeight: 600, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(8px)", transition: "background 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.18)")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)")}
            >Browse All</Link>
          </div>
          {/* Slide indicators */}
          <div style={{ display: "flex", gap: 8, marginTop: 38 }}>
            {HERO_SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{ height: 4, width: i === slide ? 40 : 14, borderRadius: 2, background: i === slide ? s.accent : "rgba(255,255,255,0.28)", border: "none", cursor: "pointer", transition: "all 0.35s ease", padding: 0, minHeight: "auto" }} />
            ))}
          </div>
        </div>

        {/* Right: 2×2 product grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "32px 0" }}>
          {slots.map((pidx, i) => {
            const p = products[pidx];
            return p ? (
              <div
                key={`slot-${i}-${p.id}`}
                onClick={() => router.push(`/store/product/${p.id}`)}
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "transform 0.25s, box-shadow 0.25s", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", position: "relative" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-4px) scale(1.02)"; el.style.boxShadow = "0 12px 32px rgba(0,0,0,0.35)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "none"; el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)"; }}
              >
                {p.discount_pct && p.discount_pct >= 5 && (
                  <div style={{ position: "absolute", top: 8, left: 8, zIndex: 3, background: "#c0392b", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{p.discount_pct}%</div>
                )}
                <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden" }}>
                  <HeroProductImg p={p} />
                </div>
                <div style={{ padding: "10px 11px 13px" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 5 }}>{p.title}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{formatCurrency(p.price)}</div>
                </div>
              </div>
            ) : (
              <div key={i} className="shimbox" style={{ height: 160, borderRadius: 16, opacity: 0.4 }} />
            );
          })}
        </div>
      </div>

      {/* Bottom wave */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "#f8fafc", clipPath: "ellipse(55% 100% at 50% 100%)" }} />
    </div>
  );
}

function HeroProductImg({ p }: { p: HP }) {
  const [visible, setVisible] = useState(false);
  const [cur, setCur] = useState(p);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => { setCur(p); setVisible(true); }, 300);
    return () => clearTimeout(t);
  }, [p.id]);
  const src = resolveImg(cur.main_image);
  return src ? (
    <img src={optimizeImg(src, 300)!} alt={cur.title}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(1.04)", transition: "opacity 0.3s ease, transform 0.3s ease" }}
      onLoad={() => setVisible(true)}
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  ) : <div className="shimbox" style={{ position: "absolute", inset: 0 }} />;
}

/* ═══════════════════════════════════════════════════════════════
   TRUST BAR
═══════════════════════════════════════════════════════════════ */
function TrustBar() {
  const items = [
    { img: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?fm=jpg&q=80&w=80&h=80&fit=crop", title: "Free Delivery", sub: "Orders over M500" },
    { img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?fm=jpg&q=80&w=80&h=80&fit=crop", title: "100% Authentic", sub: "Verified products" },
    { img: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?fm=jpg&q=80&w=80&h=80&fit=crop", title: "Easy Returns", sub: "7-day hassle-free" },
    { img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?fm=jpg&q=80&w=80&h=80&fit=crop", title: "Secure Payment", sub: "Encrypted checkout" },
    { img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?fm=jpg&q=80&w=80&h=80&fit=crop", title: "Gift Packaging", sub: "Premium wrapping" },
  ];
  return (
    <div style={{ background: "white", borderTop: "1px solid #eef0f3", borderBottom: "1px solid #eef0f3", margin: "0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
          {items.map((item, i) => (
            <div key={item.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 16px", borderRight: i < items.length - 1 ? "1px solid #eef0f3" : "none", transition: "background 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = "#f9fafb")}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "white")}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#f1f5f9" }}>
                <img src={item.img} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.2 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOP BRANDS — real product images from backend per brand
═══════════════════════════════════════════════════════════════ */
function TopBrands({ brands, brandImages }: { brands: BrandItem[]; brandImages: Record<string, string | null> }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });
  const topBrands = brands.filter(b => b.product_count > 0).slice(0, 16);
  if (topBrands.length === 0) return null;

  return (
    <div style={{ background: "white", margin: "6px 0", padding: "22px 0 16px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <SectionHeader title="Top Brands" subtitle="Official brand selections" accentColor="#0f3f2f" viewAllHref="/store" viewAllLabel="All Brands" />
        <div style={{ position: "relative" }}>
          <ScrollBtn dir="l" onClick={() => scroll("l")} />
          <div ref={rowRef} style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "4px 2px 10px" }}>
            {topBrands.map(b => {
              const img = brandImages[b.slug ?? b.name?.toLowerCase()] ?? brandImages[b.name?.toLowerCase()];
              return (
                <Link key={b.id} href={`/store?brand=${encodeURIComponent(b.name)}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                  <div style={{ width: 130, border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "white", transition: "box-shadow 0.22s, transform 0.22s, border-color 0.22s" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "#0f3f2f"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; el.style.borderColor = "#e5e7eb"; }}
                  >
                    <div style={{ height: 90, overflow: "hidden", background: "#f8fafc", position: "relative" }}>
                      {img ? (
                        <img src={optimizeImg(resolveImg(img), 300)!} alt={b.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div className="shimbox" style={{ width: "100%", height: "100%" }} />
                      )}
                    </div>
                    <div style={{ padding: "9px 10px 11px", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{b.product_count} products</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <ScrollBtn dir="r" onClick={() => scroll("r")} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROMO BANNERS — 3-column with real product images as backgrounds
═══════════════════════════════════════════════════════════════ */
function PromoBanners({ featuredProducts }: { featuredProducts: HP[] }) {
  const byTag = (tag: string) => featuredProducts.find(p => p.category === tag || (p.main_image && tag));
  const banners = [
    {
      product: featuredProducts[0],
      gradient: "linear-gradient(100deg, rgba(6,78,59,0.97) 0%, rgba(6,78,59,0.9) 55%, rgba(6,78,59,0.25) 80%, transparent 100%)",
      tag: "Hydration", title: "Deep Hydration\nEssentials", sub: "Moisturisers, serums & barriers for all skin types",
      href: "/store?tag=hydration", accent: "#c8a75a",
    },
    {
      product: featuredProducts[1],
      gradient: "linear-gradient(100deg, rgba(140,60,0,0.97) 0%, rgba(140,60,0,0.9) 55%, rgba(140,60,0,0.25) 80%, transparent 100%)",
      tag: "Sun Care", title: "SPF Every\nSingle Day", sub: "Body & face sunscreens from trusted brands",
      href: "/store?tag=sunscreen", accent: "#fde68a",
    },
    {
      product: featuredProducts[2],
      gradient: "linear-gradient(100deg, rgba(60,10,130,0.97) 0%, rgba(60,10,130,0.9) 55%, rgba(60,10,130,0.25) 80%, transparent 100%)",
      tag: "African Ingredients", title: "Rooted in\nAfrica", sub: "Shea, marula, baobab & more — proudly African",
      href: "/store?tag=african_ingredients", accent: "#e9d5ff",
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "14px clamp(16px,4vw,40px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {banners.map((b, i) => {
          const imgSrc = b.product ? resolveImg(b.product.main_image) : null;
          return (
            <Link key={i} href={b.href} style={{ borderRadius: 18, textDecoration: "none", overflow: "hidden", position: "relative", height: 190, display: "block", boxShadow: "0 4px 18px rgba(0,0,0,0.14)", transition: "transform 0.28s cubic-bezier(.22,.9,.34,1), box-shadow 0.28s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-5px)"; el.style.boxShadow = "0 14px 40px rgba(0,0,0,0.24)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = "0 4px 18px rgba(0,0,0,0.14)"; }}
            >
              {imgSrc ? (
                <img src={optimizeImg(imgSrc, 500)!} alt={b.tag} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center right", transition: "transform 0.5s ease" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                />
              ) : <div style={{ position: "absolute", inset: 0, background: "#1a1a2e" }} />}
              <div style={{ position: "absolute", inset: 0, background: b.gradient, zIndex: 1 }} />
              <div style={{ position: "relative", zIndex: 2, padding: "26px 28px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: b.accent, display: "block", marginBottom: 8 }}>{b.tag}</span>
                <h3 style={{ color: "white", fontSize: 22, fontWeight: 900, lineHeight: 1.1, margin: "0 0 10px", whiteSpace: "pre-line", letterSpacing: -0.5, textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>{b.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11.5, margin: "0 0 18px", lineHeight: 1.5 }}>{b.sub}</p>
                <span style={{ background: b.accent, color: "#1a1a1a", fontSize: 11, fontWeight: 800, padding: "8px 18px", borderRadius: 7, display: "inline-block", width: "fit-content" }}>Shop Now →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FLASH DEALS
═══════════════════════════════════════════════════════════════ */
function FlashDeals({ products }: { products: HP[] }) {
  const router = useRouter();
  const countdown = useCountdown(6);
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });

  const flash = products.filter(p => {
    const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : 0);
    return (disc ?? 0) >= 10;
  });
  if (flash.length === 0) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div style={{ background: "white", margin: "6px 0", padding: "20px 0 8px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c0392b", animation: "pulse 1.2s ease-in-out infinite" }} />
              <span style={{ fontSize: 19, fontWeight: 900, color: "#c0392b", letterSpacing: -0.5 }}>Flash Deals</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Ends in</span>
              {[countdown.h, countdown.m, countdown.s].map((val, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ background: "#c0392b", color: "white", fontSize: 13, fontWeight: 800, padding: "4px 9px", borderRadius: 6, minWidth: 34, textAlign: "center", fontVariantNumeric: "tabular-nums", boxShadow: "0 2px 8px rgba(192,57,43,0.35)" }}>{pad(val)}</span>
                  {i < 2 && <span style={{ color: "#c0392b", fontWeight: 900, fontSize: 16 }}>:</span>}
                </span>
              ))}
            </div>
          </div>
          <Link href="/store?sort=discount" style={{ fontSize: 12, fontWeight: 700, color: "#c0392b", textDecoration: "none", border: "1.5px solid #c0392b", padding: "7px 18px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "#c0392b"; el.style.color = "white"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = "#c0392b"; }}
          >See All Deals →</Link>
        </div>
        <div style={{ position: "relative" }}>
          <ScrollBtn dir="l" onClick={() => scroll("l")} />
          <div ref={rowRef} style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "4px 2px 14px" }}>
            {flash.slice(0, 16).map(p => <FlashCard key={p.id} p={p} onClick={() => router.push(`/store/product/${p.id}`)} />)}
          </div>
          <ScrollBtn dir="r" onClick={() => scroll("r")} />
        </div>
      </div>
    </div>
  );
}

function FlashCard({ p, onClick }: { p: HP; onClick: () => void }) {
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : 0);
  const sold = useRef(Math.floor(Math.random() * 45 + 20)).current;
  const [imgIdx, setImgIdx] = useState(0);
  const [imgVis, setImgVis] = useState(true);
  const imgs: string[] = [];
  if (resolveImg(p.main_image)) imgs.push(resolveImg(p.main_image)!);
  if (p.images) p.images.filter(Boolean).forEach(u => { const r = resolveImg(u); if (r && !imgs.includes(r)) imgs.push(r); });
  useEffect(() => {
    if (imgs.length < 2) return;
    const id = setInterval(() => { setImgVis(false); setTimeout(() => { setImgIdx(i => (i + 1) % imgs.length); setImgVis(true); }, 320); }, 3000);
    return () => clearInterval(id);
  }, [imgs.length]);
  const curImg = imgs[imgIdx] ?? null;

  return (
    <div onClick={onClick} style={{ width: 172, flexShrink: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.22s, transform 0.22s, border-color 0.22s", position: "relative" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "#c0392b"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; el.style.borderColor = "#e5e7eb"; }}
    >
      {disc && disc >= 5 && <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "#c0392b", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5 }}>-{disc}%</div>}
      <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", background: "#f8fafc" }}>
        {curImg ? (
          <img src={optimizeImg(curImg, 300)!} alt={p.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: imgVis ? 1 : 0, transform: imgVis ? "scale(1)" : "scale(1.05)", transition: "opacity 0.3s ease, transform 0.3s ease" }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
        ) : <div className="shimbox" style={{ position: "absolute", inset: 0 }} />}
      </div>
      <div style={{ padding: "10px 10px 13px" }}>
        <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 8, minHeight: 30 }}>{p.title}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#c0392b", marginBottom: 2 }}>{formatCurrency(p.price)}</div>
        {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "#9ca3af", textDecoration: "line-through", marginBottom: 8 }}>{formatCurrency(p.compare_price)}</div>}
        <div style={{ height: 5, background: "#fee2e2", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${sold}%`, background: "linear-gradient(90deg,#c0392b,#e74c3c)", borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 9, color: "#c0392b", fontWeight: 700, marginTop: 3, display: "block" }}>{sold}% sold</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MARQUEE
═══════════════════════════════════════════════════════════════ */
function Marquee() {
  const items = ["Free Delivery on Orders over M500", "100% Authentic Products", "Secure Encrypted Checkout", "7-Day Easy Returns", "Premium Gift Packaging", "New Collections Weekly", "Exclusive Member Rewards", "Lesotho's Premier Beauty Store"];
  return (
    <div style={{ background: "#0f3f2f", overflow: "hidden", height: 40, display: "flex", alignItems: "center" }}>
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", whiteSpace: "nowrap", animation: "marquee 32s linear infinite", willChange: "transform" }}>
        {[...items, ...items, ...items, ...items].map((t, i) => (
          <span key={i} style={{ fontSize: 11.5, fontWeight: 500, color: "rgba(255,255,255,0.82)", padding: "0 30px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#c8a75a", display: "inline-block" }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DEPARTMENT GRID — full product images from /api/categories/departments
═══════════════════════════════════════════════════════════════ */
function DepartmentGrid({ departments }: { departments: DeptCategory[] }) {
  if (departments.length === 0) return null;
  return (
    <div style={{ background: "#f8fafc", padding: "6px 0" }}>
      {departments.map(dept => (
        <div key={dept.key} style={{ background: "white", margin: "6px 0", padding: "24px 0 20px" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
            <SectionHeader title={dept.title} subtitle={`Browse all ${dept.title.toLowerCase()}`} accentColor="#0f3f2f" viewAllHref={dept.href} viewAllLabel="View All" />
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(dept.subcategories.length, 8)}, 1fr)`, gap: 10 }}>
              {dept.subcategories.filter(s => s.image).map(sub => (
                <Link key={sub.key} href={sub.href} style={{ textDecoration: "none" }}>
                  <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb", background: "white", transition: "box-shadow 0.2s, transform 0.2s" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-3px)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
                  >
                    <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "#f1f5f9" }}>
                      <img src={optimizeImg(sub.image, 300)!} alt={sub.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.35s ease" }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                      />
                    </div>
                    <div style={{ padding: "8px 8px 10px", fontSize: 11, fontWeight: 700, color: "#374151", textAlign: "center", lineHeight: 1.2, background: "white" }}>{sub.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEADER helper
═══════════════════════════════════════════════════════════════ */
function SectionHeader({ title, subtitle, accentColor, viewAllHref, viewAllLabel = "View All", badge }: {
  title: string; subtitle?: string; accentColor: string; viewAllHref: string; viewAllLabel?: string; badge?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 4, height: 38, background: accentColor, borderRadius: 2, flexShrink: 0 }} />
        <div>
          {badge && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "white", background: accentColor, padding: "2px 9px", borderRadius: 4, display: "inline-block", marginBottom: 4 }}>{badge}</span>}
          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f0f0f", margin: 0, letterSpacing: -0.4 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{subtitle}</p>}
        </div>
      </div>
      <Link href={viewAllHref} style={{ fontSize: 12, fontWeight: 700, color: accentColor, textDecoration: "none", border: `1.5px solid ${accentColor}`, padding: "7px 18px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = accentColor; el.style.color = "white"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = accentColor; }}
      >{viewAllLabel} →</Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION ROW — from backend /api/homepage/sections
═══════════════════════════════════════════════════════════════ */
function SectionRow({ sec, onProductClick }: { sec: Section; onProductClick: (id: string) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th = THEME_MAP[sec.theme] ?? THEME_MAP.forest;
  const href = safeViewAll(sec.view_all);
  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 700 : -700, behavior: "smooth" });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ background: "white", margin: "6px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(22px)", transition: "opacity 0.55s ease, transform 0.55s ease" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px clamp(16px,4vw,40px) 0" }}>
        <SectionHeader title={sec.title} subtitle={sec.subtitle} accentColor={th.primary} viewAllHref={href} badge={sec.badge ?? undefined} />
      </div>
      <div style={{ position: "relative", maxWidth: 1400, margin: "0 auto" }}>
        <ScrollBtn dir="l" onClick={() => scroll("l")} style={{ left: "clamp(0px,1vw,16px)" }} />
        <div ref={rowRef} style={{ display: "flex", gap: 2, overflowX: "auto", scrollbarWidth: "none", padding: "4px clamp(16px,4vw,40px) 20px" }}>
          {sec.products.map(p => <SectionCard key={p.id} p={p} accent={th.primary} onClick={() => onProductClick(p.id)} />)}
          <Link href={href} style={{ width: 140, flexShrink: 0, background: "#f9fafb", border: `2px dashed ${th.primary}50`, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textDecoration: "none", padding: "20px 14px", transition: "background 0.2s" }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "#f0fdf4")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = "#f9fafb")}
          >
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${th.primary}`, display: "flex", alignItems: "center", justifyContent: "center", color: th.primary, fontSize: 22, fontWeight: 700 }}>→</div>
            <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.4 }}>See All<br />{sec.title}</span>
          </Link>
        </div>
        <ScrollBtn dir="r" onClick={() => scroll("r")} style={{ right: "clamp(0px,1vw,16px)" }} />
      </div>
    </div>
  );
}

function SectionCard({ p, accent, onClick }: { p: HP; accent: string; onClick: () => void }) {
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
  const [imgIdx, setImgIdx] = useState(0);
  const [imgVis, setImgVis] = useState(true);
  const imgs: string[] = [];
  if (resolveImg(p.main_image)) imgs.push(resolveImg(p.main_image)!);
  if (p.images) p.images.filter(Boolean).forEach(u => { const r = resolveImg(u); if (r && !imgs.includes(r)) imgs.push(r); });
  useEffect(() => {
    if (imgs.length < 2) return;
    const id = setInterval(() => { setImgVis(false); setTimeout(() => { setImgIdx(i => (i + 1) % imgs.length); setImgVis(true); }, 300); }, 3600);
    return () => clearInterval(id);
  }, [imgs.length]);
  const curImg = imgs[imgIdx] ?? null;

  return (
    <div onClick={onClick} style={{ width: 176, flexShrink: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s", position: "relative" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = accent; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; el.style.borderColor = "#e5e7eb"; }}
    >
      {disc && disc >= 5 && <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: accent, color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>}
      {!p.in_stock && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.65)", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "white", border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: 6 }}>Sold Out</span></div>}
      <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", background: "#f8fafc" }}>
        {curImg ? (
          <img src={optimizeImg(curImg, 300)!} alt={p.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: imgVis ? 1 : 0, transform: imgVis ? "scale(1)" : "scale(1.06)", transition: "opacity 0.3s ease, transform 0.3s ease" }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
        ) : <div className="shimbox" style={{ position: "absolute", inset: 0 }} />}
      </div>
      <div style={{ padding: "10px 11px 13px" }}>
        {p.brand && <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: accent, marginBottom: 3 }}>{p.brand}</div>}
        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.38, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 33, marginBottom: 6 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f0f0f" }}>{formatCurrency(p.price)}</div>
            {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "#9ca3af", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
          </div>
          {p.rating && p.rating >= 4 && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 10, color: "#f59e0b" }}>★</span>
              <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{p.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON SECTION
═══════════════════════════════════════════════════════════════ */
function SkeletonSection() {
  return (
    <div style={{ background: "white", margin: "6px 0", padding: "22px clamp(16px,4vw,40px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="shimbox" style={{ width: 4, height: 38, borderRadius: 2 }} />
          <div><div className="shimbox" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 6 }} /><div className="shimbox" style={{ width: 100, height: 10, borderRadius: 4 }} /></div>
        </div>
        <div className="shimbox" style={{ width: 80, height: 30, borderRadius: 20 }} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimbox" style={{ width: 176, height: 268, flexShrink: 0, borderRadius: 14 }} />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   JUST FOR YOU — infinite scroll grid
═══════════════════════════════════════════════════════════════ */
function JustForYou({ products }: { products: HP[] }) {
  const router = useRouter();
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
    <div ref={wrapRef} style={{ background: "white", margin: "6px 0", padding: "28px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(22px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <SectionHeader title="Just For You" subtitle="Curated picks based on what's trending" accentColor="#c8a75a" viewAllHref="/store" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12 }}>
          {display.map((p, i) => {
            const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);
            return <JFYCard key={p.id} p={p} disc={disc} delay={Math.min(i, 15) * 40} onClick={() => router.push(`/store/product/${p.id}`)} />;
          })}
        </div>
        {!showAll && products.length > 20 && (
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <button onClick={() => setShowAll(true)} style={{ background: "#0f3f2f", color: "white", border: "none", padding: "14px 44px", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s, transform 0.2s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "#0a2a1f"; el.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "#0f3f2f"; el.style.transform = "none"; }}
            >Load More Products</button>
          </div>
        )}
      </div>
    </div>
  );
}

function JFYCard({ p, disc, delay, onClick }: { p: HP; disc: number | null; delay: number; onClick: () => void }) {
  const [saved, setSaved] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [imgVis, setImgVis] = useState(true);
  const imgs: string[] = [];
  if (resolveImg(p.main_image)) imgs.push(resolveImg(p.main_image)!);
  if (p.images) p.images.filter(Boolean).forEach(u => { const r = resolveImg(u); if (r && !imgs.includes(r)) imgs.push(r); });
  useEffect(() => {
    if (imgs.length < 2) return;
    const interval = 3000 + (delay % 900);
    const id = setInterval(() => { setImgVis(false); setTimeout(() => { setImgIdx(i => (i + 1) % imgs.length); setImgVis(true); }, 300); }, interval);
    return () => clearInterval(id);
  }, [imgs.length, delay]);
  const curImg = imgs[imgIdx] ?? null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: "white", border: hovered ? "1.5px solid #0f3f2f" : "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s", position: "relative", boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.1)" : "none", transform: hovered ? "translateY(-3px)" : "none" }}
    >
      {disc && disc >= 5 && <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "#c0392b", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{disc}%</div>}
      {!p.in_stock && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.65)", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "white", border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: 6 }}>Sold Out</span></div>}
      <button onClick={e => { e.stopPropagation(); setSaved(!saved); }} style={{ position: "absolute", top: 8, right: 8, zIndex: 4, width: 30, height: 30, borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "auto", padding: 0, fontSize: 14, transition: "transform 0.2s" }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)")}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
      >
        <span style={{ color: saved ? "#c0392b" : "#9ca3af" }}>{saved ? "♥" : "♡"}</span>
      </button>
      <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", background: "#f8fafc" }}>
        {curImg ? (
          <img src={optimizeImg(curImg, 300)!} alt={p.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: imgVis ? 1 : 0, transform: imgVis ? "scale(1)" : "scale(1.04)", transition: "opacity 0.3s ease, transform 0.3s ease" }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
        ) : <div className="shimbox" style={{ position: "absolute", inset: 0 }} />}
      </div>
      <div style={{ padding: "10px 12px 13px" }}>
        {p.brand && <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "#0f3f2f", letterSpacing: 0.8, marginBottom: 3 }}>{p.brand}</div>}
        <div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 35, marginBottom: 8 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hovered ? 10 : 0, transition: "margin 0.2s" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f0f0f" }}>{formatCurrency(p.price)}</div>
            {p.compare_price && p.compare_price > p.price && <div style={{ fontSize: 10, color: "#9ca3af", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
          </div>
          {p.rating && p.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 11, color: "#f59e0b" }}>★</span>
              <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{p.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {p.in_stock && (
          <button
            onClick={e => { e.stopPropagation(); setAdded(true); setTimeout(() => setAdded(false), 2000); }}
            style={{ width: "100%", background: added ? "#16a34a" : (hovered ? "#0f3f2f" : "#e8f0ed"), color: added ? "white" : (hovered ? "white" : "#0f3f2f"), border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.25s, color 0.25s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: "auto", maxHeight: hovered ? 40 : 0, overflow: "hidden", opacity: hovered || added ? 1 : 0 }}
          >
            {added ? "✓ Added to Cart" : "+ Add to Cart"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RECENTLY VIEWED
═══════════════════════════════════════════════════════════════ */
function RecentlyViewed() {
  const router = useRouter();
  const [items, setItems] = useState<HP[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 600 : -600, behavior: "smooth" });

  useEffect(() => {
    fetch(`${API}/api/users/me/recently-viewed`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) setItems(data.slice(0, 12));
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{ background: "white", margin: "6px 0", padding: "22px 0 10px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <SectionHeader title="Recently Viewed" subtitle="Continue where you left off" accentColor="#6b7280" viewAllHref="/store" viewAllLabel="See More" />
      </div>
      <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative" }}>
        <ScrollBtn dir="l" onClick={() => scroll("l")} />
        <div ref={rowRef} style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "4px clamp(16px,4vw,40px) 14px" }}>
          {items.map(p => (
            <div key={p.id} onClick={() => router.push(`/store/product/${p.id}`)} style={{ width: 148, flexShrink: 0, cursor: "pointer", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "white", transition: "box-shadow 0.2s, transform 0.2s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
            >
              <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "#f1f5f9" }}>
                {p.main_image ? (
                  <img src={optimizeImg(resolveImg(p.main_image), 300)!} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : <div className="shimbox" style={{ width: "100%", height: "100%" }} />}
              </div>
              <div style={{ padding: "8px 9px 10px" }}>
                <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f0f0f", marginTop: 5 }}>{formatCurrency(p.price)}</div>
              </div>
            </div>
          ))}
        </div>
        <ScrollBtn dir="r" onClick={() => scroll("r")} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEWSLETTER
═══════════════════════════════════════════════════════════════ */
function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <div style={{ background: "linear-gradient(135deg, #061a12 0%, #0a2a1f 50%, #1b5e4a 100%)", padding: "64px 0", margin: "6px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(200,167,90,0.08)", filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(30px)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>✉</div>
        <h2 style={{ color: "white", fontSize: 28, fontWeight: 900, margin: "0 0 10px", letterSpacing: -0.5 }}>Stay in the loop</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 32, lineHeight: 1.75 }}>Subscribe for exclusive deals, new arrivals, and curated beauty tips.</p>
        {done ? (
          <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12, padding: "18px 28px", color: "white", fontWeight: 600 }}>
            ✓ You&apos;re subscribed! Watch your inbox for exclusive deals.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, maxWidth: 500, margin: "0 auto" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address"
              style={{ flex: 1, padding: "14px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.2)", fontSize: 14, fontFamily: "inherit", outline: "none", background: "rgba(255,255,255,0.95)", color: "#1a1a1a" }} />
            <button onClick={() => { if (email.includes("@")) setDone(true); }}
              style={{ background: "#c8a75a", color: "#1a1a1a", border: "none", padding: "14px 26px", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "none"; el.style.boxShadow = "none"; }}
            >Subscribe →</button>
          </div>
        )}
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 16 }}>No spam, ever. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();

  const [heroProducts,   setHeroProducts]   = useState<HP[]>([]);
  const [heroLoad,       setHeroLoad]       = useState(true);
  const [sections,       setSections]       = useState<Section[]>([]);
  const [secLoad,        setSecLoad]        = useState(true);
  const [jfyProducts,    setJfyProducts]    = useState<HP[]>([]);
  const [departments,    setDepartments]    = useState<DeptCategory[]>([]);
  const [brands,         setBrands]         = useState<BrandItem[]>([]);
  const [brandImages,    setBrandImages]    = useState<Record<string, string | null>>({});
  const [categoryImages, setCategoryImages] = useState<Record<string, string | null>>({});

  /* Fetch random products for hero + flash deals */
  useEffect(() => {
    fetch(`${API}/api/products/random?count=40&with_images=true&diverse=true`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then((d: { products?: HP[] }) => setHeroProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setHeroLoad(false));
  }, []);

  /* Fetch homepage sections */
  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.ok ? r.json() : { sections: [] })
      .then((d: { sections?: Section[] }) => setSections(d.sections ?? []))
      .catch(() => {})
      .finally(() => setSecLoad(false));
  }, []);

  /* Fetch just-for-you products */
  useEffect(() => {
    fetch(`${API}/api/products/random?count=40&with_images=true`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then((d: { products?: HP[] }) => setJfyProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  /* Fetch department tree (real images per subcategory) */
  useEffect(() => {
    fetch(`${API}/api/categories/departments`)
      .then(r => r.ok ? r.json() : [])
      .then((data: DeptCategory[]) => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch(() => {});
  }, []);

  /* Fetch brands with product counts */
  useEffect(() => {
    fetch(`${API}/api/brands`)
      .then(r => r.ok ? r.json() : [])
      .then((data: BrandItem[]) => {
        if (Array.isArray(data)) {
          setBrands(data);
          // Build brand → image map from hero products
        }
      })
      .catch(() => {});
  }, []);

  /* When heroProducts load, build category → image and brand → image maps */
  useEffect(() => {
    if (heroProducts.length === 0) return;
    const catMap: Record<string, string | null> = {};
    const brMap: Record<string, string | null> = {};
    heroProducts.forEach(p => {
      if (p.category && p.main_image && !catMap[p.category]) catMap[p.category] = p.main_image;
      if (p.brand) {
        const key = (p.brand ?? "").toLowerCase().replace(/\s+/g, "_");
        if (p.main_image && !brMap[key]) brMap[key] = p.main_image;
      }
    });
    // Also map NAV_CATS tags from sections
    sections.forEach(sec => {
      sec.products.forEach(p => {
        if (p.category && p.main_image && !catMap[p.category]) catMap[p.category] = p.main_image;
      });
    });
    setCategoryImages(prev => ({ ...catMap, ...prev }));
    setBrandImages(prev => ({ ...brMap, ...prev }));
  }, [heroProducts, sections]);

  /* Fetch per-tag images for category nav using /api/products/random per tag */
  useEffect(() => {
    const missingTags = NAV_CATS.filter(c => !categoryImages[c.tag]).map(c => c.tag);
    if (missingTags.length === 0) return;
    // Batch: fetch one product per tag to get its image
    Promise.all(
      missingTags.slice(0, 8).map(tag =>
        fetch(`${API}/api/products?tag=${tag}&per_page=1&with_images=true`)
          .then(r => r.ok ? r.json() : { results: [] })
          .then((d: { results?: HP[] }) => {
            const p = d.results?.[0];
            return { tag, img: p?.main_image ?? null };
          })
          .catch(() => ({ tag, img: null }))
      )
    ).then(results => {
      const map: Record<string, string | null> = {};
      results.forEach(({ tag, img }) => { if (img) map[tag] = img; });
      setCategoryImages(prev => ({ ...map, ...prev }));
    });
  }, [heroProducts.length]);

  /* Assign brand images from hero products after brands loaded */
  useEffect(() => {
    if (brands.length === 0 || heroProducts.length === 0) return;
    const map: Record<string, string | null> = {};
    brands.forEach(b => {
      const key = b.slug ?? b.name.toLowerCase();
      const match = heroProducts.find(p => p.brand?.toLowerCase() === b.name.toLowerCase());
      if (match?.main_image) map[key] = match.main_image;
    });
    setBrandImages(prev => ({ ...map, ...prev }));
  }, [brands, heroProducts]);

  const promoProducts = heroProducts.filter(p => p.main_image).slice(0, 3);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        .shimbox{background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{display:none;}
        *{box-sizing:border-box;}
      `}</style>

      <AnnouncementBar />
      <CategoryNav categoryImages={categoryImages} />
      <HeroBanner products={heroLoad ? [] : heroProducts} />
      <TrustBar />
      <TopBrands brands={brands} brandImages={brandImages} />
      <PromoBanners featuredProducts={promoProducts.length >= 3 ? promoProducts : heroProducts.slice(0, 3)} />
      <FlashDeals products={heroProducts} />
      <Marquee />
      <DepartmentGrid departments={departments} />

      {secLoad ? (
        <><SkeletonSection /><SkeletonSection /><SkeletonSection /></>
      ) : sections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "white", margin: "6px 0" }}>
          <p style={{ fontSize: 16, color: "#9ca3af", fontStyle: "italic" }}>Sections will appear here once products are added to your store.</p>
        </div>
      ) : (
        sections.map(sec => (
          <SectionRow key={sec.key} sec={sec} onProductClick={id => router.push(`/store/product/${id}`)} />
        ))
      )}

      <RecentlyViewed />
      <JustForYou products={jfyProducts} />
      <Newsletter />
    </div>
  );
}