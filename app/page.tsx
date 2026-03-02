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

function optimizeImg(url: string | null | undefined, _size?: number): string | null {
  if (!url) return null;
  if (!url.includes("m.media-amazon.com")) return url;

  const SIZE = 1500;

  let base = url
    .replace(/_SX\d+_SY\d+_(?:QL\d+_)?(?:FM\w+_)?/gi, "")
    .replace(/_AC_SX\d+_CR[\d,]+_/gi, "")
    .replace(/_AC_SL\d+_/gi, "")
    .replace(/_AC_SX\d+_/gi, "")
    .replace(/_AC_SY\d+_/gi, "")
    .replace(/_AC_UX\d+_(?:QL\d+_)?/gi, "")
    .replace(/_AC_UY\d+_/gi, "")
    .replace(/_AC_UL\d+_/gi, "")
    .replace(/_AC_US\d+_/gi, "")
    .replace(/_SX\d+_/gi, "")
    .replace(/_SY\d+_/gi, "")
    .replace(/_SL\d+_/gi, "")
    .replace(/_SS\d+_/gi, "")
    .replace(/_QL\d+_/gi, "")
    .replace(/_CR[\d,]+_/gi, "")
    .replace(/_FM\w+_/gi, "")
    .replace(/\._AC_\./gi, ".")
    .replace(/_\.(jpe?g|webp|png)/gi, ".$1")
    .replace(/\._+\./g, ".")
    .replace(/\.{2,}/g, ".");

  const out = base.replace(/(\.(jpe?g|webp|png))(\?.*)?$/i, `._AC_SL${SIZE}_$1$3`);
  return out !== base ? out : base;
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
   HOOKS (COUNTDOWN, ROTATING INDEX)
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

function useRotatingIndex(total: number, intervalMs: number, offset = 0): number {
  const idxRef = useRef<number | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (total < 1) return;
    if (idxRef.current === null) {
      const start = offset % total;
      idxRef.current = start;
      setIdx(start);
    }
  }, [total, offset]);

  useEffect(() => {
    if (total < 2) return;
    const id = setInterval(() => {
      setIdx(prev => {
        const next = (prev + 1) % total;
        idxRef.current = next;
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [total, intervalMs]);

  return idx;
}

/* ─────────────────────────────────────────────────
   COMPONENTS
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
    >
      {dir === "l" ? "‹" : "›"}
    </button>
  );
}

function ProductImg({ src, alt, size = 300, style: extraStyle }: { src: string | null; alt: string; size?: 300 | 500; style?: React.CSSProperties }) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const resolved = resolveImg(src);
  const optimized = optimizeImg(resolved, size);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#ffffff", ...extraStyle }}>
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
            objectFit: "contain",
            padding: "8px",
            background: "#ffffff",
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

/* ─────────────────────────────────────────────────
   DYNAMIC CATEGORY NAV
───────────────────────────────────────────────── */
function CategoryNav({ categoryImages }: { categoryImages: Record<string, string | null> }) {
  const [navCats, setNavCats] = useState<any[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(res => res.json())
      .then(data => setNavCats(data));
  }, []);

  const scroll = (dir: "l" | "r") => rowRef.current?.scrollBy({ left: dir === "r" ? 600 : -600, behavior: "smooth" });

  return (
    <div style={{ background: "white", borderBottom: "1px solid #e8ecef", padding: "10px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(12px,3vw,40px)", position: "relative" }}>
        <ScrollBtn dir="l" onClick={() => scroll("l")} style={{ left: -2, width: 32, height: 32, fontSize: 14 }} />
        <div ref={rowRef} style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none", padding: "2px 20px" }}>
          {navCats.map(c => {
            const img = categoryImages[c.slug];
            return (
              <Link
                key={c.slug}
                href={`/store?category=${c.slug}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 10, textDecoration: "none", flexShrink: 0, transition: "background 0.2s, transform 0.2s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "#f0fdf4"; el.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.transform = "none"; }}
              >
                <div style={{ width: 60, height: 60, borderRadius: 14, overflow: "hidden", border: "2px solid #e2ece8", flexShrink: 0, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {img ? (
                    <img src={optimizeImg(resolveImg(img), 300)!} alt={c.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px", display: "block", transition: "transform 0.3s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                    />
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#cbd5e1" }}>{c.name.charAt(0)}</span>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#374151", textAlign: "center", lineHeight: 1.25, whiteSpace: "nowrap", letterSpacing: 0.1 }}>{c.name}</span>
              </Link>
            );
          })}
        </div>
        <ScrollBtn dir="r" onClick={() => scroll("r")} style={{ right: -2, width: 32, height: 32, fontSize: 14 }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   HERO BANNER
───────────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    tag: "Exclusive Collection",
    headline: "Premium Beauty\nEssentials",
    sub: "Discover the world's best skincare brands delivered straight to your door in Lesotho.",
    cta: "Shop Now",
    ctaLink: "/store",
    bg: "linear-gradient(135deg, #061a12 0%, #0a2a1f 50%, #1b5e4a 100%)",
    accent: "#c8a75a",
  },
  {
    tag: "Just In",
    headline: "New Arrivals &\nTrending Now",
    sub: "Stay ahead of the curve with our latest selection of viral beauty products.",
    cta: "Browse New",
    ctaLink: "/store?sort=newest",
    bg: "linear-gradient(135deg, #2d1b69, #5b21b6, #7c3aed)",
    accent: "#fce7f3",
  }
];

function HeroBanner({ products }: { products: HP[] }) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [animIn, setAnimIn] = useState(true);

  const spread = Math.max(1, Math.floor(products.length / 4));
  const slot0 = useRotatingIndex(products.length, 2800, 0);
  const slot1 = useRotatingIndex(products.length, 3300, spread);
  const slot2 = useRotatingIndex(products.length, 2600, spread * 2);
  const slot3 = useRotatingIndex(products.length, 3700, spread * 3);
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
      <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: `${s.accent}12`, filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,48px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, minHeight: 380, alignItems: "center", position: "relative", zIndex: 1 }}>
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
          </div>
        </div>
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
  }, [p.id, p.main_image]);
  const src = resolveImg(cur.main_image);
  return src ? (
    <img src={optimizeImg(src, 500)!} alt={cur.title}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(1.04)", transition: "opacity 0.3s ease, transform 0.3s ease" }}
      onLoad={() => setVisible(true)}
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  ) : <div className="shimbox" style={{ position: "absolute", inset: 0 }} />;
}

/* ─────────────────────────────────────────────────
   TRUST BAR
───────────────────────────────────────────────── */
function TrustBar() {
  const items = [
    { title: "Free Delivery", sub: "Orders over M500", icon: "🚚" },
    { title: "100% Authentic", sub: "Verified products", icon: "🛡️" },
    { title: "Easy Returns", sub: "7-day hassle-free", icon: "🔄" },
    { title: "Secure Payment", sub: "Encrypted checkout", icon: "💳" },
    { title: "Gift Packaging", sub: "Premium wrapping", icon: "🎁" },
  ];
  return (
    <div style={{ background: "white", borderTop: "1px solid #eef0f3", borderBottom: "1px solid #eef0f3", margin: "0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
          {items.map((item, i) => (
            <div key={item.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 16px", borderRight: i < items.length - 1 ? "1px solid #eef0f3" : "none" }}>
              <div style={{ fontSize: 24 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   DYNAMIC SHOP BY CATEGORY
───────────────────────────────────────────────── */
function ShopByCategory() {
  const [catData, setCatData] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/categories`);
        const cats = await res.json();
        const detailed = await Promise.all(cats.slice(0, 12).map(async (c: any) => {
          const pRes = await fetch(`${API}/api/products?category=${c.slug}&per_page=4`);
          const pData = await pRes.json();
          return { ...c, products: pData.results || [] };
        }));
        setCatData(detailed);
        setLoaded(true);
      } catch (err) { console.error(err); }
    }
    load();
  }, []);

  return (
    <div style={{ background: "#f8fafc", padding: "40px 0 36px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f3f2f" }}>Shop by Category</h2>
            <p style={{ fontSize: 14, color: "#64748b" }}>Quality products across all departments delivered to Lesotho.</p>
          </div>
          <Link href="/store" style={{ border: "1.5px solid #0f3f2f", padding: "7px 16px", borderRadius: 8, fontWeight: 700, textDecoration: "none", color: "#0f3f2f" }}>View All →</Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {catData.map(cat => (
            <Link key={cat.slug} href={`/store?category=${cat.slug}`} style={{ textDecoration: "none", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "100px 100px", gap: 2, background: "#f1f5f9" }}>
                {!loaded ? [0,1,2,3].map(i => <div key={i} className="shimbox" style={{ width: "100%", height: "100%" }} />)
                : cat.products.length > 0 ? [0,1,2,3].map(i => {
                  const p = cat.products[i % cat.products.length];
                  return (
                    <div key={i} style={{ background: "white" }}>
                      <img src={optimizeImg(resolveImg(p.main_image), 400)!} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
                    </div>
                  );
                }) : <div style={{ gridColumn: "1/-1", gridRow: "1/-1", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>No products yet</div>}
              </div>
              <div style={{ padding: 15 }}>
                <span style={{ fontWeight: 800, color: "#0f3f2f", fontSize: 16 }}>{cat.name}</span>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{cat.product_count} Items</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MARQUEE
───────────────────────────────────────────────── */
function Marquee() {
  const items = ["Free Delivery on Orders over M500", "100% Authentic Products", "Secure Encrypted Checkout", "7-Day Easy Returns", "Premium Gift Packaging"];
  return (
    <div style={{ background: "#0f3f2f", overflow: "hidden", height: 40, display: "flex", alignItems: "center" }}>
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", whiteSpace: "nowrap", animation: "marquee 32s linear infinite" }}>
        {[...items, ...items].map((t, i) => (
          <span key={i} style={{ fontSize: 11.5, color: "white", padding: "0 30px" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────────── */
function SectionHeader({ title, subtitle, accentColor, viewAllHref, viewAllLabel = "View All" }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 4, height: 38, background: accentColor, borderRadius: 2 }} />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f0f0f", margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{subtitle}</p>}
        </div>
      </div>
      <Link href={viewAllHref} style={{ fontSize: 12, fontWeight: 700, color: accentColor, textDecoration: "none", border: `1.5px solid ${accentColor}`, padding: "7px 18px", borderRadius: 20 }}>{viewAllLabel} →</Link>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SECTION ROW
───────────────────────────────────────────────── */
function SectionRow({ sec, onProductClick }: { sec: Section; onProductClick: (id: string) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const th = THEME_MAP[sec.theme] ?? THEME_MAP.forest;
  const href = safeViewAll(sec.view_all);

  return (
    <div style={{ background: "white", margin: "6px 0", padding: "20px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px" }}>
        <SectionHeader title={sec.title} subtitle={sec.subtitle} accentColor={th.primary} viewAllHref={href} />
        <div style={{ position: "relative" }}>
          <ScrollBtn dir="l" onClick={() => rowRef.current?.scrollBy({ left: -700, behavior: "smooth" })} />
          <div ref={rowRef} style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "4px 0 20px" }}>
            {sec.products.map(p => (
              <div key={p.id} onClick={() => onProductClick(p.id)} style={{ width: 176, flexShrink: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
                <div style={{ aspectRatio: "1/1", background: "white" }}>
                  <img src={optimizeImg(resolveImg(p.main_image), 300)!} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: th.primary }}>{p.brand}</div>
                  <div style={{ fontSize: 12, color: "#374151", height: 33, overflow: "hidden" }}>{p.title}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f0f0f", marginTop: 5 }}>{formatCurrency(p.price)}</div>
                </div>
              </div>
            ))}
          </div>
          <ScrollBtn dir="r" onClick={() => rowRef.current?.scrollBy({ left: 700, behavior: "smooth" })} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MAIN PAGE EXPORT
───────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();

  const [heroProducts, setHeroProducts] = useState<HP[]>([]);
  const [heroLoad, setHeroLoad] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetch(`${API}/api/products/random?count=40&with_images=true`)
      .then(r => r.json()).then(d => setHeroProducts(d.products || [])).finally(() => setHeroLoad(false));

    fetch(`${API}/api/homepage/sections`).then(r => r.json()).then(d => setSections(d.sections || []));
  }, []);

  useEffect(() => {
    if (heroProducts.length === 0) return;
    const catMap: Record<string, string | null> = {};
    heroProducts.forEach(p => {
      if (p.category && p.main_image && !catMap[p.category]) catMap[p.category] = p.main_image;
    });
    setCategoryImages(prev => ({ ...catMap, ...prev }));
  }, [heroProducts]);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        .shimbox{background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        ::-webkit-scrollbar{display:none;}
        *{box-sizing:border-box;}
      `}</style>

      <AnnouncementBar />
      <CategoryNav categoryImages={categoryImages} />
      <HeroBanner products={heroLoad ? [] : heroProducts} />
      <ShopByCategory />
      <TrustBar />
      <Marquee />

      {sections.map(sec => (
        <SectionRow key={sec.key} sec={sec} onProductClick={id => router.push(`/store/product/${id}`)} />
      ))}

      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 900 }}>Ready to discover more?</h2>
        <Link href="/store" style={{ display: "inline-block", background: "#0f3f2f", color: "white", padding: "14px 44px", borderRadius: 9, fontWeight: 800, textDecoration: "none", marginTop: 20 }}>Explore Full Store</Link>
      </div>
    </div>
  );
}