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
function optimizeImg(url: string | null | undefined, size: 300 | 500 | 800 | 1500 = 500): string | null {
  if (!url) return null;
  if (!url.includes("m.media-amazon.com")) return url;
  return url
    .replace(/_AC_U[XY]\d+_(?:CR\d+,\d+,\d+,\d+_)?/gi, `_AC_SL${size}_`)
    .replace(/_AC_S[LYX][SX]?\d+_/gi, `_AC_SL${size}_`)
    .replace(/_SL\d+_/g, `_AC_SL${size}_`)
    .replace(/_SS\d+_/g, `_AC_SL${size}_`)
    .replace(/\._[A-Z]{2}\d+_\./, `._SL${size}_.`);
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
  image_url?: string | null;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  logo_url?: string | null;
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

const COLLECTION_TAGS = [
  { tag: "anti_aging", label: "Anti-Aging", group: "Skin Concerns" },
  { tag: "acne", label: "Acne Care", group: "Skin Concerns" },
  { tag: "brightening", label: "Brightening", group: "Skin Concerns" },
  { tag: "whitening", label: "Whitening", group: "Skin Concerns" },
  { tag: "hydration", label: "Hydration", group: "Skin Concerns" },
  { tag: "repair", label: "Repair", group: "Skin Concerns" },
  { tag: "barrier", label: "Skin Barrier", group: "Skin Concerns" },
  { tag: "eczema", label: "Eczema", group: "Skin Concerns" },
  { tag: "rosacea", label: "Rosacea", group: "Skin Concerns" },
  { tag: "scar", label: "Scar Care", group: "Skin Concerns" },
  { tag: "sunscreen", label: "Sunscreen", group: "Product Types" },
  { tag: "oils", label: "Face Oils", group: "Product Types" },
  { tag: "soaps", label: "Soaps", group: "Product Types" },
  { tag: "body", label: "Body Care", group: "Product Types" },
  { tag: "masks", label: "Face Masks", group: "Product Types" },
  { tag: "exfoliation", label: "Exfoliation", group: "Product Types" },
  { tag: "clinical_acids", label: "Clinical Acids", group: "Ingredients" },
  { tag: "african_ingredients", label: "African Botanicals", group: "Ingredients" },
  { tag: "korean_ingredients", label: "K-Beauty", group: "Ingredients" },
];

const TAG_LABEL: Record<string, string> = Object.fromEntries(COLLECTION_TAGS.map(t => [t.tag, t.label]));

/* ================================================================
   CSS VARIABLES & GLOBAL STYLES
================================================================ */
const GLOBAL_CSS = `
  :root {
    --primary: #0f3f2f;
    --primary-dark: #0a2518;
    --primary-mid: #1b5e4a;
    --accent: #c8a75a;
    --accent-light: #fef3cd;
    --red: #c0392b;
    --red-light: #fdecea;
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
    --radius: 12px;
    --radius-sm: 8px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
    --shadow: 0 4px 16px rgba(0,0,0,0.1);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.14);
    --shadow-xl: 0 16px 48px rgba(0,0,0,0.18);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .shimmer {
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes pulse-dot { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.5; transform: scale(0.8) } }
  ::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
  .store-card:hover .card-quick-action { opacity: 1 !important; transform: translateY(0) !important; }
  .filter-btn:hover { background: var(--primary) !important; color: white !important; }
  @media (max-width: 1024px) {
    .sidebar-desktop { display: none !important; }
    .mob-filter-visible { display: flex !important; }
  }
  @media (max-width: 768px) {
    .trust-bar-grid { grid-template-columns: repeat(2,1fr) !important; }
    .search-bar-inner { flex-wrap: wrap; }
    .sort-label-text { display: none !important; }
    .top-toolbar { flex-wrap: wrap; gap: 8px !important; }
  }
`;

/* ================================================================
   STAR RATING
================================================================ */
function Stars({ rating, count }: { rating: number; count?: number | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = rating >= i;
        const half = !filled && rating >= i - 0.5;
        return (
          <svg key={i} width="10" height="10" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id={`hg${i}`}>
                <stop offset="50%" stopColor="#c8a75a" />
                <stop offset="50%" stopColor="#e2e8f0" />
              </linearGradient>
            </defs>
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              fill={filled ? "#c8a75a" : half ? `url(#hg${i})` : "#e2e8f0"}
              stroke="none"
            />
          </svg>
        );
      })}
      {count != null && count > 0 && (
        <span style={{ fontSize: 10, color: "var(--gray-500)", marginLeft: 2 }}>({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})</span>
      )}
    </div>
  );
}

/* ================================================================
   DISCOUNT BADGE
================================================================ */
function getDiscount(p: ProductListItem) {
  if (p.discount_pct && p.discount_pct >= 1) return Math.round(p.discount_pct);
  if (p.compare_price && p.compare_price > p.price)
    return Math.round(((p.compare_price - p.price) / p.compare_price) * 100);
  return null;
}

/* ================================================================
   PRODUCT CARD — GRID
================================================================ */
function ProductCardGrid({ product, onNavigate }: { product: ProductListItem; onNavigate: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const imgSrc = optimizeImg(resolveImg(product.main_image ?? product.image_url), 300);
  const discount = getDiscount(product);

  return (
    <div
      className="store-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        borderRadius: "var(--radius)",
        border: `1.5px solid ${hovered ? "var(--primary)" : "var(--gray-200)"}`,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        boxShadow: hovered ? "var(--shadow-lg)" : "var(--shadow-sm)",
        transform: hovered ? "translateY(-4px)" : "none",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        height: "100%",
      }}
      onClick={onNavigate}
    >
      {/* Image */}
      <div style={{ position: "relative", overflow: "hidden", background: "var(--gray-50)" }}>
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={product.title}
            onError={() => setImgErr(true)}
            style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
            loading="lazy"
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.07)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          />
        ) : (
          <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}

        {/* Badges */}
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 2 }}>
          {discount != null && discount >= 5 && (
            <span style={{ background: "var(--red)", color: "white", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, letterSpacing: 0.3 }}>
              -{discount}%
            </span>
          )}
          {!product.in_stock && (
            <span style={{ background: "rgba(0,0,0,0.6)", color: "white", fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 5 }}>
              SOLD OUT
            </span>
          )}
          {product.rating && product.rating >= 4.7 && product.in_stock && (
            <span style={{ background: "#f59e0b", color: "white", fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 5 }}>
              TOP PICK
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={e => { e.stopPropagation(); setSaved(!saved); }}
          style={{ position: "absolute", top: 8, right: 8, zIndex: 3, width: 34, height: 34, borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, background 0.2s" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "var(--red)" : "none"} stroke={saved ? "var(--red)" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Quick view */}
        <div
          className="card-quick-action"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15,63,47,0.92)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", fontSize: 11, fontWeight: 700, color: "white", letterSpacing: 0.5, opacity: 0, transform: "translateY(100%)", transition: "opacity 0.22s, transform 0.22s", zIndex: 4 }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View Product
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "12px 13px 14px", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {product.brand && (
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--primary)", lineHeight: 1 }}>
            {product.brand}
          </span>
        )}
        <div style={{ fontSize: 13, color: "var(--gray-800)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
          {product.title}
        </div>
        {product.rating != null && product.rating > 0 && (
          <Stars rating={product.rating} count={product.rating_number} />
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "var(--gray-900)", fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span style={{ fontSize: 11, color: "var(--gray-400)", textDecoration: "line-through" }}>
              {formatCurrency(product.compare_price)}
            </span>
          )}
        </div>
        {discount != null && discount >= 5 && (
          <span style={{ fontSize: 10, color: "var(--red)", fontWeight: 700 }}>
            You save {formatCurrency(product.compare_price! - product.price)}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: product.in_stock ? "#22c55e" : "#ef4444", animation: product.in_stock ? "pulse-dot 2s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: 10, color: product.in_stock ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
            {product.in_stock ? "In Stock" : "Out of Stock"}
          </span>
        </div>
        {product.in_stock && (
          <button
            onClick={e => { e.stopPropagation(); setAdded(true); setTimeout(() => setAdded(false), 2200); }}
            style={{ marginTop: 6, width: "100%", padding: "10px", background: added ? "#16a34a" : "var(--primary)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.25s", fontFamily: "inherit" }}
          >
            {added ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Added to Cart
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                Add to Cart
              </>
            )}
          </button>
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
  const [saved, setSaved] = useState(false);
  const imgSrc = optimizeImg(resolveImg(product.main_image ?? product.image_url), 300);
  const discount = getDiscount(product);

  return (
    <div
      onClick={onNavigate}
      style={{ background: "white", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius)", overflow: "hidden", cursor: "pointer", display: "flex", transition: "border-color 0.2s, box-shadow 0.2s", position: "relative" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--primary)"; el.style.boxShadow = "var(--shadow)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--gray-200)"; el.style.boxShadow = "none"; }}
    >
      <div style={{ width: 200, height: 200, flexShrink: 0, position: "relative", overflow: "hidden" }}>
        {imgSrc && !imgErr ? (
          <img src={imgSrc} alt={product.title} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
        {discount != null && discount >= 5 && (
          <span style={{ position: "absolute", top: 10, left: 10, background: "var(--red)", color: "white", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>-{discount}%</span>
        )}
      </div>
      <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
        {product.brand && <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--primary)" }}>{product.brand}</span>}
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-900)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.title}</div>
        {product.rating != null && product.rating > 0 && <Stars rating={product.rating} count={product.rating_number} />}
        {product.category && <span style={{ fontSize: 12, color: "var(--gray-500)" }}>Category: {TAG_LABEL[product.category] ?? product.category}</span>}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: product.in_stock ? "#22c55e" : "#ef4444" }} />
          <span style={{ fontSize: 11, color: product.in_stock ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{product.in_stock ? "In Stock" : "Out of Stock"}</span>
        </div>
      </div>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", minWidth: 180, borderLeft: "1px solid var(--gray-100)" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--gray-900)", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(product.price)}</div>
          {product.compare_price && product.compare_price > product.price && (
            <div style={{ fontSize: 12, color: "var(--gray-400)", textDecoration: "line-through", marginTop: 3 }}>{formatCurrency(product.compare_price)}</div>
          )}
          {discount != null && discount >= 5 && <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, marginTop: 4 }}>Save {discount}%</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {product.in_stock && (
            <button onClick={e => e.stopPropagation()} style={{ background: "var(--primary)", color: "white", border: "none", padding: "11px 22px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary-dark)")} onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary)")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Add to Cart
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); setSaved(!saved); }} style={{ background: "transparent", border: `1.5px solid ${saved ? "var(--red)" : "var(--gray-300)"}`, color: saved ? "var(--red)" : "var(--gray-600)", padding: "9px 16px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={saved ? "var(--red)" : "none"} stroke={saved ? "var(--red)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {saved ? "Saved" : "Wishlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SKELETON CARDS
================================================================ */
function SkeletonGrid() {
  return (
    <div style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div className="shimmer" style={{ paddingTop: "100%" }} />
      <div style={{ padding: "12px 13px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div className="shimmer" style={{ height: 9, width: "35%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, width: "92%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, width: "70%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 16, width: "50%", borderRadius: 4, marginTop: 4 }} />
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", overflow: "hidden", display: "flex", height: 200 }}>
      <div className="shimmer" style={{ width: 200, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="shimmer" style={{ height: 10, width: "25%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 14, width: "85%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, width: "60%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 18, width: "40%", borderRadius: 4 }} />
      </div>
    </div>
  );
}

/* ================================================================
   FILTER SECTION COLLAPSIBLE
================================================================ */
function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--gray-100)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gray-900)", textTransform: "uppercase", letterSpacing: 0.7 }}>{title}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div style={{ padding: "0 16px 14px" }}>{children}</div>}
    </div>
  );
}

/* ================================================================
   ACTIVE FILTER CHIP
================================================================ */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(15,63,47,0.07)", border: "1px solid rgba(15,63,47,0.18)", color: "var(--primary)", fontSize: 12, fontWeight: 600, padding: "5px 10px 5px 12px", borderRadius: 20 }}>
      {label}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", opacity: 0.6, borderRadius: "50%" }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

/* ================================================================
   QUICK FILTERS ROW
================================================================ */
const QUICK_FILTERS = [
  { label: "All Products", q: "" },
  { label: "Best Sellers", q: "sort=popular" },
  { label: "Flash Deals", q: "sort=discount" },
  { label: "Top Rated", q: "sort=rating" },
  { label: "New Arrivals", q: "sort=newest" },
  { label: "Hydration", q: "tag=hydration" },
  { label: "Anti-Aging", q: "tag=anti_aging" },
  { label: "Brightening", q: "tag=brightening" },
  { label: "Sunscreen", q: "tag=sunscreen" },
  { label: "African Picks", q: "tag=african_ingredients" },
  { label: "K-Beauty", q: "tag=korean_ingredients" },
  { label: "In Stock Only", q: "in_stock=true" },
];

/* ================================================================
   PRICE PRESETS
================================================================ */
const PRICE_PRESETS: [string, string, string][] = [
  ["Under M500", "", "500"],
  ["M500–1000", "500", "1000"],
  ["M1k–3k", "1000", "3000"],
  ["M3k+", "3000", ""],
];

/* ================================================================
   EMPTY STATE
================================================================ */
function EmptyState({ searchQuery, onClear }: { searchQuery: string; onClear: () => void }) {
  return (
    <div style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "80px 40px", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, background: "var(--gray-100)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--gray-900)", marginBottom: 10 }}>
        {searchQuery ? `No results for "${searchQuery}"` : "No products found"}
      </h3>
      <p style={{ fontSize: 14, color: "var(--gray-500)", marginBottom: 28, lineHeight: 1.75 }}>
        Try adjusting your filters or search for something different.
      </p>
      <button
        onClick={onClear}
        style={{ background: "var(--primary)", color: "white", border: "none", padding: "13px 32px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
      >
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
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push("...");
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 40 }}>
      <p style={{ fontSize: 13, color: "var(--gray-500)" }}>
        Showing <strong style={{ color: "var(--gray-900)" }}>{showing.toLocaleString()}</strong> of <strong style={{ color: "var(--gray-900)" }}>{total.toLocaleString()}</strong> products
      </p>
      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 400, height: 5, background: "var(--gray-200)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min((showing / total) * 100, 100)}%`, background: "var(--primary)", borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", border: "1.5px solid var(--gray-200)", background: page <= 1 ? "var(--gray-100)" : "white", color: page <= 1 ? "var(--gray-300)" : "var(--gray-700)", fontSize: 18, cursor: page <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", transition: "background 0.15s" }}
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray-400)", fontSize: 14 }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", border: p === page ? "none" : "1.5px solid var(--gray-200)", background: p === page ? "var(--primary)" : "white", color: p === page ? "white" : "var(--gray-700)", fontWeight: p === page ? 800 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", border: "1.5px solid var(--gray-200)", background: page >= totalPages ? "var(--gray-100)" : "white", color: page >= totalPages ? "var(--gray-300)" : "var(--gray-700)", fontSize: 18, cursor: page >= totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
        >
          ›
        </button>
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

  /* ── Products state ── */
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ── Filter state (URL-synced) ── */
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const [searchQuery, setSearchQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<SortOption>((params.get("sort") as SortOption) ?? "newest");
  const [selectedTag, setSelectedTag] = useState(params.get("tag") ?? "");
  const [selectedCategory, setSelectedCategory] = useState(params.get("category") ?? "");
  const [selectedBrand, setSelectedBrand] = useState(params.get("brand") ?? "");
  const [priceMin, setPriceMin] = useState(params.get("min_price") ?? "");
  const [priceMax, setPriceMax] = useState(params.get("max_price") ?? "");
  const [inStockOnly, setInStockOnly] = useState(params.get("in_stock") === "true");
  const [minRating, setMinRating] = useState(params.get("min_rating") ?? "");

  /* ── UI state ── */
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeQuick, setActiveQuick] = useState("");
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  /* ── Sidebar metadata ── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const hasFilters = !!(searchQuery || selectedTag || selectedCategory || selectedBrand || priceMin || priceMax || inStockOnly || minRating);

  const clearAll = useCallback(() => {
    setSearchQuery(""); setSearchInput(""); setSelectedTag("");
    setSelectedCategory(""); setSelectedBrand(""); setPriceMin(""); setPriceMax("");
    setInStockOnly(false); setMinRating(""); setActiveQuick(""); setSort("newest");
  }, []);

  /* Fetch sidebar data */
  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data)) setCategories(data.filter(c => c.product_count > 0).slice(0, 30));
      })
      .catch(() => {});
    fetch(`${API}/api/brands`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data)) setBrands(data.filter(b => b.product_count > 0).slice(0, 20));
      })
      .catch(() => {});
  }, []);

  /* ── Fetch products ── */
  const loadProducts = useCallback(async (pg = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const qs = new URLSearchParams({ sort: SORT_API_MAP[sort], page: String(pg), per_page: String(PAGE_SIZE) });
      if (searchQuery) qs.set("q", searchQuery);
      if (selectedTag) qs.set("tag", selectedTag);
      if (selectedCategory) qs.set("category", selectedCategory);
      if (selectedBrand) qs.set("brand", selectedBrand);
      if (priceMin) qs.set("min_price", priceMin);
      if (priceMax) qs.set("max_price", priceMax);
      if (inStockOnly) qs.set("in_stock", "true");
      if (minRating) qs.set("min_rating", minRating);

      const res = await fetch(`${API}/api/products?${qs}`);
      const data = res.ok ? await res.json() : { total: 0, results: [] };
      const items: ProductListItem[] = data.results ?? [];
      const tot: number = data.total ?? items.length;

      setProducts(prev => append ? [...prev, ...items] : items);
      setTotal(tot);
      setHasMore(pg * PAGE_SIZE < tot);
      setPage(pg);
    } catch (err) {
      console.error("StoreClient error:", err);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [sort, searchQuery, selectedTag, selectedCategory, selectedBrand, priceMin, priceMax, inStockOnly, minRating]);

  useEffect(() => { loadProducts(1); }, [sort, searchQuery, selectedTag, selectedCategory, selectedBrand, priceMin, priceMax, inStockOnly, minRating]);

  const handleQuick = (q: string) => {
    setActiveQuick(q);
    setSort("newest");
    setSelectedTag(""); setSelectedCategory(""); setSelectedBrand("");
    setPriceMin(""); setPriceMax(""); setInStockOnly(false); setMinRating("");
    setSearchQuery(""); setSearchInput("");
    if (!q) return;
    const p = new URLSearchParams(q);
    const sv = p.get("sort"); const tv = p.get("tag"); const is = p.get("in_stock");
    if (sv) setSort(sv as SortOption);
    if (tv) setSelectedTag(tv);
    if (is === "true") setInStockOnly(true);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(searchInput.trim());
    setActiveQuick("");
  };

  /* ── FILTER PANEL ── */
  const FilterPanel = () => (
    <div>
      {/* Collection tags by group */}
      {["Skin Concerns", "Product Types", "Ingredients"].map(group => (
        <FilterSection key={group} title={group} defaultOpen={group === "Skin Concerns"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {COLLECTION_TAGS.filter(t => t.group === group).map(t => (
              <label key={t.tag} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="radio"
                  name={`tag-${group}`}
                  checked={selectedTag === t.tag}
                  onChange={() => setSelectedTag(selectedTag === t.tag ? "" : t.tag)}
                  style={{ accentColor: "var(--primary)", cursor: "pointer", width: 14, height: 14 }}
                />
                <span style={{ fontSize: 13, color: selectedTag === t.tag ? "var(--primary)" : "var(--gray-700)", fontWeight: selectedTag === t.tag ? 700 : 400, transition: "color 0.15s" }}>
                  {t.label}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      ))}

      {/* Categories */}
      {categories.length > 0 && (
        <FilterSection title="Categories" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
            {categories.map(c => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="radio" name="category" checked={selectedCategory === c.slug} onChange={() => setSelectedCategory(selectedCategory === c.slug ? "" : c.slug)} style={{ accentColor: "var(--primary)", cursor: "pointer", width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: selectedCategory === c.slug ? "var(--primary)" : "var(--gray-700)", fontWeight: selectedCategory === c.slug ? 700 : 400 }}>{c.name}</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--gray-400)", background: "var(--gray-100)", padding: "1px 7px", borderRadius: 10 }}>{c.product_count}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Price range */}
      <FilterSection title="Price Range">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[["Min (M)", priceMin, setPriceMin, "0"], ["Max (M)", priceMax, setPriceMax, "Any"]].map(([label, val, setter, ph]: any) => (
              <div key={label} style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: "var(--gray-500)", marginBottom: 4, display: "block", fontWeight: 600 }}>{label}</label>
                <input type="number" value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }} onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--gray-200)")} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRICE_PRESETS.map(([label, min, max]) => {
              const active = priceMin === min && priceMax === max;
              return (
                <button key={label} onClick={() => { setPriceMin(min); setPriceMax(max); }} style={{ fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 20, border: `1.5px solid ${active ? "var(--primary)" : "var(--gray-200)"}`, background: active ? "var(--primary)" : "transparent", color: active ? "white" : "var(--gray-700)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
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
            <label key={r ?? "all"} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
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

      {/* Brands */}
      {brands.length > 0 && (
        <FilterSection title="Brand" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
            {brands.map(b => (
              <label key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="radio" name="brand" checked={selectedBrand === b.name} onChange={() => setSelectedBrand(selectedBrand === b.name ? "" : b.name)} style={{ accentColor: "var(--primary)", cursor: "pointer", width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: selectedBrand === b.name ? "var(--primary)" : "var(--gray-700)", fontWeight: selectedBrand === b.name ? 700 : 400 }}>{b.name}</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--gray-400)", background: "var(--gray-100)", padding: "1px 7px", borderRadius: 10 }}>{b.product_count}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Sort (in sidebar for mobile) */}
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
  );

  /* ── RENDER ── */
  return (
    <div style={{ background: "var(--gray-50)", minHeight: "100vh" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══════════════════════════════════════════
          STICKY SEARCH + SORT TOOLBAR
      ══════════════════════════════════════════ */}
      <div style={{ background: "var(--primary)", padding: "14px 0", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(12px,3vw,40px)", display: "flex", alignItems: "center", gap: 10 }} className="top-toolbar">
          {/* Logo mark */}
          <Link href="/" style={{ flexShrink: 0, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, marginRight: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, color: "white", letterSpacing: -0.5 }}>Karabo</span>
          </Link>

          {/* Search form */}
          <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", background: "white", borderRadius: 9, overflow: "hidden", maxWidth: 700, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
            <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} style={{ background: "var(--gray-100)", border: "none", borderRight: "1px solid var(--gray-200)", padding: "0 12px", fontSize: 12, color: "var(--gray-700)", fontFamily: "inherit", cursor: "pointer", outline: "none", minWidth: 90 }}>
              <option value="">All</option>
              {["Skin Concerns", "Product Types", "Ingredients"].map(g => (
                <optgroup key={g} label={g}>
                  {COLLECTION_TAGS.filter(t => t.group === g).map(t => (
                    <option key={t.tag} value={t.tag}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products, brands, ingredients..."
              style={{ flex: 1, padding: "13px 16px", border: "none", fontSize: 14, fontFamily: "inherit", outline: "none", color: "var(--gray-900)", minWidth: 0 }}
            />
            <button type="submit" style={{ background: "var(--accent)", border: "none", padding: "0 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s", flexShrink: 0 }} onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#b8960a")} onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </form>

          {/* Sort */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className="sort-label-text" style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>Sort by:</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortOption)} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", color: "white", padding: "9px 12px", borderRadius: "var(--radius-sm)", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
                <option key={v} value={v} style={{ background: "var(--primary)", color: "white" }}>{l}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", padding: 3, flexShrink: 0 }}>
            {(["grid", "list"] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ width: 36, height: 36, borderRadius: 7, border: "none", background: viewMode === m ? "white" : "transparent", color: viewMode === m ? "var(--primary)" : "rgba(255,255,255,0.65)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
                {m === "grid" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          QUICK FILTER TABS
      ══════════════════════════════════════════ */}
      <div style={{ background: "white", borderBottom: "1.5px solid var(--gray-200)", overflowX: "auto", scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(12px,3vw,40px)", display: "flex" }}>
          {QUICK_FILTERS.map(qf => (
            <button
              key={qf.q}
              onClick={() => handleQuick(qf.q)}
              style={{ padding: "13px 16px", border: "none", background: "none", borderBottom: activeQuick === qf.q ? "2.5px solid var(--primary)" : "2.5px solid transparent", color: activeQuick === qf.q ? "var(--primary)" : "var(--gray-600)", fontWeight: activeQuick === qf.q ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s", marginBottom: -1.5 }}
            >
              {qf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BREADCRUMBS
      ══════════════════════════════════════════ */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "10px clamp(12px,3vw,40px)" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--gray-400)" }}>
          <Link href="/" style={{ color: "var(--gray-400)", textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)")} onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--gray-400)")}>Home</Link>
          <span>/</span>
          <Link href="/store" style={{ color: "var(--gray-400)", textDecoration: "none" }}>Store</Link>
          {selectedTag && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{TAG_LABEL[selectedTag] ?? selectedTag}</span></>}
          {selectedCategory && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{selectedCategory}</span></>}
          {selectedBrand && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{selectedBrand}</span></>}
          {searchQuery && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>"{searchQuery}"</span></>}
        </nav>
      </div>

      {/* ══════════════════════════════════════════
          MAIN CONTENT LAYOUT
      ══════════════════════════════════════════ */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(12px,3vw,40px) 80px", display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="sidebar-desktop" style={{ width: 250, flexShrink: 0, background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", overflow: "hidden", position: "sticky", top: 80, maxHeight: "calc(100vh - 100px)", overflowY: "auto", scrollbarWidth: "none" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--gray-50)", position: "sticky", top: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-900)", textTransform: "uppercase", letterSpacing: 0.7 }}>Filters</span>
            </div>
            {hasFilters && (
              <button onClick={clearAll} style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", background: "none", border: "1px solid var(--red)", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }} onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "var(--red)"; b.style.color = "white"; }} onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "none"; b.style.color = "var(--red)"; }}>
                Clear All
              </button>
            )}
          </div>
          <FilterPanel />
        </aside>

        {/* ── MAIN PRODUCT AREA ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Controls bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 12, flexWrap: "wrap" }}>
            {/* Mobile filter button */}
            <button
              className="mob-filter-visible"
              onClick={() => setShowMobileFilter(true)}
              style={{ display: "none", alignItems: "center", gap: 7, background: "var(--primary)", color: "white", border: "none", padding: "10px 18px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters
              {hasFilters && <span style={{ background: "var(--red)", color: "white", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 10 }}>ON</span>}
            </button>

            <p style={{ fontSize: 13, color: "var(--gray-500)", flex: 1 }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--gray-300)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Loading products...
                </span>
              ) : (
                <>
                  Showing{" "}
                  <strong style={{ color: "var(--gray-900)" }}>{products.length.toLocaleString()}</strong>
                  {" / "}
                  <strong style={{ color: "var(--gray-900)" }}>{total.toLocaleString()}</strong>
                  {" results"}
                  {searchQuery && <em style={{ color: "var(--primary)", marginLeft: 6 }}>for "{searchQuery}"</em>}
                </>
              )}
            </p>

            <select value={sort} onChange={e => setSort(e.target.value as SortOption)} style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--gray-200)", fontSize: 13, fontFamily: "inherit", color: "var(--gray-700)", cursor: "pointer", outline: "none", background: "white", transition: "border-color 0.15s" }} onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--gray-200)")}>
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {selectedTag && <FilterChip label={TAG_LABEL[selectedTag] ?? selectedTag} onRemove={() => setSelectedTag("")} />}
              {searchQuery && <FilterChip label={`"${searchQuery}"`} onRemove={() => { setSearchQuery(""); setSearchInput(""); setActiveQuick(""); }} />}
              {selectedCategory && <FilterChip label={selectedCategory} onRemove={() => setSelectedCategory("")} />}
              {selectedBrand && <FilterChip label={`Brand: ${selectedBrand}`} onRemove={() => setSelectedBrand("")} />}
              {(priceMin || priceMax) && <FilterChip label={`M${priceMin || "0"} – M${priceMax || "Any"}`} onRemove={() => { setPriceMin(""); setPriceMax(""); }} />}
              {inStockOnly && <FilterChip label="In Stock Only" onRemove={() => setInStockOnly(false)} />}
              {minRating && <FilterChip label={`${minRating}+ Stars`} onRemove={() => setMinRating("")} />}
              <button onClick={clearAll} style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", background: "none", border: "1.5px solid var(--red)", borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }} onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "var(--red)"; b.style.color = "white"; }} onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "none"; b.style.color = "var(--red)"; }}>
                Clear All ×
              </button>
            </div>
          )}

          {/* PRODUCT GRID / LIST */}
          {loading ? (
            viewMode === "grid" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonGrid key={i} />)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonList key={i} />)}
              </div>
            )
          ) : products.length === 0 ? (
            <EmptyState searchQuery={searchQuery} onClear={clearAll} />
          ) : (
            <>
              {viewMode === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
                  {products.map((p, i) => (
                    <div key={p.id} style={{ opacity: 0, animation: `fadeUp 0.4s ease ${Math.min(i, 20) * 35}ms forwards` }}>
                      <ProductCardGrid product={p} onNavigate={() => router.push(`/store/product/${p.id}`)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {products.map((p, i) => (
                    <div key={p.id} style={{ opacity: 0, animation: `fadeUp 0.35s ease ${Math.min(i, 12) * 40}ms forwards` }}>
                      <ProductCardList product={p} onNavigate={() => router.push(`/store/product/${p.id}`)} />
                    </div>
                  ))}
                </div>
              )}

              {/* PAGINATION */}
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPage={(pg) => { loadProducts(pg); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  total={total}
                  showing={products.length}
                />
              )}

              {/* Load More for infinite scroll pattern */}
              {hasMore && totalPages === 1 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 40 }}>
                  <div style={{ width: "100%", maxWidth: 400, height: 5, background: "var(--gray-200)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(products.length / total) * 100}%`, background: "var(--primary)", borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <p style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    Showing <strong>{products.length.toLocaleString()}</strong> of <strong>{total.toLocaleString()}</strong>
                  </p>
                  <button
                    onClick={() => loadProducts(page + 1, true)}
                    disabled={loadingMore}
                    style={{ background: loadingMore ? "var(--gray-300)" : "var(--primary)", color: loadingMore ? "var(--gray-600)" : "white", border: "none", padding: "14px 44px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14, cursor: loadingMore ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.2s, transform 0.2s", display: "flex", alignItems: "center", gap: 10 }}
                    onMouseEnter={e => { if (!loadingMore) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = "none")}
                  >
                    {loadingMore ? (
                      <><span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Loading…</>
                    ) : "Load More Products"}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE FILTER DRAWER
      ══════════════════════════════════════════ */}
      {/* Backdrop */}
      <div
        onClick={() => setShowMobileFilter(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, opacity: showMobileFilter ? 1 : 0, pointerEvents: showMobileFilter ? "auto" : "none", transition: "opacity 0.3s", backdropFilter: "blur(3px)" }}
      />
      {/* Drawer */}
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 310, background: "white", zIndex: 9999, transform: showMobileFilter ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "4px 0 32px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--primary)", flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: 0.8 }}>Filter & Sort</span>
          <button onClick={() => setShowMobileFilter(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          <FilterPanel />
        </div>
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--gray-200)", background: "var(--gray-50)", flexShrink: 0 }}>
          <button onClick={() => setShowMobileFilter(false)} style={{ width: "100%", background: "var(--primary)", color: "white", border: "none", padding: "14px", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
            Show {total.toLocaleString()} Results
          </button>
        </div>
      </div>
    </div>
  );
}