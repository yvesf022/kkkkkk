"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductListItem } from "@/lib/types";
import { categoriesApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Ensure image URLs are absolute — relative paths are served from the backend. */
function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Downsize Amazon CDN images for fast card loading.
 *  _SL1500_ JPEGs are ~200KB each — _SL300_ is ~8KB for the same image. */
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

/* ══════════════════════════════════════════════
   HERO PRODUCT CARD — fills grid cell exactly
══════════════════════════════════════════════ */
function HeroCard({ p, size = "normal", onClick, index = 0, visible: isVisible }: {
  p: HP; size?: "large" | "normal"; onClick: () => void; index?: number; visible?: boolean;
}) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);

  return (
    <div
      className={`hcard hcard-${size}`}
      onClick={onClick}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : "scale(0.97)",
        transition: `opacity 0.55s ease ${index * 80}ms, transform 0.55s ease ${index * 80}ms`,
      }}
    >
      <div className="hcard-inner">
        {resolveImg(p.main_image) && !err ? (
          <div className="hcard-img-box">
            <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} className="hcard-img"
              onError={() => setErr(true)} loading="eager" />
          </div>
        ) : (
          <div className="hcard-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}
        <div className="hcard-gradient" />
        {disc && disc >= 5 && (
          <div className="hcard-badges"><span className="badge-off">-{disc}%</span></div>
        )}
        <div className="hcard-info">
          {(p.category || p.brand) && (
            <div className="hcard-cat">{p.brand ?? p.category}</div>
          )}
          <div className="hcard-title">{p.title}</div>
          <div className="hcard-price-row">
            <span className="hcard-price">{formatCurrency(p.price)}</span>
            {p.compare_price && p.compare_price > p.price && (
              <span className="hcard-old">{formatCurrency(p.compare_price)}</span>
            )}
            {p.rating && p.rating >= 4 && (
              <span className="hcard-star">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#f5c842" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {p.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="hcard-cta">
          <span>View Product</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   HERO SKELETON
══════════════════════════════════════════════ */
function HeroSkeleton() {
  return (
    <>
      <div className="shimbox hcard hcard-large" />
      <div className="shimbox hcard hcard-normal" />
      <div className="shimbox hcard hcard-normal" />
      <div className="shimbox hcard hcard-normal" />
      <div className="shimbox hcard hcard-normal" />
    </>
  );
}

/* ══════════════════════════════════════════════
   SECTION PRODUCT CARD
══════════════════════════════════════════════ */
function SectionCard({ p, idx, accentColor, onClick }: {
  p: HP; idx: number; accentColor: string; onClick: () => void;
}) {
  const [err, setErr] = useState(false);
  const disc = p.discount_pct ?? (p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : null);

  return (
    <div className="scard" onClick={onClick} style={{ animationDelay: `${idx * 50}ms` }}>
      <div className="scard-img-wrap">
        {resolveImg(p.main_image) && !err ? (
          <img src={optimizeImg(resolveImg(p.main_image))!} alt={p.title} className="scard-img"
            onError={() => setErr(true)} loading="lazy" />
        ) : (
          <div className="scard-no-img">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}
        {disc && disc >= 5 && <div className="scard-badge" style={{ background: "#c0392b" }}>-{disc}%</div>}
        {!p.in_stock && <div className="scard-soldout">Sold Out</div>}
        <div className="scard-hover-overlay">
          <div className="scard-view-btn" style={{ background: accentColor }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Quick View
          </div>
        </div>
      </div>
      <div className="scard-info">
        {(p.brand || p.category) && (
          <div className="scard-brand" style={{ color: accentColor }}>{p.brand ?? p.category}</div>
        )}
        <div className="scard-title">{p.title}</div>
        <div className="scard-footer">
          <div className="scard-prices">
            <span className="scard-price">{formatCurrency(p.price)}</span>
            {p.compare_price && p.compare_price > p.price && (
              <span className="scard-compare">{formatCurrency(p.compare_price)}</span>
            )}
          </div>
          {p.rating && p.rating > 0 && (
            <div className="scard-rating">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="9" height="9" viewBox="0 0 24 24"
                  fill={i < Math.round(p.rating!) ? "#c8a75a" : "#e0e0e0"} stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SECTION ROW
══════════════════════════════════════════════ */
function SectionRow({ sec, onProductClick }: {
  sec: Section; onProductClick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const th = THEME_MAP[sec.theme] ?? THEME_MAP.forest;
  const href = safeViewAll(sec.view_all);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.04 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scroll = (dir: "l" | "r") =>
    rowRef.current?.scrollBy({ left: dir === "r" ? 680 : -680, behavior: "smooth" });

  return (
    <div ref={ref} className="section-block" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(28px)",
      transition: "opacity 0.55s ease, transform 0.55s ease",
    }}>
      <div className="section-head">
        <div className="section-head-left">
          <div className="section-accent-bar" style={{ background: th.primary }} />
          <div>
            {sec.badge && <span className="section-badge" style={{ background: th.primary }}>{sec.badge}</span>}
            <div className="section-title">{sec.title}</div>
            <div className="section-sub">{sec.subtitle}</div>
          </div>
        </div>
        <Link href={href} className="view-all-link" style={{ color: th.primary, borderColor: th.primary }}>
          View All
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
      <div className="section-scroll-wrap">
        <button className="scroll-btn scroll-btn-l" onClick={() => scroll("l")} aria-label="Scroll left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div ref={rowRef} className="section-scroll">
          {sec.products.map((p, i) => (
            <SectionCard key={p.id} p={p} idx={i} accentColor={th.primary} onClick={() => onProductClick(p.id)} />
          ))}
          <Link href={href} className="see-more-card" style={{ borderColor: `${th.primary}40` }}>
            <div className="see-more-circle" style={{ borderColor: th.primary, color: th.primary }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span className="see-more-label">See All<br/>{sec.title}</span>
          </Link>
        </div>
        <button className="scroll-btn scroll-btn-r" onClick={() => scroll("r")} aria-label="Scroll right">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SKELETON SECTION
══════════════════════════════════════════════ */
function SkeletonSection() {
  return (
    <div className="section-block">
      <div className="section-head">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="shimbox" style={{ width: 4, height: 44, borderRadius: 2 }} />
          <div>
            <div className="shimbox" style={{ width: 180, height: 18, borderRadius: 4, marginBottom: 6 }} />
            <div className="shimbox" style={{ width: 120, height: 12, borderRadius: 4 }} />
          </div>
        </div>
        <div className="shimbox" style={{ width: 90, height: 34, borderRadius: 50 }} />
      </div>
      <div style={{ display: "flex", gap: 2, padding: "12px 20px", overflow: "hidden" }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="shimbox" style={{ width: 190, height: 290, flexShrink: 0, borderRadius: 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CATEGORY STRIP
══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════
   CATEGORY IMAGE GRID — Amazon-style shop by dept
══════════════════════════════════════════════ */
/* ── Phone brand accent colours (static — brand identity never changes) ── */
const PHONE_BRAND_COLORS: Record<string, string> = {
  samsung:  "#1428A0",
  apple:    "#555555",
  xiaomi:   "#FF6900",
  motorola: "#7F4FC9",
  oneplus:  "#F5010C",
  google:   "#4285F4",
  realme:   "#FFD200",
};

/* ── Fallback images used only when a category has no products yet ── */
const BEAUTY_FALLBACKS: Record<string, string> = {
  moisturizer:      "https://m.media-amazon.com/images/I/514oxIFEEtL._SL1000_.jpg",
  sunscreen:        "https://m.media-amazon.com/images/I/51NBAgCAtTL._AC_SL1262_.jpg",
  face_wash:        "https://m.media-amazon.com/images/I/71fmbSTcBfL._SL1500_.jpg",
  serum:            "https://m.media-amazon.com/images/I/81Jdiv-7ErL._SL1500_.jpg",
  body_lotion:      "https://m.media-amazon.com/images/I/61caZHEaaDL._SL1500_.jpg",
  face_mask:        "https://m.media-amazon.com/images/I/41QqHD8VhdL._AC_SL1024_.jpg",
  eye_mask:         "https://m.media-amazon.com/images/I/71wkEO2BGeL._SL1405_.jpg",
  anti_acne:        "https://m.media-amazon.com/images/I/71sidEjIgpL._SL1500_.jpg",
  skin_brightening: "https://m.media-amazon.com/images/I/71lmZYJ0cRL._SL1500_.jpg",
  collagen:         "https://m.media-amazon.com/images/I/91ns5Kww0vL._SL1500_.jpg",
  skin_natural_oils:"https://m.media-amazon.com/images/I/71DK0uFLIvL._SL1500_.jpg",
  herbal_oils:      "https://m.media-amazon.com/images/I/61T8RzR0MtL._AC_SL1500_.jpg",
  anti_wrinkles:    "https://m.media-amazon.com/images/I/51NfUaTsYEL._SL1500_.jpg",
  body_wash:        "https://m.media-amazon.com/images/I/71Risnk3leL._AC_SL1500_.jpg",
  exfoliator:       "https://m.media-amazon.com/images/I/615ijn+VIBS._SL1228_.jpg",
  lip_mask:         "https://m.media-amazon.com/images/I/71cdS3CsREL._SL1500_.jpg",
};
const PHONE_FALLBACKS: Record<string, string> = {
  samsung:  "https://m.media-amazon.com/images/I/81sQcfsDEBL._AC_SL1500_.jpg",
  apple:    "https://m.media-amazon.com/images/I/81mYHETHGEL._AC_SL1500_.jpg",
  xiaomi:   "https://m.media-amazon.com/images/I/71l3coNp4bL._AC_SL1500_.jpg",
  motorola: "https://m.media-amazon.com/images/I/61byhjs+FML._AC_SL1500_.jpg",
  oneplus:  "https://m.media-amazon.com/images/I/51GhOHvRlhL._AC_SL1040_.jpg",
  google:   "https://m.media-amazon.com/images/I/61etNKg8JlL._AC_SL1500_.jpg",
  realme:   "https://m.media-amazon.com/images/I/81PJLFYSKcL._AC_SL1500_.jpg",
};

/* ── Shape returned by GET /api/categories/departments ── */
interface CatSubcat { key: string; label: string; href: string; image: string | null; }
interface CatDept   { key: string; title: string; href: string; image: string | null; subcategories: CatSubcat[]; }

/* ── Tile skeleton shown while the API loads ── */
function CatTileSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="cattile" style={{ cursor: "default" }}>
          <div className="shimbox cattile-img-wrap" style={{ borderRadius: 0 }} />
          <div className="shimbox cattile-label" style={{ height: 10, width: "60%", margin: "8px auto", borderRadius: 3 }} />
        </div>
      ))}
    </>
  );
}

function CategoryImageGrid() {
  const [depts, setDepts]   = useState<CatDept[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    categoriesApi.departments()
      .then((data: any) => { setDepts(Array.isArray(data) ? data : []); setLoaded(true); })
      .catch(() => setLoaded(true)); // fallbacks render on error too
  }, []);

  /* Resolve the right image: DB image → static fallback → null */
  function beautyImg(sub: CatSubcat) {
    return sub.image ?? BEAUTY_FALLBACKS[sub.key] ?? null;
  }
  function phoneImg(sub: CatSubcat) {
    return sub.image ?? PHONE_FALLBACKS[sub.key] ?? null;
  }

  const beauty = depts.find(d => d.key === "beauty");
  const phones = depts.find(d => d.key === "phones");

  // Guaranteed fallback subcategory lists — used when API returns empty subcategories
  // so the grid always renders tiles even before products are categorised
  const BEAUTY_SUBS_FALLBACK: CatSubcat[] = [
    { key:"moisturizer",       label:"Moisturisers",      href:"/store?category=moisturizer",       image:null },
    { key:"sunscreen",         label:"Sunscreen",          href:"/store?category=sunscreen",          image:null },
    { key:"face_wash",         label:"Face Wash",          href:"/store?category=face_wash",          image:null },
    { key:"serum",             label:"Serums",             href:"/store?category=serum",              image:null },
    { key:"body_lotion",       label:"Body Lotion",        href:"/store?category=body_lotion",        image:null },
    { key:"face_mask",         label:"Face Masks",         href:"/store?category=face_mask",          image:null },
    { key:"eye_mask",          label:"Eye Masks",          href:"/store?category=eye_mask",           image:null },
    { key:"anti_acne",         label:"Anti-Acne",          href:"/store?category=anti_acne",          image:null },
    { key:"skin_brightening",  label:"Skin Brightening",   href:"/store?category=skin_brightening",   image:null },
    { key:"collagen",          label:"Collagen Care",      href:"/store?category=collagen",           image:null },
    { key:"skin_natural_oils", label:"Natural Oils",       href:"/store?category=skin_natural_oils",  image:null },
    { key:"herbal_oils",       label:"Herbal Oils",        href:"/store?category=herbal_oils",        image:null },
    { key:"anti_wrinkles",     label:"Anti-Wrinkle",       href:"/store?category=anti_wrinkles",      image:null },
    { key:"body_wash",         label:"Body Wash",          href:"/store?category=body_wash",          image:null },
    { key:"exfoliator",        label:"Exfoliators",        href:"/store?category=exfoliator",         image:null },
    { key:"lip_mask",          label:"Lip Masks",          href:"/store?category=lip_mask",           image:null },
  ];
  const PHONE_SUBS_FALLBACK: CatSubcat[] = [
    { key:"samsung",  label:"Samsung",      href:"/store?category=samsung",  image:null },
    { key:"apple",    label:"Apple",        href:"/store?category=apple",    image:null },
    { key:"xiaomi",   label:"Xiaomi",       href:"/store?category=xiaomi",   image:null },
    { key:"motorola", label:"Motorola",     href:"/store?category=motorola", image:null },
    { key:"oneplus",  label:"OnePlus",      href:"/store?category=oneplus",  image:null },
    { key:"google",   label:"Google Pixel", href:"/store?category=google",   image:null },
    { key:"realme",   label:"Realme",       href:"/store?category=realme",   image:null },
  ];

  const beautySubs = (beauty?.subcategories?.length ? beauty.subcategories : BEAUTY_SUBS_FALLBACK);
  const phoneSubs  = (phones?.subcategories?.length ? phones.subcategories  : PHONE_SUBS_FALLBACK);

  return (
    <div className="catgrid-wrap">

      {/* ── Beauty Section ── */}
      <div className="catgrid-section">
        <div className="catgrid-header">
          <div className="catgrid-header-left">
            <span className="catgrid-pill">Beauty</span>
            <h2 className="catgrid-title">Beauty &amp; Personal Care</h2>
          </div>
          <Link href="/store?main_cat=beauty" className="catgrid-view-all">
            View all
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
        <div className="catgrid-tiles catgrid-tiles-beauty">
          {!loaded ? (
            <CatTileSkeleton count={16} />
          ) : beautySubs.map((sub) => {
            const img = beautyImg(sub);
            return (
              <Link key={sub.key} href={sub.href} className="cattile cattile-beauty">
                <div className="cattile-img-wrap">
                  {img
                    ? <img src={optimizeImg(img)!} alt={sub.label} className="cattile-img" loading="lazy" />
                    : <div className="cattile-img-wrap" style={{ background: "#ece9e4", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      </div>
                  }
                </div>
                <div className="cattile-label">{sub.label}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Phones Section ── */}
      <div className="catgrid-section catgrid-section-dark">
        <div className="catgrid-header">
          <div className="catgrid-header-left">
            <span className="catgrid-pill catgrid-pill-blue">Phones</span>
            <h2 className="catgrid-title">Cell Phones &amp; Accessories</h2>
          </div>
          <Link href="/store?main_cat=phones" className="catgrid-view-all">
            View all
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
        <div className="catgrid-tiles catgrid-tiles-phones">
          {!loaded ? (
            <CatTileSkeleton count={7} />
          ) : phoneSubs.map((sub) => {
            const img   = phoneImg(sub);
            const color = PHONE_BRAND_COLORS[sub.key] ?? "#0f3f2f";
            return (
              <Link key={sub.key} href={sub.href} className="cattile cattile-phone">
                <div className="cattile-phone-img-wrap" style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}>
                  {img
                    ? <img src={optimizeImg(img)!} alt={sub.label} className="cattile-img" loading="lazy" />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      </div>
                  }
                  <div className="cattile-phone-accent" style={{ background: color }} />
                </div>
                <div className="cattile-label">{sub.label}</div>
              </Link>
            );
          })}
          {/* Always-present "All Phones" tile */}
          {loaded && (
            <Link href="/store?main_cat=phones" className="cattile cattile-phone">
              <div className="cattile-phone-img-wrap" style={{ background: "linear-gradient(135deg,#0f3f2f18,#0f3f2f08)" }}>
                <img src="https://m.media-amazon.com/images/I/61RyQSOaP9L._AC_SL1500_.jpg" alt="All Phones" className="cattile-img" loading="lazy" />
                <div className="cattile-phone-accent" style={{ background: "#0f3f2f" }} />
              </div>
              <div className="cattile-label">All Phones</div>
            </Link>
          )}
        </div>
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════
   TRUST BAR
══════════════════════════════════════════════ */
function TrustBar() {
  const items = [
    {
      title: "Free Delivery", sub: "Orders over M500",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    },
    {
      title: "Authentic Products", sub: "100% verified",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
    },
    {
      title: "Easy Returns", sub: "7-day hassle-free",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 .7-3.6"/></svg>,
    },
    {
      title: "Secure Payment", sub: "Encrypted checkout",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    },
    {
      title: "Gift Packaging", sub: "Premium wrapping",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
    },
  ];
  return (
    <div className="trust-bar">
      {items.map((item) => (
        <div key={item.title} className="trust-item">
          <div className="trust-icon-wrap">{item.icon}</div>
          <div className="trust-text">
            <div className="trust-title">{item.title}</div>
            <div className="trust-sub">{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MARQUEE
══════════════════════════════════════════════ */
function Marquee() {
  const items = [
    "Free Delivery on Orders over M500", "100% Authentic Products",
    "Secure & Encrypted Checkout", "7-Day Easy Returns",
    "Premium Gift Packaging", "Lesotho's Finest Boutique",
    "New Collections Weekly", "Exclusive Member Rewards",
  ];
  return (
    <div className="marquee-bar">
      <div className="marquee-track">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="marquee-item">
            <svg width="5" height="5" viewBox="0 0 10 10" fill="#c8a75a" stroke="none">
              <polygon points="5 0 6.12 3.38 9.51 3.45 6.97 5.56 7.94 9 5 7.02 2.06 9 3.03 5.56 0.49 3.45 3.88 3.38"/>
            </svg>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
const ROTATE_MS = 6000;

export default function HomePage() {
  const router = useRouter();
  const [pool, setPool]         = useState<HP[]>([]);
  const [offset, setOffset]     = useState(0);
  const [cardsVisible, setCardsVisible] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [heroLoad, setHeroLoad] = useState(true);
  const [secLoad, setSecLoad]   = useState(true);
  const rotateRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch random hero products ── */
  useEffect(() => {
    // Only exclude low-visual accessories — smartphones & beauty products make great hero cards
    const EXCLUDE_KEYWORDS = [
      "charger","cable","power bank","powerbank","adapter","case for","screen protector",
      "sim card","sim tray","stylus","usb hub",
    ];
    function isHeroWorthy(p: HP): boolean {
      if (!resolveImg(p.main_image)) return false;
      const haystack = [p.category, p.title, (p as any).main_category].filter(Boolean).join(" ").toLowerCase();
      return !EXCLUDE_KEYWORDS.some(kw => haystack.includes(kw));
    }
    async function fetchPool() {
      try {
        const res = await fetch(`${API}/api/products/random?count=40&with_images=true&diverse=true`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const filtered = (data.products ?? []).filter(isHeroWorthy);
        setPool(filtered.length >= 5 ? filtered : (data.products ?? []).filter((p: HP) => p.main_image));
      } catch {
        try {
          const res = await fetch(`${API}/api/products?per_page=40&in_stock=true`);
          const data = await res.json();
          const all = (data.results ?? []).filter((p: HP) => p.main_image);
          const filtered = all.filter(isHeroWorthy);
          setPool(shuffle(filtered.length >= 5 ? filtered : all));
        } catch {}
      } finally { setHeroLoad(false); }
    }
    fetchPool();
  }, []);

  /* ── Auto-rotate ── */
  useEffect(() => {
    if (pool.length < 2) return;
    rotateRef.current = setInterval(() => {
      setCardsVisible(false);
      setTimeout(() => {
        setOffset(prev => { const next = prev + 5; return next + 5 > pool.length ? 0 : next; });
        setTimeout(() => setCardsVisible(true), 60);
      }, 450);
    }, ROTATE_MS);
    return () => { if (rotateRef.current) clearInterval(rotateRef.current); };
  }, [pool.length]);

  /* ── Fetch sections ── */
  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? []))
      .catch(() => setSections([]))
      .finally(() => setSecLoad(false));
  }, []);

  const visible   = pool.length > 0 ? pool.slice(offset, Math.min(offset + 5, pool.length)) : [];
  const heroBig   = visible[0] as HP | undefined;
  const heroSmall = visible.slice(1, 5) as HP[];
  const totalDots = Math.min(Math.ceil(pool.length / 5), 12);
  const currentDot = Math.floor(offset / 5);

  return (
    <div className="page-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --primary:#0f3f2f;--primary-dark:#061a10;--primary-light:#1b5e4a;
          --gold:#c8a75a;--gold-light:#d4b976;
          --text:#1a1a1a;--text-muted:#64655e;--text-light:#9e9d97;
          --border:#e5e3de;--bg:#f7f6f3;--white:#ffffff;
          --shadow-sm:0 1px 4px rgba(0,0,0,0.07);
          --shadow-md:0 4px 16px rgba(0,0,0,0.08);
          --shadow-lg:0 8px 32px rgba(0,0,0,0.10);
        }
        ::-webkit-scrollbar{width:4px;height:3px}
        ::-webkit-scrollbar-thumb{background:var(--primary);border-radius:4px}
        ::-webkit-scrollbar-track{background:transparent}
        @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}
        @keyframes goldPulse{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}

        .shimbox{
          background:linear-gradient(90deg,#ebebea 0%,#d9d8d5 50%,#ebebea 100%);
          background-size:200% 100%;animation:shimmer 1.6s ease-in-out infinite;
        }
        .page-root{
          min-height:100vh;background:var(--bg);
          font-family:'DM Sans',system-ui,sans-serif;color:var(--text);
        }

        /* ══════════════════════════════════════════════
           HERO SECTION — Amazon-style full-width
        ══════════════════════════════════════════════ */
        .hero-section{
          display:grid;
          grid-template-columns:340px 1fr;
          background:linear-gradient(155deg,#040d07 0%,#0b2a1f 35%,#071c12 100%);
          position:relative;
          overflow:hidden;
          min-height:460px;
        }
        /* Subtle texture overlay */
        .hero-section::before{
          content:'';position:absolute;inset:0;
          background:
            radial-gradient(ellipse 60% 80% at 20% 60%, rgba(200,167,90,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(15,63,47,0.4) 0%, transparent 55%);
          pointer-events:none;z-index:0;
        }
        /* Gold line divider between brand panel and products */
        .hero-divider{
          position:absolute;left:320px;top:0;bottom:0;
          width:1px;background:linear-gradient(to bottom,transparent,rgba(200,167,90,0.3) 30%,rgba(200,167,90,0.3) 70%,transparent);
          z-index:5;pointer-events:none;
        }

        /* ── BRAND PANEL ── */
        .hero-brand{
          position:relative;z-index:2;
          padding:32px 28px 28px;
          display:flex;flex-direction:column;
          justify-content:space-between;
          gap:24px;
        }
        .hero-brand-top{}
        .hero-eyebrow{
          display:flex;align-items:center;gap:8px;
          font-size:10px;font-weight:600;
          color:rgba(200,167,90,0.7);
          letter-spacing:2px;text-transform:uppercase;
          margin-bottom:14px;
        }
        .hero-eyebrow-line{
          height:1px;width:28px;
          background:linear-gradient(to right,rgba(200,167,90,0.5),transparent);
        }
        .hero-monogram{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(56px,7vw,72px);
          font-weight:600;
          color:transparent;
          -webkit-text-stroke:1.5px rgba(200,167,90,0.5);
          line-height:1;
          letter-spacing:-2px;
          margin-bottom:8px;
          display:block;
          animation:fadeInUp 0.7s ease both;
        }
        .hero-store-name{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(24px,3.5vw,34px);
          font-weight:600;
          color:#fff;
          line-height:1.15;
          letter-spacing:-0.5px;
          margin-bottom:8px;
          animation:fadeInUp 0.7s ease 0.1s both;
        }
        .hero-tagline{
          font-size:12px;
          color:rgba(255,255,255,0.45);
          font-weight:400;
          letter-spacing:0.5px;
          line-height:1.6;
          margin-bottom:0;
          animation:fadeInUp 0.7s ease 0.2s both;
        }
        .hero-location{
          display:inline-flex;align-items:center;gap:6px;
          font-size:10px;font-weight:700;
          color:rgba(200,167,90,0.6);
          letter-spacing:1px;text-transform:uppercase;
          margin-top:8px;
          animation:fadeInUp 0.7s ease 0.25s both;
        }
        /* Gold separator */
        .hero-separator{
          width:40px;height:1px;
          background:linear-gradient(to right,rgba(200,167,90,0.6),transparent);
          margin:16px 0;
          animation:fadeInUp 0.7s ease 0.3s both;
        }
        /* CTA buttons */
        .hero-ctas{
          display:flex;flex-direction:column;gap:10px;
          animation:fadeInUp 0.7s ease 0.35s both;
        }
        .hero-btn-primary{
          display:flex;align-items:center;justify-content:space-between;gap:8px;
          background:var(--gold);color:#fff;
          padding:13px 20px;
          font-size:13px;font-weight:800;
          text-decoration:none;letter-spacing:0.3px;
          transition:all 0.2s ease;
          box-shadow:0 4px 20px rgba(200,167,90,0.35);
        }
        .hero-btn-primary:hover{
          background:#b8973e;transform:translateY(-1px);
          box-shadow:0 6px 28px rgba(200,167,90,0.45);
        }
        .hero-btn-ghost{
          display:flex;align-items:center;justify-content:space-between;gap:8px;
          border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);
          padding:11px 20px;
          font-size:12px;font-weight:600;
          text-decoration:none;letter-spacing:0.3px;
          transition:all 0.2s ease;
        }
        .hero-btn-ghost:hover{
          border-color:rgba(200,167,90,0.4);color:var(--gold);
        }
        /* Quick stats row */
        .hero-stats{
          display:flex;gap:16px;
          padding-top:16px;
          border-top:1px solid rgba(255,255,255,0.06);
          animation:fadeInUp 0.7s ease 0.4s both;
        }
        .hero-stat-item{text-align:center;}
        .hero-stat-num{
          font-family:'Cormorant Garamond',serif;
          font-size:22px;font-weight:700;
          color:var(--gold);line-height:1;
        }
        .hero-stat-lbl{
          font-size:9px;font-weight:600;
          color:rgba(255,255,255,0.3);
          text-transform:uppercase;letter-spacing:0.8px;
          margin-top:2px;
        }
        /* Dots (navigation) */
        .hero-dots-panel{
          display:flex;align-items:center;gap:5px;
          animation:fadeInUp 0.7s ease 0.45s both;
        }
        .hero-dot-btn{
          border:none;cursor:pointer;
          background:rgba(255,255,255,0.18);
          border-radius:2px;height:3px;padding:0;
          transition:all 0.3s ease;
        }
        .hero-dot-btn.active{
          background:var(--gold);
        }

        /* ── PRODUCT MOSAIC ── */
        .hero-mosaic{
          position:relative;z-index:1;
          display:grid;
          grid-template-columns:1.6fr 1fr 1fr;
          grid-template-rows:240px 220px;
          gap:2px;
          background:#000;
          overflow:hidden;
        }
        /* Promotional badge overlay on mosaic */
        .hero-mosaic::after{
          content:'NEW ARRIVALS';
          position:absolute;top:18px;right:18px;
          font-size:9px;font-weight:800;letter-spacing:2px;
          color:#fff;background:rgba(200,167,90,0.9);
          padding:5px 10px;border-radius:2px;
          z-index:10;pointer-events:none;
        }

        /* ── CARD BASE ── */
        .hcard{
          position:relative;overflow:hidden;cursor:pointer;
          background:#1a2e24;width:100%;height:100%;display:block;
        }
        .hcard-large{grid-column:1;grid-row:1 / span 2;}
        .hcard-normal{grid-column:auto;grid-row:auto;}
        .hcard-inner{position:relative;width:100%;height:100%;overflow:hidden;background:#1a2e24;}
        .hcard-img-box{
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          padding:8px;
          transition:transform 0.6s cubic-bezier(0.2,0.8,0.3,1);
        }
        .hcard:hover .hcard-img-box{transform:scale(1.06);}
        .hcard-img{width:100%;height:100%;object-fit:contain;object-position:center;display:block;}
        .hcard-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1a2e24;}
        .hcard-gradient{
          position:absolute;inset:0;
          background:linear-gradient(to top,rgba(4,13,7,0.92) 0%,rgba(4,13,7,0.45) 30%,transparent 55%);
          z-index:2;pointer-events:none;
        }
        .hcard-badges{position:absolute;top:10px;left:10px;z-index:4;}
        .badge-off{
          display:inline-flex;align-items:center;gap:4px;
          background:#c0392b;color:#fff;
          font-size:9px;font-weight:800;
          padding:3px 8px;letter-spacing:0.3px;
        }
        .hcard-info{position:absolute;bottom:0;left:0;right:0;padding:12px 14px;z-index:3;}
        .hcard-cat{
          font-size:8px;font-weight:600;color:rgba(200,167,90,0.6);
          text-transform:uppercase;letter-spacing:1.5px;display:block;margin-bottom:3px;
        }
        .hcard-title{
          font-size:11px;font-weight:600;color:rgba(255,255,255,0.9);
          line-height:1.3;margin-bottom:5px;
          display:-webkit-box;-webkit-line-clamp:2;
          -webkit-box-orient:vertical;overflow:hidden;
        }
        .hcard-large .hcard-title{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(14px,1.8vw,19px);font-weight:600;
          -webkit-line-clamp:3;color:#fff;
        }
        .hcard-price-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
        .hcard-price{font-size:13px;font-weight:800;color:var(--gold);}
        .hcard-large .hcard-price{font-size:16px;}
        .hcard-old{font-size:10px;color:rgba(255,255,255,0.25);text-decoration:line-through;}
        .hcard-star{
          display:inline-flex;align-items:center;gap:3px;
          font-size:10px;color:#f5c842;margin-left:auto;font-weight:600;
        }
        .hcard-cta{
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;gap:7px;
          background:rgba(4,13,7,0.55);
          color:#fff;font-size:12px;font-weight:700;
          letter-spacing:0.5px;
          opacity:0;transition:opacity 0.22s ease;
          z-index:5;backdrop-filter:blur(2px);
        }
        .hcard:hover .hcard-cta{opacity:1;}

        /* ── RESPONSIVE HERO ── */
        @media(max-width:960px){
          .hero-section{grid-template-columns:1fr;}
          .hero-divider{display:none;}
          .hero-brand{
            padding:24px 20px 20px;
            flex-direction:row;flex-wrap:wrap;
            align-items:center;gap:16px;
          }
          .hero-brand-top{flex:1;min-width:200px;}
          .hero-monogram{font-size:42px;margin-bottom:4px;}
          .hero-store-name{font-size:22px;}
          .hero-tagline{display:none;}
          .hero-separator{display:none;}
          .hero-ctas{flex-direction:row;flex-wrap:wrap;}
          .hero-stats{display:none;}
          .hero-mosaic{
            grid-template-columns:1fr 1fr;
            grid-template-rows:220px 170px;
            height:auto;
          }
          .hcard-large{grid-column:span 2;grid-row:1;}
          .catgrid-tiles-beauty{grid-template-columns:repeat(5,1fr);}
          .catgrid-tiles-phones{grid-template-columns:repeat(4,1fr);}
        }
        @media(max-width:640px){
          .hero-section{grid-template-columns:1fr;}
          .hero-brand{padding:20px 16px 16px;}
          .hero-mosaic{
            grid-template-columns:1fr 1fr;
            grid-template-rows:190px 150px 150px;
          }
          .hero-ctas .hero-btn-ghost{display:none;}
          .hero-stats{display:none;}
          .hero-stat-item:nth-child(n+3){display:none;}
          .catgrid-tiles-beauty{grid-template-columns:repeat(4,1fr);}
          .catgrid-tiles-phones{grid-template-columns:repeat(4,1fr);}
          .catgrid-title{font-size:16px;}
        }

        /* ── MARQUEE ── */
        .marquee-bar{background:linear-gradient(90deg,var(--primary),var(--primary-light));overflow:hidden;}
        .marquee-track{display:flex;width:300%;animation:marquee 36s linear infinite;}
        .marquee-item{
          display:inline-flex;align-items:center;gap:9px;
          padding:9px 24px;white-space:nowrap;flex-shrink:0;
          font-size:10px;font-weight:600;letter-spacing:1px;
          text-transform:uppercase;color:rgba(255,255,255,0.9);
        }

        /* ══════════════════════════════════════════════
           CATEGORY IMAGE GRID
        ══════════════════════════════════════════════ */
        .catgrid-wrap{
          background:var(--bg);
        }
        .catgrid-section{
          padding:32px 0;
          border-bottom:1px solid rgba(0,0,0,0.06);
        }
        .catgrid-section-dark{
          background:linear-gradient(180deg,#f9faf8 0%,#f5f7f5 100%);
        }
        .catgrid-header{
          max-width:1400px;margin:0 auto;
          padding:0 clamp(16px,4vw,40px) 20px;
          display:flex;align-items:center;justify-content:space-between;
        }
        .catgrid-header-left{display:flex;align-items:center;gap:12px;}
        .catgrid-pill{
          font-size:10px;font-weight:700;
          letter-spacing:1.5px;text-transform:uppercase;
          color:var(--primary);
          background:rgba(15,63,47,0.08);
          padding:4px 10px;border-radius:30px;white-space:nowrap;
        }
        .catgrid-pill-blue{color:#1428A0;background:rgba(20,40,160,0.08);}
        .catgrid-title{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(18px,2.5vw,26px);font-weight:700;
          color:var(--text);letter-spacing:-0.3px;margin:0;line-height:1;
        }
        .catgrid-view-all{
          display:flex;align-items:center;gap:5px;
          font-size:13px;font-weight:600;color:var(--primary);text-decoration:none;
          border:1px solid rgba(15,63,47,0.2);padding:7px 14px;border-radius:20px;
          transition:all 0.2s ease;white-space:nowrap;
        }
        .catgrid-view-all:hover{background:var(--primary);color:#fff;border-color:var(--primary);}
        .catgrid-tiles{
          max-width:1400px;margin:0 auto;
          padding:0 clamp(16px,4vw,40px);
          display:grid;gap:12px;
        }
        .catgrid-tiles-beauty{grid-template-columns:repeat(8,1fr);}
        .catgrid-tiles-phones{grid-template-columns:repeat(8,1fr);}

        .cattile{
          text-decoration:none;
          display:flex;flex-direction:column;align-items:center;gap:8px;
          transition:transform 0.25s ease;
        }
        .cattile:hover{transform:translateY(-3px);}
        .cattile-label{
          font-size:12px;font-weight:600;color:var(--text);
          text-align:center;line-height:1.3;
        }
        .cattile-beauty .cattile-img-wrap{
          width:100%;aspect-ratio:1;background:#fff;border-radius:50%;overflow:hidden;
          border:2px solid var(--border);
          box-shadow:0 2px 8px rgba(0,0,0,0.06);
          transition:border-color 0.25s ease,box-shadow 0.25s ease;
          display:flex;align-items:center;justify-content:center;padding:6px;
        }
        .cattile-beauty:hover .cattile-img-wrap{
          border-color:rgba(200,167,90,0.5);
          box-shadow:0 6px 20px rgba(200,167,90,0.2);
        }
        .cattile-img{width:100%;height:100%;object-fit:contain;display:block;}
        .cattile-phone .cattile-phone-img-wrap{
          width:100%;aspect-ratio:3/4;border-radius:12px;overflow:hidden;
          border:1px solid var(--border);
          box-shadow:0 2px 8px rgba(0,0,0,0.06);
          transition:box-shadow 0.25s ease,transform 0.25s ease;
          position:relative;display:flex;align-items:center;justify-content:center;
          padding:8px;background:#fff;
        }
        .cattile-phone:hover .cattile-phone-img-wrap{
          box-shadow:0 8px 24px rgba(0,0,0,0.12);
        }
        .cattile-phone-accent{
          position:absolute;bottom:0;left:0;right:0;height:3px;opacity:0.7;
        }

        /* ── TRUST BAR ── */
        .trust-bar{
          background:var(--white);
          border-top:1px solid var(--border);border-bottom:3px solid var(--border);
          display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        }
        .trust-item{
          display:flex;align-items:center;gap:12px;
          padding:18px 20px;border-right:1px solid var(--border);
        }
        .trust-item:last-child{border-right:none;}
        .trust-icon-wrap{color:var(--primary);flex-shrink:0;}
        .trust-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:1px;}
        .trust-sub{font-size:11px;color:var(--text-muted);}

        /* ── CATEGORY STRIP ── */
        .cat-strip{background:var(--white);border-bottom:1px solid var(--border);overflow-x:auto;padding:0 clamp(12px,3vw,40px);}
        .cat-strip::-webkit-scrollbar{height:0;}
        .cat-strip-inner{display:flex;gap:6px;padding:12px 0;white-space:nowrap;align-items:center;}
        .cat-pill{
          display:inline-flex;align-items:center;gap:5px;
          padding:7px 16px;border:1px solid var(--border);background:var(--white);
          font-size:12px;font-weight:500;color:var(--text-muted);text-decoration:none;flex-shrink:0;
          transition:all 0.18s ease;letter-spacing:0.1px;
        }
        .cat-pill:hover{border-color:var(--primary);color:var(--primary);background:#f0f7f4;}

        /* ── SECTIONS ── */
        .sections-wrap{padding-bottom:clamp(32px,5vw,64px);}
        .section-block{background:var(--white);margin-bottom:6px;}
        .section-head{
          display:flex;align-items:center;justify-content:space-between;
          padding:18px clamp(16px,3vw,28px) 14px;border-bottom:1px solid var(--border);
        }
        .section-head-left{display:flex;align-items:center;gap:14px;}
        .section-accent-bar{width:4px;height:42px;border-radius:2px;flex-shrink:0;}
        .section-badge{
          display:inline-block;font-size:8px;font-weight:800;
          padding:3px 9px;color:#fff;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;
        }
        .section-title{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(18px,2.5vw,24px);font-weight:600;
          color:var(--text);letter-spacing:-0.3px;line-height:1.2;
        }
        .section-sub{font-size:11px;color:var(--text-muted);margin-top:2px;}
        .view-all-link{
          display:inline-flex;align-items:center;gap:6px;
          font-size:12px;font-weight:700;text-decoration:none;
          padding:8px 18px;border:1.5px solid;
          transition:all 0.18s ease;white-space:nowrap;
          letter-spacing:0.3px;text-transform:uppercase;
        }
        .view-all-link:hover{color:#fff !important;background:currentColor;}
        .section-scroll-wrap{position:relative;}
        .section-scroll{
          display:flex;gap:2px;overflow-x:auto;
          padding:12px clamp(16px,3vw,28px);
          scroll-behavior:smooth;background:var(--bg);
        }
        .section-scroll::-webkit-scrollbar{height:0;}
        .scroll-btn{
          position:absolute;top:50%;transform:translateY(-50%);
          width:32px;height:52px;background:var(--white);border:1px solid var(--border);
          box-shadow:var(--shadow-md);display:flex;align-items:center;justify-content:center;
          cursor:pointer;z-index:10;color:var(--text-muted);transition:all 0.18s ease;
        }
        .scroll-btn:hover{background:var(--primary);color:#fff;border-color:var(--primary);}
        .scroll-btn-l{left:0;}.scroll-btn-r{right:0;}

        /* ── SECTION CARDS ── */
        .scard{
          width:190px;flex-shrink:0;background:var(--white);cursor:pointer;
          border:1px solid transparent;transition:all 0.22s ease;
          animation:scaleIn 0.45s ease both;position:relative;
        }
        .scard:hover{border-color:rgba(15,63,47,0.25);box-shadow:0 6px 24px rgba(15,63,47,0.10);z-index:2;transform:translateY(-2px);}
        .scard-img-wrap{position:relative;height:190px;background:#f4f3f0;overflow:hidden;}
        .scard-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.45s ease;}
        .scard:hover .scard-img{transform:scale(1.07);}
        .scard-no-img{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#ece9e4;}
        .scard-badge{position:absolute;top:8px;left:8px;font-size:9px;font-weight:800;color:#fff;padding:2px 8px;z-index:3;letter-spacing:0.3px;}
        .scard-soldout{position:absolute;top:8px;right:8px;font-size:9px;font-weight:600;background:rgba(0,0,0,0.6);color:#fff;padding:2px 7px;z-index:3;}
        .scard-hover-overlay{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12px;z-index:4;opacity:0;transition:opacity 0.22s ease;}
        .scard:hover .scard-hover-overlay{opacity:1;}
        .scard-view-btn{display:inline-flex;align-items:center;gap:6px;color:#fff;font-size:10px;font-weight:700;padding:7px 16px;letter-spacing:0.4px;text-transform:uppercase;transform:translateY(6px);transition:transform 0.22s ease;}
        .scard:hover .scard-view-btn{transform:translateY(0);}
        .scard-info{padding:10px 12px 14px;}
        .scard-brand{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:4px;}
        .scard-title{font-size:12px;color:var(--text);line-height:1.4;margin-bottom:8px;font-weight:400;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:33px;}
        .scard-footer{display:flex;align-items:flex-end;justify-content:space-between;gap:6px;}
        .scard-prices{display:flex;flex-direction:column;gap:1px;}
        .scard-price{font-size:14px;font-weight:800;color:var(--text);}
        .scard-compare{font-size:10px;color:var(--text-light);text-decoration:line-through;}
        .scard-rating{display:flex;gap:1px;align-items:center;}
        .see-more-card{width:140px;flex-shrink:0;background:var(--white);border:2px dashed #d6d4cf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-decoration:none;padding:24px 16px;transition:all 0.2s ease;cursor:pointer;}
        .see-more-card:hover{background:var(--bg);}
        .see-more-circle{width:44px;height:44px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;}
        .see-more-label{font-size:10px;font-weight:700;text-align:center;line-height:1.5;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);}
        .empty-sections{text-align:center;padding:80px 20px;background:var(--white);margin:6px 0;}
        .empty-sections p{font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--text-muted);}
      `}</style>

      {/* ══════════════════════════════════════════════
          HERO SECTION — Brand Panel + Product Mosaic
      ══════════════════════════════════════════════ */}
      <div className="hero-section">
        {/* Gold divider line */}
        <div className="hero-divider" />

        {/* LEFT: Brand Identity Panel */}
        <div className="hero-brand">
          <div className="hero-brand-top">
            {/* Eyebrow */}
            <div className="hero-eyebrow">
              <div className="hero-eyebrow-line" />
              Est. Lesotho
              <div className="hero-eyebrow-line" />
            </div>

            {/* Large K monogram */}
            <span className="hero-monogram">K</span>

            {/* Store name */}
            <div className="hero-store-name">
              Karabo&apos;s<br/>Store
            </div>

            {/* Tagline */}
            <div className="hero-tagline">
              Premium fashion &amp; beauty,<br/>
              curated for elegance &amp; confidence.
            </div>

            {/* Location */}
            <div className="hero-location">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              Lesotho
            </div>

            {/* Gold separator */}
            <div className="hero-separator" />
          </div>

          {/* CTA Buttons */}
          <div>
            <div className="hero-ctas">
              <Link href="/store" className="hero-btn-primary">
                <span>Shop Collection</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link href="/store?sort=discount" className="hero-btn-ghost">
                <span>View Deals</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </Link>
            </div>

            {/* Stats */}
            {!heroLoad && pool.length > 0 && (
              <div className="hero-stats">
                <div className="hero-stat-item">
                  <div className="hero-stat-num">{pool.length}+</div>
                  <div className="hero-stat-lbl">Products</div>
                </div>
                <div className="hero-stat-item">
                  <div className="hero-stat-num">100%</div>
                  <div className="hero-stat-lbl">Authentic</div>
                </div>
                <div className="hero-stat-item">
                  <div className="hero-stat-num">M500+</div>
                  <div className="hero-stat-lbl">Free Ship</div>
                </div>
              </div>
            )}

            {/* Rotation dots */}
            {!heroLoad && pool.length >= 5 && (
              <div className="hero-dots-panel" style={{ marginTop: 16 }}>
                {Array.from({ length: totalDots }).map((_, i) => (
                  <button
                    key={i}
                    className={`hero-dot-btn ${i === currentDot ? "active" : ""}`}
                    style={{ width: i === currentDot ? 22 : 7 }}
                    onClick={() => {
                      setCardsVisible(false);
                      setTimeout(() => {
                        setOffset(i * 5);
                        setTimeout(() => setCardsVisible(true), 60);
                      }, 400);
                    }}
                    aria-label={`Group ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Product Mosaic */}
        <div className="hero-mosaic">
          {heroLoad ? (
            <HeroSkeleton />
          ) : visible.length >= 1 ? (
            <>
              <HeroCard p={heroBig!} size="large" index={0} visible={cardsVisible}
                onClick={() => router.push(`/store/product/${heroBig!.id}`)} />
              {heroSmall.map((p, i) => (
                <HeroCard key={p.id} p={p} size="normal" index={i + 1} visible={cardsVisible}
                  onClick={() => router.push(`/store/product/${p.id}`)} />
              ))}
            </>
          ) : pool.length > 0 && pool.length < 5 ? (
            pool.map((p, i) => (
              <HeroCard key={p.id} p={p} size={i === 0 ? "large" : "normal"} index={i} visible={cardsVisible}
                onClick={() => router.push(`/store/product/${p.id}`)} />
            ))
          ) : (
            <HeroSkeleton />
          )}
        </div>
      </div>

      {/* MARQUEE */}
      <Marquee />

      {/* TRUST BAR */}
      <TrustBar />

      {/* CATEGORY IMAGE GRID */}
      <CategoryImageGrid />

      {/* SECTIONS */}
      <div className="sections-wrap">
        {secLoad ? (
          <><SkeletonSection /><SkeletonSection /><SkeletonSection /></>
        ) : sections.length === 0 ? (
          <div className="empty-sections">
            <p>Add products to your store — sections will appear automatically.</p>
          </div>
        ) : (
          sections.map(sec => (
            <SectionRow key={sec.key} sec={sec} onProductClick={id => router.push(`/store/product/${id}`)} />
          ))
        )}
      </div>
    </div>
  );
}