"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/* ================================================================
   IMAGE UTILS
================================================================ */
function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
}

function optimizeImg(url: string | null | undefined): string | null {
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

/* ================================================================
   TYPES
================================================================ */
interface ProductListItem {
  id: string;
  title: string;
  price: number;
  compare_price?: number | null;
  discount_pct?: number | null;
  brand?: string | null;
  category?: string | null;
  rating?: number | null;
  rating_number?: number | null;
  stock?: number;
  in_stock: boolean;
  main_image?: string | null;
  image_url?: string | null;
  sales?: number | null;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

type SortOption = "newest" | "price_asc" | "price_desc" | "rating" | "popular" | "discount";
type ViewMode = "grid" | "list";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest First",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  rating: "Top Rated",
  popular: "Best Sellers",
  discount: "Biggest Discount",
};

const SORT_API_MAP: Record<SortOption, string> = {
  newest: "newest",
  price_asc: "price_asc",
  price_desc: "price_desc",
  rating: "rating",
  popular: "sales",
  discount: "discount",
};

const PAGE_SIZE = 24;

/*
 * QUICK FILTERS — these use `sort=` or `category=` params that actually exist in your DB.
 * No tag= filters here since tags column is empty for most products.
 * Category slugs must match exactly what's in your products.category column.
 */
const QUICK_FILTERS = [
  { label: "All Products",         q: "" },
  { label: "Best Sellers",         q: "sort=popular" },
  { label: "Flash Deals",          q: "sort=discount" },
  { label: "New Arrivals",         q: "sort=newest" },
  { label: "🌿 Anti-Aging",        q: "category=anti_aging" },
  { label: "🎯 Acne Care",         q: "category=acne" },
  { label: "✨ Brightening",       q: "category=brightening" },
  { label: "🌟 Whitening",         q: "category=whitening" },
  { label: "💧 Hydration",         q: "category=hydration" },
  { label: "🔧 Repair",            q: "category=repair" },
  { label: "🛡️ Skin Barrier",      q: "category=barrier" },
  { label: "🌱 Eczema Relief",     q: "category=eczema" },
  { label: "🌸 Rosacea",           q: "category=rosacea" },
  { label: "⚡ Scar & Spots",      q: "category=scar" },
  { label: "💪 Stretch Marks",     q: "category=stretch_mark" },
  { label: "☀️ Sunscreen",         q: "category=sunscreen" },
  { label: "🫒 Oils",              q: "category=oils" },
  { label: "🧼 Soaps",             q: "category=soaps" },
  { label: "🛁 Body Care",         q: "category=body" },
  { label: "🎭 Masks",             q: "category=masks" },
  { label: "🔬 Exfoliation",       q: "category=exfoliation" },
  { label: "⚗️ Clinical Acids",    q: "category=clinical_acids" },
  { label: "🌍 African Ingredients", q: "category=african_ingredients" },
  { label: "🌸 Korean Ingredients", q: "category=korean_ingredients" },
  { label: "In Stock Only",        q: "in_stock=true" },
];

const PRICE_PRESETS: [string, string, string][] = [
  ["Under M500", "", "500"],
  ["M500–1000", "500", "1000"],
  ["M1k–3k", "1000", "3000"],
  ["M3k+", "3000", ""],
];

/* ================================================================
   GLOBAL STYLES
================================================================ */
const GLOBAL_CSS = `
  :root {
    --primary: #0f3f2f;
    --primary-dark: #0a2518;
    --accent: #c8a75a;
    --red: #c0392b;
    --gray-50: #f8fafc;
    --gray-100: #f1f5f9;
    --gray-200: #e2e8f0;
    --gray-300: #cbd5e1;
    --gray-400: #94a3b8;
    --gray-500: #64748b;
    --gray-600: #475569;
    --gray-700: #334155;
    --gray-800: #1e293b;
    --gray-900: #0f172a;
    --radius: 10px;
    --radius-sm: 6px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
    --shadow: 0 4px 16px rgba(0,0,0,0.1);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.14);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .shimmer {
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes pulseDot { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--gray-300); border-radius: 4px; }
  .store-card:hover .card-overlay { opacity: 1 !important; }
  @media (max-width: 1024px) {
    .sidebar-desktop { display: none !important; }
    .mob-filter-btn { display: flex !important; }
  }
  @media (max-width: 768px) {
    .sort-label { display: none !important; }
    .toolbar-wrap { flex-wrap: wrap; }
  }
`;

/* ================================================================
   STARS
================================================================ */
function Stars({ rating, count }: { rating: number; count?: number | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = rating >= i ? "#f59e0b" : rating >= i - 0.5 ? "url(#half)" : "#e2e8f0";
        return (
          <svg key={i} width="11" height="11" viewBox="0 0 24 24">
            <defs>
              <linearGradient id="half"><stop offset="50%" stopColor="#f59e0b" /><stop offset="50%" stopColor="#e2e8f0" /></linearGradient>
            </defs>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={fill} stroke="none" />
          </svg>
        );
      })}
      {count != null && count > 0 && (
        <span style={{ fontSize: 10, color: "var(--gray-500)", marginLeft: 2 }}>
          ({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})
        </span>
      )}
    </div>
  );
}

function getDiscount(p: ProductListItem) {
  if (p.discount_pct && p.discount_pct >= 1) return Math.round(p.discount_pct);
  if (p.compare_price && p.compare_price > p.price)
    return Math.round(((p.compare_price - p.price) / p.compare_price) * 100);
  return null;
}

/* ================================================================
   PRODUCT CARD — GRID (Jumia-style)
================================================================ */
function ProductCardGrid({ product, onNavigate }: { product: ProductListItem; onNavigate: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const imgSrc = optimizeImg(resolveImg(product.main_image ?? product.image_url));
  const discount = getDiscount(product);

  return (
    <div
      className="store-card"
      onClick={onNavigate}
      style={{
        background: "white",
        borderRadius: "var(--radius)",
        border: "1px solid var(--gray-200)",
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "var(--shadow-lg)"; el.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
    >
      {/* Image */}
      <div style={{ position: "relative", background: "#fff", overflow: "hidden" }}>
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={product.title}
            onError={() => setImgErr(true)}
            style={{ width: "100%", aspectRatio: "1/1", objectFit: "contain", display: "block", padding: "10px" }}
            loading="lazy"
          />
        ) : (
          <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Discount badge */}
        {discount != null && discount >= 5 && (
          <span style={{ position: "absolute", top: 8, left: 8, background: "var(--red)", color: "white", fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 4 }}>
            -{discount}%
          </span>
        )}
        {!product.in_stock && (
          <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.65)", color: "white", fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 4 }}>
            OUT OF STOCK
          </span>
        )}

        {/* Hover overlay */}
        <div
          className="card-overlay"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15,63,47,0.9)", color: "white", fontSize: 12, fontWeight: 700, textAlign: "center", padding: "9px", opacity: 0, transition: "opacity 0.2s" }}
        >
          View Details
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {product.brand && (
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--primary)" }}>
            {product.brand}
          </span>
        )}
        <div style={{ fontSize: 13, color: "var(--gray-800)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
          {product.title}
        </div>
        {product.rating != null && product.rating > 0 && (
          <Stars rating={product.rating} count={product.rating_number} />
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "var(--gray-900)" }}>
            {formatCurrency(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span style={{ fontSize: 11, color: "var(--gray-400)", textDecoration: "line-through" }}>
              {formatCurrency(product.compare_price)}
            </span>
          )}
        </div>
        {product.in_stock && (
          <button
            onClick={e => e.stopPropagation()}
            style={{ marginTop: 6, width: "100%", padding: "9px", background: "var(--primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary-dark)")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary)")}
          >
            Add to Cart
          </button>
        )}
        {!product.in_stock && (
          <div style={{ fontSize: 10, color: "var(--gray-400)", marginTop: 4 }}>Out of stock</div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   PRODUCT CARD — LIST
================================================================ */
function ProductCardList({ product, onNavigate }: { product: ProductListItem; onNavigate: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const imgSrc = optimizeImg(resolveImg(product.main_image ?? product.image_url));
  const discount = getDiscount(product);

  return (
    <div
      onClick={onNavigate}
      style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", overflow: "hidden", cursor: "pointer", display: "flex", transition: "box-shadow 0.2s" }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)")}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
    >
      <div style={{ width: 180, height: 180, flexShrink: 0, position: "relative", background: "#fff" }}>
        {imgSrc && !imgErr ? (
          <img src={imgSrc} alt={product.title} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} loading="lazy" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
          </div>
        )}
        {discount != null && discount >= 5 && (
          <span style={{ position: "absolute", top: 8, left: 8, background: "var(--red)", color: "white", fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 4 }}>-{discount}%</span>
        )}
      </div>
      <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        {product.brand && <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--primary)" }}>{product.brand}</span>}
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-900)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.title}</div>
        {product.rating != null && product.rating > 0 && <Stars rating={product.rating} count={product.rating_number} />}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: "auto" }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "var(--gray-900)" }}>{formatCurrency(product.price)}</span>
          {product.compare_price && product.compare_price > product.price && (
            <span style={{ fontSize: 12, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(product.compare_price)}</span>
          )}
          {discount != null && discount >= 5 && (
            <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, marginLeft: 4 }}>-{discount}%</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {product.in_stock ? (
            <>
              <button onClick={e => e.stopPropagation()} style={{ background: "var(--primary)", color: "white", border: "none", padding: "10px 20px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Add to Cart
              </button>
              <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, alignSelf: "center" }}>In Stock</span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 600 }}>Out of Stock</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SKELETONS
================================================================ */
function SkeletonGrid() {
  return (
    <div style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div className="shimmer" style={{ paddingTop: "100%" }} />
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="shimmer" style={{ height: 9, width: "35%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, width: "90%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, width: "65%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 16, width: "45%", borderRadius: 4, marginTop: 4 }} />
      </div>
    </div>
  );
}

/* ================================================================
   FILTER SECTION
================================================================ */
function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--gray-100)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gray-900)", textTransform: "uppercase", letterSpacing: 0.7 }}>{title}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div style={{ padding: "0 16px 12px" }}>{children}</div>}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(15,63,47,0.07)", border: "1px solid rgba(15,63,47,0.18)", color: "var(--primary)", fontSize: 12, fontWeight: 600, padding: "5px 10px 5px 12px", borderRadius: 20 }}>
      {label}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", opacity: 0.6 }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}

/* ================================================================
   EMPTY STATE
================================================================ */
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "80px 40px", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, background: "var(--gray-100)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-900)", marginBottom: 8 }}>No products found</h3>
      <p style={{ fontSize: 14, color: "var(--gray-500)", marginBottom: 24 }}>Try adjusting your filters or browse all products.</p>
      <button onClick={onClear} style={{ background: "var(--primary)", color: "white", border: "none", padding: "12px 32px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
        Browse All Products
      </button>
    </div>
  );
}

/* ================================================================
   PAGINATION
================================================================ */
function Pagination({ page, totalPages, onPage, total, showing }: { page: number; totalPages: number; onPage: (p: number) => void; total: number; showing: number }) {
  const pages = useMemo(() => {
    const arr: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push("...");
      for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) arr.push(i);
      if (page < totalPages - 2) arr.push("...");
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 40 }}>
      <p style={{ fontSize: 13, color: "var(--gray-500)" }}>
        Showing <strong style={{ color: "var(--gray-900)" }}>{showing.toLocaleString()}</strong> of <strong style={{ color: "var(--gray-900)" }}>{total.toLocaleString()}</strong> products
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", background: page <= 1 ? "var(--gray-100)" : "white", color: page <= 1 ? "var(--gray-300)" : "var(--gray-700)", fontSize: 18, cursor: page <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>‹</button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`d-${i}`} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray-400)" }}>…</span>
          ) : (
            <button key={p} onClick={() => onPage(p as number)} style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", border: p === page ? "none" : "1px solid var(--gray-200)", background: p === page ? "var(--primary)" : "white", color: p === page ? "white" : "var(--gray-700)", fontWeight: p === page ? 800 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {p}
            </button>
          )
        )}
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", background: page >= totalPages ? "var(--gray-100)" : "white", color: page >= totalPages ? "var(--gray-300)" : "var(--gray-700)", fontSize: 18, cursor: page >= totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>›</button>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN STORE CLIENT
================================================================ */
export default function StoreClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* Filter state */
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const [searchQuery, setSearchQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<SortOption>((params.get("sort") as SortOption) ?? "newest");
  const [selectedCategory, setSelectedCategory] = useState(params.get("category") ?? "");
  const [selectedBrand, setSelectedBrand] = useState(params.get("brand") ?? "");
  const [priceMin, setPriceMin] = useState(params.get("min_price") ?? "");
  const [priceMax, setPriceMax] = useState(params.get("max_price") ?? "");
  const [inStockOnly, setInStockOnly] = useState(params.get("in_stock") === "true");
  const [minRating, setMinRating] = useState(params.get("min_rating") ?? "");

  /* UI state */
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeQuick, setActiveQuick] = useState("");
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  /* Sidebar data */
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  /* Sync state from URL changes (e.g. when homepage links navigate here) */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSearchInput(params.get("q") ?? "");
    setSearchQuery(params.get("q") ?? "");
    setSort((params.get("sort") as SortOption) ?? "newest");
    setSelectedCategory(params.get("category") ?? "");
    setSelectedBrand(params.get("brand") ?? "");
    setPriceMin(params.get("min_price") ?? "");
    setPriceMax(params.get("max_price") ?? "");
    setInStockOnly(params.get("in_stock") === "true");
    setMinRating(params.get("min_rating") ?? "");
    setActiveQuick("");
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const hasFilters = !!(searchQuery || selectedCategory || selectedBrand || priceMin || priceMax || inStockOnly || minRating);

  const clearAll = useCallback(() => {
    setSearchQuery(""); setSearchInput(""); setSelectedCategory("");
    setSelectedBrand(""); setPriceMin(""); setPriceMax("");
    setInStockOnly(false); setMinRating(""); setActiveQuick(""); setSort("newest");
  }, []);

  /* Load sidebar metadata */
  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data)) setCategories(data.filter(c => c.product_count > 0).slice(0, 40));
      })
      .catch(() => {});
    fetch(`${API}/api/brands`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data)) setBrands(data.filter(b => b.product_count > 0).slice(0, 30));
      })
      .catch(() => {});
  }, []);

  /* ── Fetch products — always uses /api/products with category= param ── */
  const loadProducts = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        sort: SORT_API_MAP[sort],
        page: String(pg),
        per_page: String(PAGE_SIZE),
      });
      if (searchQuery) qs.set("q", searchQuery);
      if (selectedCategory) qs.set("category", selectedCategory);
      if (selectedBrand) qs.set("brand", selectedBrand);
      if (priceMin) qs.set("min_price", priceMin);
      if (priceMax) qs.set("max_price", priceMax);
      if (inStockOnly) qs.set("in_stock", "true");
      if (minRating) qs.set("min_rating", minRating);

      const res = await fetch(`${API}/api/products?${qs}`);
      const data = res.ok ? await res.json() : { total: 0, results: [] };
      setProducts(data.results ?? []);
      setTotal(data.total ?? 0);
      setPage(pg);
    } catch (err) {
      console.error("StoreClient error:", err);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [sort, searchQuery, selectedCategory, selectedBrand, priceMin, priceMax, inStockOnly, minRating]);

  useEffect(() => { loadProducts(1); }, [loadProducts]);

  const handleQuick = (q: string) => {
    setActiveQuick(q);
    setSort("newest");
    setSelectedCategory(""); setSelectedBrand("");
    setPriceMin(""); setPriceMax(""); setInStockOnly(false); setMinRating("");
    setSearchQuery(""); setSearchInput("");
    if (!q) return;
    const p = new URLSearchParams(q);
    const sv = p.get("sort");
    const cv = p.get("category");
    const is = p.get("in_stock");
    if (sv) setSort(sv as SortOption);
    if (cv) setSelectedCategory(cv);
    if (is === "true") setInStockOnly(true);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(searchInput.trim());
    setActiveQuick("");
  };

  /* ── FILTER PANEL ── */
  const FilterPanel = useCallback(() => (
    <div>
      {/* Categories — from real DB */}
      {categories.length > 0 && (
        <FilterSection title="Category" defaultOpen={true}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 260, overflowY: "auto" }}>
            {categories.map(c => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === c.slug}
                    onChange={() => setSelectedCategory(selectedCategory === c.slug ? "" : c.slug)}
                    style={{ accentColor: "var(--primary)", cursor: "pointer", width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 13, color: selectedCategory === c.slug ? "var(--primary)" : "var(--gray-700)", fontWeight: selectedCategory === c.slug ? 700 : 400 }}>
                    {c.name}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "var(--gray-400)", background: "var(--gray-100)", padding: "1px 6px", borderRadius: 10 }}>{c.product_count}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Price range */}
      <FilterSection title="Price Range">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {([["Min (M)", priceMin, setPriceMin, "0"], ["Max (M)", priceMax, setPriceMax, "Any"]] as any[]).map(([label, val, setter, ph]: any) => (
              <div key={label} style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: "var(--gray-500)", marginBottom: 4, display: "block", fontWeight: 600 }}>{label}</label>
                <input
                  type="number"
                  value={val}
                  onChange={e => setter(e.target.value)}
                  placeholder={ph}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--gray-200)")}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRICE_PRESETS.map(([label, min, max]) => {
              const active = priceMin === min && priceMax === max;
              return (
                <button key={label} onClick={() => { setPriceMin(min); setPriceMax(max); }} style={{ fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 20, border: `1px solid ${active ? "var(--primary)" : "var(--gray-200)"}`, background: active ? "var(--primary)" : "transparent", color: active ? "white" : "var(--gray-700)", cursor: "pointer", fontFamily: "inherit" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Customer Rating">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["4", "3", "2", ""].map(r => (
            <label key={r || "all"} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
              <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} style={{ accentColor: "var(--primary)", cursor: "pointer", width: 14, height: 14 }} />
              {r ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Stars rating={Number(r)} />
                  <span style={{ fontSize: 12, color: "var(--gray-600)" }}>& up</span>
                </div>
              ) : <span style={{ fontSize: 13, color: "var(--gray-600)" }}>All ratings</span>}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability">
        <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
          <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} style={{ accentColor: "var(--primary)", cursor: "pointer", width: 15, height: 15 }} />
          <span style={{ fontSize: 13, color: "var(--gray-700)", fontWeight: inStockOnly ? 700 : 400 }}>In Stock Only</span>
        </label>
      </FilterSection>

      {/* Brands — from real DB */}
      {brands.length > 0 && (
        <FilterSection title="Brand" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
            {brands.map(b => (
              <label key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="radio" name="brand" checked={selectedBrand === b.name} onChange={() => setSelectedBrand(selectedBrand === b.name ? "" : b.name)} style={{ accentColor: "var(--primary)", cursor: "pointer", width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: selectedBrand === b.name ? "var(--primary)" : "var(--gray-700)", fontWeight: selectedBrand === b.name ? 700 : 400 }}>{b.name}</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--gray-400)", background: "var(--gray-100)", padding: "1px 6px", borderRadius: 10 }}>{b.product_count}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Sort */}
      <FilterSection title="Sort By" defaultOpen={false}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
            <label key={v} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
              <input type="radio" name="sort_panel" checked={sort === v} onChange={() => setSort(v)} style={{ accentColor: "var(--primary)", cursor: "pointer", width: 14, height: 14 }} />
              <span style={{ fontSize: 13, color: sort === v ? "var(--primary)" : "var(--gray-700)", fontWeight: sort === v ? 700 : 400 }}>{l}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  ), [selectedCategory, selectedBrand, priceMin, priceMax, inStockOnly, minRating, sort, categories, brands]);

  /* ── RENDER ── */
  return (
    <div style={{ background: "var(--gray-50)", minHeight: "100vh" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══ SEARCH + SORT TOOLBAR ══ */}
      <div style={{ background: "var(--primary)", padding: "12px 0", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(12px,3vw,40px)", display: "flex", alignItems: "center", gap: 10 }} className="toolbar-wrap">
          {/* Logo */}
          <Link href="/" style={{ flexShrink: 0, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: "white", letterSpacing: -0.5 }}>Karabo</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", background: "white", borderRadius: 8, overflow: "hidden", maxWidth: 680, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{ background: "var(--gray-100)", border: "none", borderRight: "1px solid var(--gray-200)", padding: "0 10px", fontSize: 12, color: "var(--gray-700)", fontFamily: "inherit", cursor: "pointer", outline: "none", minWidth: 80 }}
            >
              <option value="">All</option>
              {categories.map(c => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products, brands, ingredients..."
              style={{ flex: 1, padding: "12px 14px", border: "none", fontSize: 14, fontFamily: "inherit", outline: "none", color: "var(--gray-900)", minWidth: 0 }}
            />
            <button type="submit" style={{ background: "var(--accent)", border: "none", padding: "0 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            </button>
          </form>

          {/* Sort */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="sort-label" style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>Sort by:</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortOption)} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "8px 10px", borderRadius: "var(--radius-sm)", fontSize: 12, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
                <option key={v} value={v} style={{ background: "var(--primary)", color: "white" }}>{l}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", padding: 2, flexShrink: 0 }}>
            {(["grid", "list"] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ width: 34, height: 34, borderRadius: 6, border: "none", background: viewMode === m ? "white" : "transparent", color: viewMode === m ? "var(--primary)" : "rgba(255,255,255,0.65)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m === "grid" ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ QUICK FILTER TABS ══ */}
      <div style={{ background: "white", borderBottom: "1px solid var(--gray-200)", overflowX: "auto", scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(12px,3vw,40px)", display: "flex" }}>
          {QUICK_FILTERS.map(qf => (
            <button
              key={qf.q || "all"}
              onClick={() => handleQuick(qf.q)}
              style={{ padding: "12px 14px", border: "none", background: "none", borderBottom: activeQuick === qf.q ? "2.5px solid var(--primary)" : "2.5px solid transparent", color: activeQuick === qf.q ? "var(--primary)" : "var(--gray-600)", fontWeight: activeQuick === qf.q ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s", marginBottom: -1 }}
            >
              {qf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ BREADCRUMBS ══ */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "8px clamp(12px,3vw,40px)" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--gray-400)" }}>
          <Link href="/" style={{ color: "var(--gray-400)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/store" style={{ color: "var(--gray-400)", textDecoration: "none" }}>Store</Link>
          {selectedCategory && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{categories.find(c => c.slug === selectedCategory)?.name ?? selectedCategory}</span></>}
          {searchQuery && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>"{searchQuery}"</span></>}
        </nav>
      </div>

      {/* ══ MAIN LAYOUT ══ */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(12px,3vw,40px) 80px", display: "flex", gap: 18, alignItems: "flex-start" }}>

        {/* DESKTOP SIDEBAR */}
        <aside className="sidebar-desktop" style={{ width: 240, flexShrink: 0, background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", overflow: "hidden", position: "sticky", top: 72, maxHeight: "calc(100vh - 90px)", overflowY: "auto" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--gray-50)", position: "sticky", top: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-900)", textTransform: "uppercase", letterSpacing: 0.7 }}>Filters</span>
            </div>
            {hasFilters && (
              <button onClick={clearAll} style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", background: "none", border: "1px solid var(--red)", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                Clear All
              </button>
            )}
          </div>
          <FilterPanel />
        </aside>

        {/* PRODUCTS AREA */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Controls bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 10, flexWrap: "wrap" }}>
            {/* Mobile filter button */}
            <button
              className="mob-filter-btn"
              onClick={() => setShowMobileFilter(true)}
              style={{ display: "none", alignItems: "center", gap: 6, background: "var(--primary)", color: "white", border: "none", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
              Filters
              {hasFilters && <span style={{ background: "var(--red)", color: "white", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 10 }}>ON</span>}
            </button>

            <p style={{ fontSize: 13, color: "var(--gray-500)", flex: 1 }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid var(--gray-200)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Loading products...
                </span>
              ) : (
                <>
                  Showing <strong style={{ color: "var(--gray-900)" }}>{products.length.toLocaleString()}</strong>
                  {" / "}
                  <strong style={{ color: "var(--gray-900)" }}>{total.toLocaleString()}</strong> results
                  {searchQuery && <em style={{ color: "var(--primary)", marginLeft: 5 }}>for "{searchQuery}"</em>}
                </>
              )}
            </p>

            <select value={sort} onChange={e => setSort(e.target.value as SortOption)} style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", fontSize: 13, fontFamily: "inherit", color: "var(--gray-700)", cursor: "pointer", outline: "none", background: "white" }}>
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
              {selectedCategory && <FilterChip label={categories.find(c => c.slug === selectedCategory)?.name ?? selectedCategory} onRemove={() => setSelectedCategory("")} />}
              {searchQuery && <FilterChip label={`"${searchQuery}"`} onRemove={() => { setSearchQuery(""); setSearchInput(""); setActiveQuick(""); }} />}
              {selectedBrand && <FilterChip label={`Brand: ${selectedBrand}`} onRemove={() => setSelectedBrand("")} />}
              {(priceMin || priceMax) && <FilterChip label={`M${priceMin || "0"} – M${priceMax || "Any"}`} onRemove={() => { setPriceMin(""); setPriceMax(""); }} />}
              {inStockOnly && <FilterChip label="In Stock Only" onRemove={() => setInStockOnly(false)} />}
              {minRating && <FilterChip label={`${minRating}+ Stars`} onRemove={() => setMinRating("")} />}
              <button onClick={clearAll} style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", background: "none", border: "1px solid var(--red)", borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                Clear All ×
              </button>
            </div>
          )}

          {/* PRODUCT GRID / LIST */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonGrid key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState onClear={clearAll} />
          ) : (
            <>
              {viewMode === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {products.map((p, i) => (
                    <div key={p.id} style={{ opacity: 0, animation: `fadeUp 0.35s ease ${Math.min(i, 20) * 30}ms forwards` }}>
                      <ProductCardGrid product={p} onNavigate={() => router.push(`/store/product/${p.id}`)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {products.map((p, i) => (
                    <div key={p.id} style={{ opacity: 0, animation: `fadeUp 0.3s ease ${Math.min(i, 12) * 35}ms forwards` }}>
                      <ProductCardList product={p} onNavigate={() => router.push(`/store/product/${p.id}`)} />
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPage={pg => { loadProducts(pg); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  total={total}
                  showing={products.length}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ══ MOBILE FILTER DRAWER ══ */}
      <div
        onClick={() => setShowMobileFilter(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998, opacity: showMobileFilter ? 1 : 0, pointerEvents: showMobileFilter ? "auto" : "none", transition: "opacity 0.25s" }}
      />
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 300, background: "white", zIndex: 9999, transform: showMobileFilter ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "4px 0 24px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--primary)", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: 0.8 }}>Filter & Sort</span>
          <button onClick={() => setShowMobileFilter(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 7, cursor: "pointer", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <FilterPanel />
        </div>
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--gray-200)", background: "var(--gray-50)", flexShrink: 0 }}>
          <button onClick={() => setShowMobileFilter(false)} style={{ width: "100%", background: "var(--primary)", color: "white", border: "none", padding: "13px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            Show {total.toLocaleString()} Results
          </button>
        </div>
      </div>
    </div>
  );
}