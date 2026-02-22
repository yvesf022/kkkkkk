"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// productsApi used in fallback path inside fetchPool via raw fetch
import type { ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

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

/* Safe "view all" — always routes to /store with proper params */
function safeViewAll(raw: string): string {
  try {
    const url = new URL(raw, "http://x");
    const search = url.searchParams.get("search");
    const category = url.searchParams.get("category");
    const sort = url.searchParams.get("sort");
    const params = new URLSearchParams();
    if (search) params.set("q", search);
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

const THEME: Record<string, { accent: string; light: string; dark: string }> = {
  red:    { accent: "#e53935", light: "rgba(229,57,53,0.08)",   dark: "#b71c1c" },
  green:  { accent: "#2e7d32", light: "rgba(46,125,50,0.08)",   dark: "#1b5e20" },
  gold:   { accent: "#c8a75a", light: "rgba(245,124,0,0.08)",   dark: "#e65100" },
  forest: { accent: "#1b5e4a", light: "rgba(27,94,74,0.08)",    dark: "#0d3326" },
  navy:   { accent: "#1565c0", light: "rgba(21,101,192,0.08)",  dark: "#0d47a1" },
  plum:   { accent: "#6a1b9a", light: "rgba(106,27,154,0.08)",  dark: "#4a148c" },
  teal:   { accent: "#00695c", light: "rgba(0,105,92,0.08)",    dark: "#004d40" },
  rust:   { accent: "#bf360c", light: "rgba(191,54,12,0.08)",   dark: "#8d1f00" },
  slate:  { accent: "#37474f", light: "rgba(55,71,79,0.08)",    dark: "#263238" },
  olive:  { accent: "#558b2f", light: "rgba(85,139,47,0.08)",   dark: "#33691e" },
  rose:   { accent: "#c2185b", light: "rgba(194,24,91,0.08)",   dark: "#880e4f" },
  indigo: { accent: "#283593", light: "rgba(40,53,147,0.08)",   dark: "#1a237e" },
  amber:  { accent: "#e65100", light: "rgba(230,81,0,0.08)",    dark: "#bf360c" },
  sage:   { accent: "#33691e", light: "rgba(51,105,30,0.08)",   dark: "#1b5e20" },
  stone:  { accent: "#4e342e", light: "rgba(78,52,46,0.08)",    dark: "#3e2723" },
};

/* ══════════════════════════════════════════════════════════════════
   HERO PRODUCT CARD — big featured card style
══════════════════════════════════════════════════════════════════ */
function HeroCard({ p, size = "normal", onClick }: { p: HP; size?: "large" | "normal"; onClick: () => void }) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct && p.discount_pct > 0 ? p.discount_pct
    : (p.compare_price && p.compare_price > p.price
        ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);

  return (
    <div className={`hcard hcard-${size}`} onClick={onClick}>
      <div className="hcard-img-wrap">
        {p.main_image && !err
          ? <img src={p.main_image} alt={p.title} className="hcard-img" onError={() => setErr(true)} />
          : <div className="hcard-img-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
        }
        <div className="hcard-badges">
          {disc && disc > 0 && <span className="badge-discount">-{disc}%</span>}
          {!p.in_stock && <span className="badge-sold">Sold Out</span>}
        </div>
        <div className="hcard-overlay">
          <div className="hcard-meta">
            {(p.category || p.brand) && (
              <span className="hcard-cat">{p.category ?? p.brand}</span>
            )}
            <div className="hcard-title">{p.title}</div>
            <div className="hcard-price-row">
              <span className="hcard-price">{formatCurrency(p.price)}</span>
              {p.compare_price && p.compare_price > p.price && (
                <span className="hcard-old">{formatCurrency(p.compare_price)}</span>
              )}
              {p.rating && p.rating > 0 && (
                <span className="hcard-rating">
                  ★ {p.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STORE CARD (section rows)
══════════════════════════════════════════════════════════════════ */
function StoreCard({ p, idx, theme, onClick }: {
  p: HP; idx: number; theme: typeof THEME[string]; onClick: () => void;
}) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct && p.discount_pct > 0 ? p.discount_pct
    : (p.compare_price && p.compare_price > p.price
        ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);

  return (
    <div className="scard" onClick={onClick} style={{ animationDelay: `${idx * 0.04}s` }}>
      <div className="scard-img-wrap">
        {p.main_image && !err
          ? <img src={p.main_image} alt={p.title} className="scard-img" onError={() => setErr(true)} />
          : <div className="scard-placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
        }
        <div className="scard-top">
          {disc && disc > 0 && <span className="sdiscount">-{disc}%</span>}
          {!p.in_stock && <span className="ssold">Out of Stock</span>}
        </div>
        <button className="scard-quick" aria-label="Quick view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View
        </button>
      </div>
      <div className="scard-info">
        {(p.brand || p.category) && <div className="scard-brand">{p.brand ?? p.category}</div>}
        <div className="scard-title">{p.title}</div>
        <div className="scard-bottom">
          <div className="scard-prices">
            <span className="scard-price">{formatCurrency(p.price)}</span>
            {p.compare_price && p.compare_price > p.price && (
              <span className="scard-compare">{formatCurrency(p.compare_price)}</span>
            )}
          </div>
          {p.rating && p.rating > 0 && (
            <div className="scard-stars">
              {"★★★★★".slice(0, Math.round(p.rating))}
              <span className="scard-rcount">({p.rating_number ?? 0})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */

const ROTATE_MS = 4500; // swap displayed hero products every 4.5 s

export default function HomePage() {
  const router = useRouter();

  /* Large shuffled pool drawn from multiple pages & sorts */
  const [pool, setPool]         = useState<HP[]>([]);
  const [offset, setOffset]     = useState(0);
  const [fading, setFading]     = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [heroLoad, setHeroLoad] = useState(true);
  const [secLoad, setSecLoad]   = useState(true);
  const rotateRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Single clean fetch from the dedicated /api/products/random endpoint.
     The backend uses PostgreSQL ORDER BY RANDOM() — true catalogue-wide
     shuffle, always different on every page load. */
  useEffect(() => {
    async function fetchPool() {
      try {
        const res = await fetch(`${API}/api/products/random?count=100&with_images=true`);
        if (!res.ok) throw new Error("random fetch failed");
        const data = await res.json();
        // data.products is already shuffled by the DB — no client shuffle needed
        const products: HP[] = (data.products ?? []);
        setPool(products);
      } catch {
        // Fallback: use existing productsApi with random sort
        try {
          const res = await fetch(`${API}/api/products?sort=random&per_page=100&in_stock=true`);
          const data = await res.json();
          const products: HP[] = (data.results ?? []).filter((p: HP) => p.main_image);
          setPool(shuffle(products));
        } catch { /* silent fail — hero stays empty */ }
      } finally {
        setHeroLoad(false);
      }
    }
    fetchPool();
  }, []);

  /* Auto-rotate: every ROTATE_MS fade out → advance by 5 → fade in */
  useEffect(() => {
    if (pool.length < 5) return;
    rotateRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setOffset(prev => {
          const next = prev + 5;
          return next + 5 > pool.length ? 0 : next;
        });
        setFading(false);
      }, 380);
    }, ROTATE_MS);
    return () => { if (rotateRef.current) clearInterval(rotateRef.current); };
  }, [pool.length]);

  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? []))
      .catch(() => setSections([]))
      .finally(() => setSecLoad(false));
  }, []);

  /* Current 5 products shown in hero */
  const visible   = pool.length >= 5 ? pool.slice(offset, offset + 5) : [];
  const heroBig   = visible[0] as HP | undefined;
  const heroSmall = visible.slice(1, 5) as HP[];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f2f2f2", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#0f3f2f;border-radius:4px}

        @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}

        .shimbox{background:linear-gradient(90deg,#e8e8e8 0%,#d5d5d5 50%,#e8e8e8 100%);
          background-size:200% 100%;animation:shimmer 1.5s ease-in-out infinite;}

        /* HERO */
        .hero-section{background:#fff;padding:0}
        .hero-welcome{background:linear-gradient(135deg,#0f3f2f 0%,#0a2a1f 50%,#0a2a1f 100%);
          padding:12px 20px;display:flex;align-items:center;justify-content:space-between;
          gap:16px;flex-wrap:wrap;}
        .hero-welcome-text{color:#fff;font-size:13px;font-weight:400;opacity:.92;line-height:1.4;}
        .hero-welcome-text strong{font-weight:700;font-size:15px;display:block;}
        .hero-welcome-cta{background:#fff;color:#0f3f2f;border:none;padding:8px 20px;
          border-radius:50px;font-weight:700;font-size:12px;cursor:pointer;
          white-space:nowrap;letter-spacing:.4px;text-decoration:none;
          transition:all .2s ease;flex-shrink:0;}
        .hero-welcome-cta:hover{background:#f5f4f1;transform:scale(1.03);}

        .hero-grid{display:grid;gap:3px;background:#fafaf9;
          grid-template-columns:1fr 1fr 1fr 1fr 1fr;
          grid-template-rows:380px;}
        @media(max-width:1024px){.hero-grid{grid-template-columns:1fr 1fr 1fr;grid-template-rows:320px 320px;}}
        @media(max-width:640px){.hero-grid{grid-template-columns:1fr 1fr;grid-template-rows:260px 260px 260px;}}

        /* HERO CARDS */
        .hcard{position:relative;overflow:hidden;cursor:pointer;background:#e8e8e8;}
        .hcard-large{grid-column:span 2;grid-row:span 1;}
        @media(max-width:1024px){.hcard-large{grid-column:span 2;}}
        @media(max-width:640px){.hcard-large{grid-column:span 2;}}
        .hcard-img-wrap{position:relative;width:100%;height:100%;}
        .hcard-img{width:100%;height:100%;object-fit:cover;display:block;
          transition:transform .5s cubic-bezier(.2,.8,.3,1);}
        .hcard:hover .hcard-img{transform:scale(1.07);}
        .hcard-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e0e0e0;}
        .hcard-badges{position:absolute;top:10px;left:10px;display:flex;flex-direction:column;gap:5px;z-index:3;}
        .badge-discount{background:#e53935;color:#fff;font-size:10px;font-weight:800;
          padding:3px 9px;border-radius:4px;letter-spacing:.3px;}
        .badge-sold{background:rgba(0,0,0,.6);color:#fff;font-size:10px;font-weight:600;
          padding:3px 9px;border-radius:4px;}
        .hcard-overlay{position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(0,0,0,.82) 100%);
          display:flex;align-items:flex-end;z-index:2;
          opacity:0;transition:opacity .3s ease;}
        .hcard:hover .hcard-overlay{opacity:1;}
        .hcard-meta{padding:16px 14px;width:100%;}
        .hcard-cat{font-size:9px;font-weight:600;color:rgba(255,255,255,.55);
          text-transform:uppercase;letter-spacing:1.5px;display:block;margin-bottom:4px;}
        .hcard-title{font-size:14px;font-weight:600;color:#fff;line-height:1.35;
          margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .hcard-large .hcard-title{font-size:17px;}
        .hcard-price-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .hcard-price{font-size:16px;font-weight:800;color:#c8a75a;}
        .hcard-large .hcard-price{font-size:20px;}
        .hcard-old{font-size:11px;color:rgba(255,255,255,.4);text-decoration:line-through;}
        .hcard-rating{font-size:11px;color:#e8d48a;margin-left:auto;}

        /* MARQUEE */
        .marquee-bar{background:linear-gradient(90deg,#0f3f2f,#1b5e4a);overflow:hidden;padding:0;}
        .marquee-inner{display:flex;animation:marquee 30s linear infinite;width:300%;}
        .marquee-item{display:flex;align-items:center;gap:8px;padding:9px 20px;white-space:nowrap;}
        .marquee-dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.6);flex-shrink:0;}
        .marquee-text{font-size:11px;font-weight:500;color:rgba(255,255,255,.9);
          letter-spacing:.6px;text-transform:uppercase;}

        /* CATEGORY CHIPS */
        .cat-strip{background:#fff;border-bottom:1px solid #e8e8e8;overflow-x:auto;
          padding:0 clamp(12px,3vw,40px);}
        .cat-strip::-webkit-scrollbar{height:0;}
        .cat-chips{display:flex;gap:6px;padding:12px 0;white-space:nowrap;}
        .cat-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;
          border-radius:50px;border:1.5px solid #e0e0e0;background:#fff;
          font-size:12px;font-weight:500;color:#333;cursor:pointer;
          text-decoration:none;transition:all .18s ease;flex-shrink:0;}
        .cat-chip:hover{border-color:#0f3f2f;color:#0f3f2f;background:#f5f4f1;}
        .cat-chip-icon{font-size:15px;}

        /* SECTIONS */
        .sections-wrap{padding:clamp(16px,2.5vw,32px) 0 clamp(40px,5vw,64px);}
        .section-block{background:#fff;margin-bottom:8px;}
        .section-head{display:flex;align-items:center;justify-content:space-between;
          padding:16px clamp(12px,3vw,24px) 14px;border-bottom:1px solid #f0f0f0;}
        .section-head-left{display:flex;align-items:center;gap:10px;}
        .section-badge{font-size:9px;font-weight:800;padding:3px 10px;border-radius:4px;
          color:#fff;letter-spacing:1px;text-transform:uppercase;}
        .section-title{font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:-.3px;}
        .section-sub{font-size:11px;color:#999;margin-top:2px;}
        .viewall-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;
          font-weight:600;color:#0f3f2f;text-decoration:none;padding:7px 16px;
          border:1.5px solid #0f3f2f;border-radius:50px;transition:all .18s ease;white-space:nowrap;}
        .viewall-btn:hover{background:#0f3f2f;color:#fff;}
        .viewall-btn svg{transition:transform .18s ease;}
        .viewall-btn:hover svg{transform:translateX(3px);}

        .scroll-row-wrap{position:relative;}
        .scroll-row{display:flex;gap:2px;overflow-x:auto;padding:2px 0;scroll-behavior:smooth;
          background:var(--gray-100,#f5f5f4);}
        .scroll-row::-webkit-scrollbar{height:2px;}
        .scroll-row::-webkit-scrollbar-thumb{background:#0f3f2f;border-radius:2px;}
        .scroll-nav{position:absolute;top:50%;transform:translateY(-50%);
          width:32px;height:48px;background:#fff;border:1px solid #e8e8e8;
          box-shadow:0 2px 12px rgba(0,0,0,.12);border-radius:4px;
          display:flex;align-items:center;justify-content:center;cursor:pointer;
          z-index:10;color:#333;transition:all .18s ease;}
        .scroll-nav:hover{background:#0f3f2f;color:#fff;border-color:#0f3f2f;}
        .scroll-nav-l{left:0;}
        .scroll-nav-r{right:0;}

        /* STORE CARDS — Jumia style */
        .scard{width:185px;flex-shrink:0;background:#fff;cursor:pointer;
          border:1px solid transparent;transition:all .2s ease;animation:scaleIn .4s ease both;}
        .scard:hover{border-color:#0f3f2f;box-shadow:0 4px 20px rgba(15,63,47,0.10);z-index:2;}
        .scard-img-wrap{position:relative;height:185px;background:#f8f8f8;overflow:hidden;}
        .scard-img{width:100%;height:100%;object-fit:cover;display:block;
          transition:transform .4s ease;}
        .scard:hover .scard-img{transform:scale(1.06);}
        .scard-placeholder{width:100%;height:100%;display:flex;align-items:center;
          justify-content:center;background:#f0f0f0;}
        .scard-top{position:absolute;top:8px;left:8px;right:8px;
          display:flex;justify-content:space-between;align-items:flex-start;z-index:2;}
        .sdiscount{background:#e53935;color:#fff;font-size:10px;font-weight:800;
          padding:2px 8px;border-radius:3px;}
        .ssold{background:rgba(0,0,0,.55);color:#fff;font-size:9px;font-weight:600;
          padding:2px 7px;border-radius:3px;}
        .scard-quick{position:absolute;bottom:8px;left:50%;transform:translateX(-50%) translateY(8px);
          background:#0f3f2f;color:#fff;border:none;padding:6px 14px;border-radius:50px;
          font-size:10px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;
          opacity:0;transition:all .2s ease;white-space:nowrap;z-index:3;}
        .scard:hover .scard-quick{opacity:1;transform:translateX(-50%) translateY(0);}
        .scard-info{padding:10px 10px 14px;}
        .scard-brand{font-size:10px;color:#0f3f2f;font-weight:600;text-transform:uppercase;
          letter-spacing:.5px;margin-bottom:3px;}
        .scard-title{font-size:12px;color:#1a1a1a;line-height:1.4;margin-bottom:8px;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
          font-weight:400;min-height:34px;}
        .scard-bottom{display:flex;align-items:center;justify-content:space-between;gap:6px;}
        .scard-prices{display:flex;flex-direction:column;gap:1px;}
        .scard-price{font-size:15px;font-weight:800;color:#1a1a1a;}
        .scard-compare{font-size:10px;color:#aaa;text-decoration:line-through;}
        .scard-stars{font-size:10px;color:#c8a75a;display:flex;align-items:center;gap:2px;}
        .scard-rcount{color:#aaa;font-size:9px;}

        /* END CARD */
        .end-card{width:140px;flex-shrink:0;background:#fff;border:2px dashed #e8e8e8;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:10px;text-decoration:none;color:#0f3f2f;padding:20px 16px;
          transition:all .2s ease;cursor:pointer;}
        .end-card:hover{border-color:#0f3f2f;background:#f5f4f1;}
        .end-card-icon{width:40px;height:40px;border-radius:50%;border:2px solid #0f3f2f;
          display:flex;align-items:center;justify-content:center;}
        .end-card-text{font-size:11px;font-weight:600;text-align:center;line-height:1.5;
          text-transform:uppercase;letter-spacing:.5px;}

        /* TRUST BAR */
        .trust-bar{background:#fff;border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8;
          margin-bottom:8px;}
        .trust-inner{max-width:1440px;margin:0 auto;
          display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
          gap:0;divide-color:#e8e8e8;}
        .trust-item{display:flex;align-items:center;gap:12px;padding:20px 24px;
          border-right:1px solid #f0f0f0;cursor:default;}
        .trust-item:last-child{border-right:none;}
        .trust-icon{color:#0f3f2f;flex-shrink:0;}
        .trust-text-title{font-size:12px;font-weight:700;color:#1a1a1a;}
        .trust-text-sub{font-size:11px;color:#999;}
      `}</style>

      {/* ══ HERO ══ */}
      <section className="hero-section">
        {/* Welcome band — small, doesn't overwhelm */}
        <div className="hero-welcome">
          <div className="hero-welcome-text">
            <strong>Welcome to Karabo Boutique</strong>
            Discover premium products at unbeatable prices
          </div>
          <Link href="/store" className="hero-welcome-cta">Shop All Products</Link>
        </div>

        {/* 5-product image grid — fades and rotates automatically */}
        <div className="hero-grid" style={{ opacity: fading ? 0 : 1, transition: "opacity 0.38s ease" }}>
          {heroLoad ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimbox"
                style={{ gridColumn: i === 0 ? "span 2" : undefined }} />
            ))
          ) : (
            <>
              {heroBig && (
                <HeroCard p={heroBig} size="large"
                  onClick={() => router.push(`/store/product/${heroBig.id}`)} />
              )}
              {heroSmall.map((p) => (
                <HeroCard key={p.id} p={p} size="normal"
                  onClick={() => router.push(`/store/product/${p.id}`)} />
              ))}
            </>
          )}
        </div>

        {/* Rotation progress dots */}
        {!heroLoad && pool.length >= 5 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px 0", background: "#fff",
          }}>
            {Array.from({ length: Math.min(Math.ceil(pool.length / 5), 10) }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setFading(true); setTimeout(() => { setOffset(i * 5); setFading(false); }, 200); }}
                style={{
                  width: i === Math.floor(offset / 5) ? 20 : 6,
                  height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0,
                  background: i === Math.floor(offset / 5) ? "#0f3f2f" : "#d6d3d1",
                  transition: "all 0.3s ease",
                }}
                aria-label={`Show products ${i + 1}`}
              />
            ))}
            <span style={{ fontSize: 10, color: "#a8a29e", marginLeft: 8, fontWeight: 500 }}>
              Auto-rotating
            </span>
          </div>
        )}
      </section>

      {/* ══ MARQUEE ══ */}
      <div className="marquee-bar">
        <div className="marquee-inner">
          {[0, 1, 2].map(gi => (
            <div key={gi} style={{ display: "flex", flex: "0 0 33.333%", justifyContent: "space-around" }}>
              {["Free Delivery on Orders over M500", "100% Authentic Products", "Secure & Easy Checkout",
                "7-Day Easy Returns", "Premium Gift Packaging", "Lesotho's Finest Store"].map((t, i) => (
                <div key={i} className="marquee-item">
                  <div className="marquee-dot" />
                  <span className="marquee-text">{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══ TRUST BAR ══ */}
      <div className="trust-bar">
        <div className="trust-inner">
          {[
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, t: "Free Delivery", d: "Orders over M500" },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>, t: "Authentic Products", d: "100% verified" },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M3 8C5.5 4 10 2 14 2c5.5 0 10 4.5 10 10s-4.5 10-10 10c-4 0-7.5-2-9.5-5"/></svg>, t: "Easy Returns", d: "7-day hassle-free" },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, t: "Secure Payment", d: "Encrypted checkout" },
          ].map(b => (
            <div key={b.t} className="trust-item">
              <div className="trust-icon">{b.icon}</div>
              <div>
                <div className="trust-text-title">{b.t}</div>
                <div className="trust-text-sub">{b.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ CATEGORY CHIPS ══ */}
      <div className="cat-strip">
        <div className="cat-chips">
          {[
            { label: "All Products", href: "/store", icon: "🛍️" },
            { label: "Flash Deals", href: "/store?sort=discount", icon: "⚡" },
            { label: "Smartphones", href: "/store?q=smartphone", icon: "📱" },
            { label: "Beauty", href: "/store?q=skincare", icon: "💄" },
            { label: "Fashion", href: "/store?q=clothing", icon: "👗" },
            { label: "Electronics", href: "/store?q=laptop", icon: "💻" },
            { label: "Audio", href: "/store?q=headphone", icon: "🎧" },
            { label: "Shoes", href: "/store?q=shoes", icon: "👟" },
            { label: "Watches", href: "/store?q=watch", icon: "⌚" },
            { label: "Hair Care", href: "/store?q=hair", icon: "💇" },
            { label: "Bags", href: "/store?q=bag", icon: "👜" },
            { label: "Gaming", href: "/store?q=gaming", icon: "🎮" },
            { label: "Perfume", href: "/store?q=perfume", icon: "🌸" },
            { label: "Best Sellers", href: "/store?sort=popular", icon: "🔥" },
          ].map(c => (
            <Link key={c.href} href={c.href} className="cat-chip">
              <span className="cat-chip-icon">{c.icon}</span>
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ══ SECTIONS ══ */}
      <div className="sections-wrap">
        {secLoad ? (
          <div style={{ padding: "0 clamp(12px,3vw,24px)" }}>
            {[0, 1, 2].map(si => (
              <div key={si} style={{ background: "#fff", marginBottom: 8, padding: "16px 20px" }}>
                <div style={{ height: 22, width: 200, borderRadius: 4, marginBottom: 16 }} className="shimbox" />
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ width: 185, height: 280, flexShrink: 0 }} className="shimbox" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#999", background: "#fff" }}>
            <p style={{ fontSize: 16 }}>Add products to your store — sections will appear automatically.</p>
          </div>
        ) : (
          sections.map((sec, i) => (
            <SectionRow key={sec.key} sec={sec}
              onProductClick={id => router.push(`/store/product/${id}`)} />
          ))
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION ROW
══════════════════════════════════════════════════════════════════ */
function SectionRow({ sec, onProductClick }: { sec: Section; onProductClick: (id: string) => void }) {
  const ref    = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th   = THEME[sec.theme] ?? THEME.forest;
  const href = safeViewAll(sec.view_all);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scroll = (dir: "l" | "r") =>
    rowRef.current?.scrollBy({ left: dir === "r" ? 400 : -400, behavior: "smooth" });

  return (
    <div ref={ref} className="section-block"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)",
        transition: "opacity .5s ease, transform .5s ease" }}>
      {/* Section header */}
      <div className="section-head">
        <div className="section-head-left">
          {sec.badge && (
            <span className="section-badge" style={{ background: th.accent }}>{sec.badge}</span>
          )}
          <div>
            <div className="section-title">{sec.title}</div>
            <div className="section-sub">{sec.subtitle}</div>
          </div>
        </div>
        <Link href={href} className="viewall-btn">
          See All
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </Link>
      </div>

      {/* Product scroll row */}
      <div className="scroll-row-wrap">
        <button className="scroll-nav scroll-nav-l" onClick={() => scroll("l")} aria-label="Scroll left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div ref={rowRef} className="scroll-row" style={{ padding: "12px 44px" }}>
          {sec.products.map((p, i) => (
            <StoreCard key={p.id} p={p} idx={i} theme={th}
              onClick={() => onProductClick(p.id)} />
          ))}
          <Link href={href} className="end-card" style={{ marginLeft: 2 }}>
            <div className="end-card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </div>
            <span className="end-card-text">See all {sec.title}</span>
          </Link>
        </div>
        <button className="scroll-nav scroll-nav-r" onClick={() => scroll("r")} aria-label="Scroll right">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
}