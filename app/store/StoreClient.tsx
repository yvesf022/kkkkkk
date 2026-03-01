"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
function optimizeImg(url: string | null | undefined, size: 300 | 500 | 1500 = 300): string | null {
  if (!url) return null;
  if (!url.includes("m.media-amazon.com")) return url;
  return url.replace(/_AC_SL\d+_/g, `_AC_SL${size}_`).replace(/_SL\d+_/g, `_AC_SL${size}_`);
}

/* ================================================================
   TYPES
   ProductListItem matches the shape from:
     GET /api/products  →  { total, results: ProductListItem[] }
     GET /api/products/by-department/{dept}  →  { total, results: ProductListItem[] }
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
}

/* ================================================================
   CONSTANTS
================================================================ */
type SortOption = "newest" | "price_asc" | "price_desc" | "rating" | "popular" | "discount";
type ViewMode = "grid" | "list";

const SORT_LABELS: Record<SortOption, string> = {
  newest:     "Newest First",
  price_asc:  "Price: Low → High",
  price_desc: "Price: High → Low",
  rating:     "Top Rated",
  popular:    "Most Popular",
  discount:   "Biggest Discount",
};

/**
 * Maps frontend sort keys to values accepted by:
 *   GET /api/products  ?sort=
 *   GET /api/products/by-department/{dept}  ?sort=
 *
 * Accepted by products.py:  "price_asc","price_desc","rating","newest","sales","random","discount"
 * Accepted by categories_router.py: same + "popular" mapped → "sales"
 */
const SORT_API_MAP: Record<SortOption, string> = {
  newest:     "newest",
  price_asc:  "price_asc",
  price_desc: "price_desc",
  rating:     "rating",
  popular:    "sales",      // ← backend accepts "sales" not "popular"
  discount:   "discount",
};

// Beauty category slugs (must match products.category column values)
// ── Collection tags — sourced directly from the CSV "collections" column ──────
// These are the primary navigation system for this catalogue.

export const COLLECTION_TAGS: { tag: string; label: string; emoji: string; group: string }[] = [
  // Skin concerns
  { tag: "anti_aging",          label: "Anti-Aging",           emoji: "✨", group: "Skin Concerns" },
  { tag: "acne",                label: "Acne",                 emoji: "🎯", group: "Skin Concerns" },
  { tag: "brightening",         label: "Brightening",          emoji: "🌟", group: "Skin Concerns" },
  { tag: "whitening",           label: "Whitening",            emoji: "🤍", group: "Skin Concerns" },
  { tag: "hydration",           label: "Hydration",            emoji: "💧", group: "Skin Concerns" },
  { tag: "repair",              label: "Repair",               emoji: "🔧", group: "Skin Concerns" },
  { tag: "barrier",             label: "Barrier",              emoji: "🛡️", group: "Skin Concerns" },
  { tag: "eczema",              label: "Eczema",               emoji: "🌿", group: "Skin Concerns" },
  { tag: "rosacea",             label: "Rosacea",              emoji: "🌹", group: "Skin Concerns" },
  { tag: "scar",                label: "Scar",                 emoji: "🩹", group: "Skin Concerns" },
  { tag: "stretch_mark",        label: "Stretch Mark",         emoji: "📏", group: "Skin Concerns" },
  // Product types
  { tag: "sunscreen",           label: "Sunscreen",            emoji: "☀️", group: "Product Types" },
  { tag: "oils",                label: "Oils",                 emoji: "🌿", group: "Product Types" },
  { tag: "soaps",               label: "Soaps",                emoji: "🧼", group: "Product Types" },
  { tag: "body",                label: "Body",                 emoji: "💆", group: "Product Types" },
  { tag: "masks",               label: "Masks",                emoji: "🎭", group: "Product Types" },
  { tag: "exfoliation",         label: "Exfoliation",          emoji: "✦",  group: "Product Types" },
  // Ingredient focus
  { tag: "clinical_acids",      label: "Clinical Acids",       emoji: "⚗️", group: "Ingredients" },
  { tag: "african_ingredients", label: "African Ingredients",  emoji: "🌍", group: "Ingredients" },
  { tag: "korean_ingredients",  label: "Korean Ingredients",   emoji: "🇰🇷", group: "Ingredients" },
];

// Lookup map: tag → label
const TAG_LABEL: Record<string, string> = Object.fromEntries(
  COLLECTION_TAGS.map(t => [t.tag, t.label])
);

// For legacy category filtering (still used by sidebar brand / category fallback)
const ALL_SLUGS = COLLECTION_TAGS.map(t => t.tag);

const PAGE_SIZE = 20;

const QUICK_FILTERS = [
  { label: "All Products",     q: "" },
  { label: "Best Sellers",     q: "sort=popular" },
  { label: "Flash Deals",      q: "sort=discount" },
  { label: "Top Rated",        q: "sort=rating" },
  { label: "New Arrivals",     q: "sort=newest" },
  { label: "Hydration",        q: "tag=hydration" },
  { label: "Anti-Aging",       q: "tag=anti_aging" },
  { label: "Brightening",      q: "tag=brightening" },
  { label: "African Picks",    q: "tag=african_ingredients" },
  { label: "K-Beauty",         q: "tag=korean_ingredients" },
  { label: "In Stock Only",    q: "in_stock=true" },
];

/* ================================================================
   SKELETON
================================================================ */
function SkeletonCard({ list = false }: { list?: boolean }) {
  if (list) return (
    <div style={{ display: "flex", gap: 16, background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, overflow: "hidden", padding: 14, alignItems: "flex-start" }}>
      <div className="shimbox" style={{ width: 140, height: 140, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="shimbox" style={{ width: "30%", height: 10, borderRadius: 4 }} />
        <div className="shimbox" style={{ width: "80%", height: 14, borderRadius: 4 }} />
        <div className="shimbox" style={{ width: "60%", height: 12, borderRadius: 4 }} />
        <div className="shimbox" style={{ width: "40%", height: 18, borderRadius: 4, marginTop: 8 }} />
      </div>
    </div>
  );
  return (
    <div style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, overflow: "hidden" }}>
      <div className="shimbox" style={{ paddingTop: "100%" }} />
      <div style={{ padding: "10px 12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="shimbox" style={{ height: 9, width: "40%", borderRadius: 3 }} />
        <div className="shimbox" style={{ height: 12, width: "90%", borderRadius: 3 }} />
        <div className="shimbox" style={{ height: 12, width: "70%", borderRadius: 3 }} />
        <div className="shimbox" style={{ height: 16, width: "50%", borderRadius: 3, marginTop: 4 }} />
      </div>
    </div>
  );
}

/* ================================================================
   STAR ROW
================================================================ */
function StarRow({ rating, count }: { rating: number; count?: number | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="9" height="9" viewBox="0 0 24 24" fill={Math.round(rating) > i ? "#c8a75a" : "#e0ddd6"} stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
      {count != null && count > 0 && (
        <span style={{ fontSize: 10, color: "var(--gray-500)", marginLeft: 3 }}>({count.toLocaleString()})</span>
      )}
    </div>
  );
}

/* ================================================================
   PRODUCT CARD — GRID VIEW
================================================================ */
function ProductCardGrid({ product, onClick }: { product: ProductListItem; onClick: () => void }) {
  const [imgErr, setImgErr]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [addedCart, setAddedCart] = useState(false);
  const imageUrl = optimizeImg(resolveImg(product.main_image ?? product.image_url ?? null));
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : null;

  return (
    <div onClick={onClick} style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.25s, transform 0.25s", position: "relative", display: "flex", flexDirection: "column" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-elevated)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      {/* Image */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {imageUrl && !imgErr
          ? <img src={imageUrl} alt={product.title} onError={() => setImgErr(true)} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block", transition: "transform 0.35s" }} loading="lazy" onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")} onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
          : <div style={{ aspectRatio: "1/1", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🛍️</div>
        }
        {/* Badges */}
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 2 }}>
          {discount != null && discount >= 5 && <span style={{ background: "#c0392b", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>-{discount}%</span>}
          {!product.in_stock && <span style={{ background: "rgba(0,0,0,0.6)", color: "white", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>Sold Out</span>}
          {product.rating && product.rating >= 4.5 && <span style={{ background: "#c8a75a", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>⭐ TOP</span>}
        </div>
        {/* Wishlist */}
        <button onClick={e => { e.stopPropagation(); setSaved(!saved); }} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} style={{ position: "absolute", top: 8, right: 8, zIndex: 3, width: 32, height: 32, borderRadius: "50%", background: "white", border: "none", boxShadow: "var(--shadow-soft)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "auto", padding: 0, transition: "transform 0.2s" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? "#c0392b" : "none"} stroke={saved ? "#c0392b" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        {/* Quick view hover bar */}
        <div className="pcard-quick-bar" style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15,63,47,0.9)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", fontSize: 11, fontWeight: 700, color: "white", letterSpacing: 0.3, transform: "translateY(100%)", transition: "transform 0.22s ease" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View Details
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "10px 12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        {product.brand && <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--primary)" }}>{product.brand}</div>}
        <div style={{ fontSize: 13, color: "var(--gray-800)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>{product.title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gray-900)" }}>{formatCurrency(product.price)}</span>
          {product.compare_price && product.compare_price > product.price && <span style={{ fontSize: 11, color: "var(--gray-400)", textDecoration: "line-through" }}>{formatCurrency(product.compare_price)}</span>}
        </div>
        {product.rating != null && product.rating > 0 && <StarRow rating={product.rating} count={product.rating_number} />}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: product.in_stock ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: product.in_stock ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{product.in_stock ? "In Stock" : "Out of Stock"}</span>
        </div>
        {product.in_stock && (
          <button onClick={e => { e.stopPropagation(); setAddedCart(true); setTimeout(() => setAddedCart(false), 2000); }} style={{ marginTop: 8, width: "100%", padding: "9px", background: addedCart ? "#22c55e" : "var(--primary)", color: "white", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.25s", fontFamily: "inherit", minHeight: "auto" }}>
            {addedCart ? "✓ Added to Cart" : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>Add to Cart</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   PRODUCT CARD — LIST VIEW
================================================================ */
function ProductCardList({ product, onClick }: { product: ProductListItem; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const [saved, setSaved]   = useState(false);
  const imageUrl = optimizeImg(resolveImg(product.main_image ?? product.image_url ?? null));
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : null;
  return (
    <div onClick={onClick} style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.25s", display: "flex", position: "relative" }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card)")}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
    >
      <div style={{ width: 180, height: 180, flexShrink: 0, position: "relative", overflow: "hidden" }}>
        {imageUrl && !imgErr
          ? <img src={imageUrl} alt={product.title} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          : <div style={{ width: "100%", height: "100%", background: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🛍️</div>
        }
        {discount != null && discount >= 5 && <span style={{ position: "absolute", top: 8, left: 8, background: "#c0392b", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, zIndex: 2 }}>-{discount}%</span>}
      </div>
      <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
        {product.brand && <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--primary)" }}>{product.brand}</div>}
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-900)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.title}</div>
        {product.rating != null && product.rating > 0 && <StarRow rating={product.rating} count={product.rating_number} />}
        {product.category && <div style={{ fontSize: 11, color: "var(--gray-500)" }}>Category: {TAG_LABEL[product.category] ?? product.category}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: product.in_stock ? "#22c55e" : "#ef4444" }} />
          <span style={{ fontSize: 11, color: product.in_stock ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{product.in_stock ? "In Stock" : "Out of Stock"}</span>
        </div>
      </div>
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", minWidth: 160, borderLeft: "1px solid var(--gray-100)" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--gray-900)" }}>{formatCurrency(product.price)}</div>
          {product.compare_price && product.compare_price > product.price && <div style={{ fontSize: 12, color: "var(--gray-400)", textDecoration: "line-through", marginTop: 2 }}>{formatCurrency(product.compare_price)}</div>}
          {discount && discount >= 5 && <div style={{ fontSize: 11, color: "#c0392b", fontWeight: 700, marginTop: 4 }}>Save {discount}%</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {product.in_stock && (
            <button onClick={e => e.stopPropagation()} style={{ background: "var(--primary)", color: "white", border: "none", padding: "10px 20px", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", minHeight: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Add to Cart
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); setSaved(!saved); }} style={{ background: "transparent", border: `1.5px solid ${saved ? "#c0392b" : "var(--gray-300)"}`, color: saved ? "#c0392b" : "var(--gray-600)", padding: "8px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, minHeight: "auto" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={saved ? "#c0392b" : "none"} stroke={saved ? "#c0392b" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {saved ? "Saved" : "Wishlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   FILTER CHIP
================================================================ */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(15,63,47,0.08)", border: "1px solid rgba(15,63,47,0.2)", color: "var(--primary)", fontSize: 12, fontWeight: 600, padding: "5px 10px 5px 12px", borderRadius: 20 }}>
      {label}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, minHeight: "auto", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", opacity: 0.7, borderRadius: "50%" }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

/* ================================================================
   COLLAPSIBLE FILTER SECTION
================================================================ */
function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--gray-200)" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", minHeight: "auto" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-900)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0, color: "var(--gray-500)" }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function StoreClient() {
  const router = useRouter();
  const params = useSearchParams();

  /* ── State ── */
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  /* ── Filters — initialised from URL params ── */
  const [searchQuery,       setSearchQuery]       = useState(params.get("q") ?? "");
  const [searchInput,       setSearchInput]       = useState(params.get("q") ?? "");
  const [sort,              setSort]              = useState<SortOption>((params.get("sort") as SortOption) ?? "newest");
  const [selectedCategory,  setSelectedCategory]  = useState(params.get("category") ?? "");
  const [selectedBrand,     setSelectedBrand]     = useState(params.get("brand") ?? "");
  const [selectedMainCat,   setSelectedMainCat]   = useState(params.get("main_cat") ?? "");
  const [selectedTag,       setSelectedTag]       = useState(params.get("tag") ?? "");
  const [priceMin,          setPriceMin]          = useState(params.get("min_price") ?? "");
  const [priceMax,          setPriceMax]          = useState(params.get("max_price") ?? "");
  const [inStockOnly,       setInStockOnly]       = useState(params.get("in_stock") === "true");
  const [minRating,         setMinRating]         = useState(params.get("min_rating") ?? "");
  const [activeQuick,       setActiveQuick]       = useState("");
  const [viewMode,          setViewMode]          = useState<ViewMode>("grid");
  const [showMobileFilter,  setShowMobileFilter]  = useState(false);

  /* ── Sidebar metadata ── */
  const [sidebarBrands, setSidebarBrands] = useState<string[]>([]);

  const hasFilters = !!(searchQuery || selectedCategory || selectedBrand || selectedMainCat || selectedTag || priceMin || priceMax || inStockOnly || minRating);

  /* ── Clear all ── */
  const clearAllFilters = useCallback(() => {
    setSearchQuery(""); setSearchInput(""); setSelectedCategory("");
    setSelectedBrand(""); setSelectedMainCat(""); setSelectedTag(""); setPriceMin(""); setPriceMax("");
    setInStockOnly(false); setMinRating(""); setActiveQuick(""); setSort("newest");
  }, []);

  /* ── Fetch sidebar brands from GET /api/brands → [{ name, slug }] ── */
  useEffect(() => {
    fetch(`${API}/api/brands`)
      .then(r => r.ok ? r.json() : [])
      .then((data: { name?: string; slug?: string }[]) => {
        const names = Array.isArray(data)
          ? data.map(b => b.name ?? b.slug ?? "").filter(Boolean)
          : [];
        setSidebarBrands(names.slice(0, 20));
      })
      .catch(() => {});
  }, []);

  /* ================================================================
     LOAD PRODUCTS — single strategy: GET /api/products
     Params: q, category, brand, tag, min_price, max_price,
             in_stock, min_rating, sort, page, per_page
  ================================================================ */
  const loadProducts = useCallback(async (pg = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const apiSort = SORT_API_MAP[sort];
      const qs = new URLSearchParams({ sort: apiSort, page: String(pg), per_page: String(PAGE_SIZE) });
      if (searchQuery)      qs.set("q",           searchQuery);
      if (selectedCategory) qs.set("category",    selectedCategory);
      if (selectedBrand)    qs.set("brand",        selectedBrand);
      if (selectedTag)      qs.set("tag",          selectedTag);
      if (selectedMainCat)  qs.set("main_category", selectedMainCat);
      if (priceMin)         qs.set("min_price",    priceMin);
      if (priceMax)         qs.set("max_price",    priceMax);
      if (inStockOnly)      qs.set("in_stock",     "true");
      if (minRating)        qs.set("min_rating",   minRating);
      const url = `${API}/api/products?${qs}`;
      const resp = await fetch(url);
      const data: { total?: number; results?: ProductListItem[] } = resp.ok ? await resp.json() : { total: 0, results: [] };

      const items: ProductListItem[] = data.results ?? [];
      const tot:   number            = data.total ?? items.length;

      setProducts(prev => append ? [...prev, ...items] : items);
      setTotal(tot);
      setHasMore(pg * PAGE_SIZE < tot);
      setPage(pg);
    } catch (err) {
      console.error("StoreClient fetch error:", err);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [sort, searchQuery, selectedMainCat, selectedCategory, selectedBrand, selectedTag, priceMin, priceMax, inStockOnly, minRating]);

  /* Re-fetch when any filter/sort changes */
  useEffect(() => { loadProducts(1); }, [
    sort, searchQuery, selectedMainCat, selectedCategory, selectedBrand,
    selectedTag, priceMin, priceMax, inStockOnly, minRating,
  ]);

  /* Quick filter pill handler */
  const selectQuick = (q: string) => {
    setActiveQuick(q);
    // Reset all filters first
    setSort("newest");
    setSelectedCategory(""); setSelectedBrand(""); setSelectedMainCat(""); setSelectedTag("");
    setPriceMin(""); setPriceMax(""); setInStockOnly(false); setMinRating("");
    setSearchQuery(""); setSearchInput("");
    if (!q) return;
    const parsed = new URLSearchParams(q);
    const sortVal = parsed.get("sort");
    const tagVal  = parsed.get("tag");
    const inStock = parsed.get("in_stock");
    if (sortVal) setSort(sortVal as SortOption);
    if (tagVal)  setSelectedTag(tagVal);
    if (inStock === "true") setInStockOnly(true);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(searchInput.trim());
    setActiveQuick("");
  };

  /* ── FILTER PANEL (shared by sidebar + mobile drawer) ── */
  const FilterPanel = () => (
    <div>
      {/* Collection Tags — Skin Concerns */}
      <FilterSection title="Skin Concerns">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {COLLECTION_TAGS.filter(t => t.group === "Skin Concerns").map(t => (
            <label key={t.tag} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13,
              color: selectedTag === t.tag ? "var(--primary)" : "var(--gray-700)",
              fontWeight: selectedTag === t.tag ? 700 : 400 }}>
              <input type="radio" name="tag" checked={selectedTag === t.tag}
                onChange={() => setSelectedTag(selectedTag === t.tag ? "" : t.tag)}
                style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
              <span>{t.emoji}</span> {t.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Collection Tags — Product Types */}
      <FilterSection title="Product Types">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {COLLECTION_TAGS.filter(t => t.group === "Product Types").map(t => (
            <label key={t.tag} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13,
              color: selectedTag === t.tag ? "var(--primary)" : "var(--gray-700)",
              fontWeight: selectedTag === t.tag ? 700 : 400 }}>
              <input type="radio" name="tag" checked={selectedTag === t.tag}
                onChange={() => setSelectedTag(selectedTag === t.tag ? "" : t.tag)}
                style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
              <span>{t.emoji}</span> {t.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Collection Tags — Ingredients */}
      <FilterSection title="Ingredients">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {COLLECTION_TAGS.filter(t => t.group === "Ingredients").map(t => (
            <label key={t.tag} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13,
              color: selectedTag === t.tag ? "var(--primary)" : "var(--gray-700)",
              fontWeight: selectedTag === t.tag ? 700 : 400 }}>
              <input type="radio" name="tag" checked={selectedTag === t.tag}
                onChange={() => setSelectedTag(selectedTag === t.tag ? "" : t.tag)}
                style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
              <span>{t.emoji}</span> {t.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[["MIN (M)", priceMin, setPriceMin, "0"], ["MAX (M)", priceMax, setPriceMax, "Any"]].map(([label, val, setter, ph]) => (
              <div key={label as string} style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: "var(--gray-500)", marginBottom: 4, display: "block", fontWeight: 600 }}>{label as string}</label>
                <input type="number" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} placeholder={ph as string} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--gray-300)", borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--gray-300)")} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[["Under M500","","500"],["M500–1000","500","1000"],["M1000–3000","1000","3000"],["M3000+","3000",""]].map(([label, min, max]) => (
              <button key={label} onClick={() => { setPriceMin(min); setPriceMax(max); }} style={{ fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 20, border: `1.5px solid ${priceMin === min && priceMax === max ? "var(--primary)" : "var(--gray-300)"}`, background: priceMin === min && priceMax === max ? "var(--primary)" : "transparent", color: priceMin === min && priceMax === max ? "white" : "var(--gray-700)", cursor: "pointer", fontFamily: "inherit", minHeight: "auto" }}>{label}</button>
            ))}
          </div>
        </div>
      </FilterSection>

      {/* Star rating */}
      <FilterSection title="Customer Reviews">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["4","3","2",""].map(r => (
            <label key={r} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
              {r ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {Array.from({ length: 5 }).map((_, i) => <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={i < Number(r) ? "#c8a75a" : "#e0ddd6"} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}
                  <span style={{ fontSize: 12, color: "var(--gray-600)" }}>&amp; up</span>
                </div>
              ) : <span style={{ fontSize: 13, color: "var(--gray-600)" }}>All ratings</span>}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability">
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--gray-700)" }}>
          <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} style={{ accentColor: "var(--primary)", cursor: "pointer", width: 15, height: 15 }} />
          In Stock Only
        </label>
      </FilterSection>

      {/* Brands */}
      {sidebarBrands.length > 0 && (
        <FilterSection title="Brand" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 200, overflowY: "auto" }}>
            {sidebarBrands.map(b => (
              <label key={b} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: selectedBrand === b ? "var(--primary)" : "var(--gray-700)" }}>
                <input type="radio" name="brand" checked={selectedBrand === b} onChange={() => setSelectedBrand(selectedBrand === b ? "" : b)} style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
                {b}
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Sort */}
      <FilterSection title="Sort By" defaultOpen={false}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
            <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: sort === v ? "var(--primary)" : "var(--gray-700)" }}>
              <input type="radio" name="sort_side" checked={sort === v} onChange={() => setSort(v)} style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
              {l}
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  /* ── RENDER ── */
  return (
    <div style={{ background: "var(--gray-50)", minHeight: "100vh" }}>
      <style>{`
        .shimbox{background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pcard-wrap:hover .pcard-quick-bar{transform:translateY(0) !important;}
        *{box-sizing:border-box;}
      `}</style>

      {/* ── STICKY SEARCH BAR (uses GET /api/products with q=) ── */}
      <div style={{ background: "var(--primary)", padding: "14px 0", position: "sticky", top: 70, zIndex: 100, borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Search form */}
          <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", background: "white", borderRadius: 8, overflow: "hidden", maxWidth: 680 }}>
            {/* Tag quick-select */}
            <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} style={{ background: "var(--gray-100)", border: "none", borderRight: "1px solid var(--gray-200)", padding: "0 12px", fontSize: 12, color: "var(--gray-700)", fontFamily: "inherit", cursor: "pointer", outline: "none", minHeight: "auto", height: "100%" }}>
              <option value="">All</option>
              <optgroup label="Skin Concerns">
                {COLLECTION_TAGS.filter(t => t.group === "Skin Concerns").map(t => (
                  <option key={t.tag} value={t.tag}>{t.label}</option>
                ))}
              </optgroup>
              <optgroup label="Product Types">
                {COLLECTION_TAGS.filter(t => t.group === "Product Types").map(t => (
                  <option key={t.tag} value={t.tag}>{t.label}</option>
                ))}
              </optgroup>
              <optgroup label="Ingredients">
                {COLLECTION_TAGS.filter(t => t.group === "Ingredients").map(t => (
                  <option key={t.tag} value={t.tag}>{t.label}</option>
                ))}
              </optgroup>
            </select>
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search for products, brands and more..." style={{ flex: 1, padding: "12px 16px", border: "none", fontSize: 14, fontFamily: "inherit", outline: "none", color: "var(--gray-900)" }} />
            <button type="submit" style={{ background: "var(--accent)", border: "none", padding: "0 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "auto", transition: "background 0.2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#b8960a")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </form>

          {/* Sort dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>Sort:</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortOption)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "white", padding: "8px 12px", borderRadius: 7, fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none", minHeight: "auto" }}>
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
                <option key={v} value={v} style={{ background: "white", color: "var(--gray-900)" }}>{l}</option>
              ))}
            </select>
          </div>

          {/* Grid / List toggle */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: 3 }}>
            {(["grid","list"] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} aria-label={mode === "grid" ? "Grid view" : "List view"} style={{ background: viewMode === mode ? "white" : "transparent", border: "none", width: 34, height: 34, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "auto", padding: 0, color: viewMode === mode ? "var(--primary)" : "rgba(255,255,255,0.7)", transition: "background 0.2s" }}>
                {mode === "grid"
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                }
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── QUICK FILTER TABS ── */}
      <div style={{ background: "white", borderBottom: "1px solid var(--gray-200)", overflowX: "auto", scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", display: "flex", alignItems: "center", gap: 0 }}>
          {QUICK_FILTERS.map(qf => (
            <button key={qf.q} onClick={() => selectQuick(qf.q)} style={{ padding: "13px 18px", border: "none", background: "none", borderBottom: activeQuick === qf.q ? "2.5px solid var(--primary)" : "2.5px solid transparent", color: activeQuick === qf.q ? "var(--primary)" : "var(--gray-700)", fontWeight: activeQuick === qf.q ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "color 0.2s, border-color 0.2s", minHeight: "auto" }}>
              {qf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BREADCRUMBS ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px clamp(16px,4vw,40px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--gray-500)" }}>
          <Link href="/" style={{ color: "var(--gray-500)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/store" style={{ color: "var(--gray-500)", textDecoration: "none" }}>Store</Link>
          {selectedMainCat && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{selectedMainCat}</span></>}
          {selectedTag && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{TAG_LABEL[selectedTag] ?? selectedTag}</span></>}
          {selectedCategory && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{selectedCategory}</span></>}
          {searchQuery && <><span>/</span><span style={{ color: "var(--gray-700)", fontWeight: 600 }}>Search: &ldquo;{searchQuery}&rdquo;</span></>}
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 clamp(16px,4vw,40px) 60px", display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: 240, flexShrink: 0, background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, overflow: "hidden", position: "sticky", top: 160, maxHeight: "calc(100vh - 180px)", overflowY: "auto", scrollbarWidth: "none" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--gray-50)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--gray-900)", textTransform: "uppercase", letterSpacing: 0.5 }}>Refine</span>
            </div>
            {hasFilters && (
              <button onClick={clearAllFilters} style={{ fontSize: 10, fontWeight: 700, color: "#c0392b", background: "none", border: "1px solid #c0392b", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", minHeight: "auto" }}>CLEAR ALL</button>
            )}
          </div>
          <FilterPanel />
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Controls bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "white", border: "1px solid var(--gray-200)", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
            {/* Mobile filter button */}
            <button onClick={() => setShowMobileFilter(true)} style={{ display: "none", alignItems: "center", gap: 6, background: "var(--primary)", color: "white", border: "none", padding: "9px 16px", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", minHeight: "auto" }} className="mob-filter-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters
              {hasFilters && <span style={{ background: "#c0392b", color: "white", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 10, marginLeft: 2 }}>ON</span>}
            </button>

            <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
              {loading ? "Loading products…" : (
                <>Showing <strong style={{ color: "var(--gray-900)" }}>{products.length.toLocaleString()}</strong>{" / "}<strong style={{ color: "var(--gray-900)" }}>{total.toLocaleString()}</strong>{" products"}{searchQuery && <> — <em style={{ color: "var(--primary)" }}>&ldquo;{searchQuery}&rdquo;</em></>}</>
              )}
            </div>

            <select value={sort} onChange={e => setSort(e.target.value as SortOption)} style={{ padding: "7px 12px", borderRadius: 7, border: "1.5px solid var(--gray-300)", fontSize: 13, fontFamily: "inherit", color: "var(--gray-700)", cursor: "pointer", outline: "none", background: "white", minHeight: "auto", marginLeft: "auto" }}>
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {selectedMainCat && <FilterChip label={selectedMainCat} onRemove={() => setSelectedMainCat("")} />}
              {selectedTag && <FilterChip label={TAG_LABEL[selectedTag] ?? selectedTag} onRemove={() => setSelectedTag("")} />}
              {searchQuery && <FilterChip label={`Search: "${searchQuery}"`} onRemove={() => { setSearchQuery(""); setSearchInput(""); setActiveQuick(""); }} />}
              {selectedCategory && <FilterChip label={TAG_LABEL[selectedCategory] ?? selectedCategory} onRemove={() => setSelectedCategory("")} />}
              {selectedBrand && <FilterChip label={`Brand: ${selectedBrand}`} onRemove={() => setSelectedBrand("")} />}
              {(priceMin || priceMax) && <FilterChip label={`M${priceMin || "0"} – M${priceMax || "∞"}`} onRemove={() => { setPriceMin(""); setPriceMax(""); }} />}
              {inStockOnly && <FilterChip label="In Stock Only" onRemove={() => setInStockOnly(false)} />}
              {minRating && <FilterChip label={`${minRating}+ Stars`} onRemove={() => setMinRating("")} />}
              <button onClick={clearAllFilters} style={{ fontSize: 12, fontWeight: 700, color: "#c0392b", background: "none", border: "1.5px solid #c0392b", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", minHeight: "auto" }}>Clear All ×</button>
            </div>
          )}

          {/* Product grid / list */}
          {loading ? (
            <div style={{ display: viewMode === "grid" ? "grid" : "flex", gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill,minmax(200px,1fr))" : undefined, flexDirection: viewMode === "list" ? "column" : undefined, gap: 12 }}>
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} list={viewMode === "list"} />)}
            </div>
          ) : products.length === 0 ? (
            <div style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: 12, padding: "80px 40px", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, background: "var(--gray-100)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>🔍</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-900)", margin: "0 0 10px" }}>{searchQuery ? `No results for "${searchQuery}"` : "No products found"}</h3>
              <p style={{ fontSize: 14, color: "var(--gray-500)", marginBottom: 24 }}>Try adjusting your filters or search terms.</p>
              <button onClick={clearAllFilters} style={{ background: "var(--primary)", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Browse All Products</button>
            </div>
          ) : (
            <>
              <div style={{ display: viewMode === "grid" ? "grid" : "flex", gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill,minmax(200px,1fr))" : undefined, flexDirection: viewMode === "list" ? "column" : undefined, gap: 12 }}>
                {products.map((p, i) => (
                  <div key={p.id} className={viewMode === "grid" ? "pcard-wrap" : undefined} style={{ opacity: 0, animation: `fadeInUp 0.4s ease ${Math.min(i, 15) * 35}ms forwards` }}>
                    {viewMode === "grid"
                      ? <ProductCardGrid product={p} onClick={() => router.push(`/store/product/${p.id}`)} />
                      : <ProductCardList product={p} onClick={() => router.push(`/store/product/${p.id}`)} />
                    }
                  </div>
                ))}
              </div>

              {/* Load more + pagination */}
              {hasMore && (
                <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    Showing <strong>{products.length.toLocaleString()}</strong> of <strong>{total.toLocaleString()}</strong> products
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: "100%", maxWidth: 400, height: 6, background: "var(--gray-200)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(products.length / total) * 100}%`, background: "var(--primary)", borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                  <button onClick={() => loadProducts(page + 1, true)} disabled={loadingMore} style={{ background: loadingMore ? "var(--gray-300)" : "var(--primary)", color: loadingMore ? "var(--gray-600)" : "white", border: "none", padding: "13px 40px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: loadingMore ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.2s, transform 0.2s" }}
                    onMouseEnter={e => { if (!loadingMore) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = "none")}
                  >
                    {loadingMore
                      ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--gray-400)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Loading…</span>
                      : "Load More Products"}
                  </button>
                  {/* Page number buttons */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(pg => (
                      <button key={pg} onClick={() => loadProducts(pg)} style={{ width: 36, height: 36, borderRadius: 7, border: pg === page ? "none" : "1.5px solid var(--gray-300)", background: pg === page ? "var(--primary)" : "white", color: pg === page ? "white" : "var(--gray-700)", fontWeight: pg === page ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", minHeight: "auto", transition: "background 0.2s" }}>{pg}</button>
                    ))}
                    {totalPages > 10 && <span style={{ color: "var(--gray-400)", fontSize: 13, display: "flex", alignItems: "center" }}>…{totalPages}</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── MOBILE FILTER DRAWER ── */}
      <div onClick={() => setShowMobileFilter(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998, opacity: showMobileFilter ? 1 : 0, pointerEvents: showMobileFilter ? "auto" : "none", transition: "opacity 0.3s" }} />
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 300, background: "white", zIndex: 9999, transform: showMobileFilter ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--primary)" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: 0.5 }}>Filter &amp; Sort</span>
          <button onClick={() => setShowMobileFilter(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, cursor: "pointer", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "white", minHeight: "auto", padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}><FilterPanel /></div>
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--gray-200)", background: "var(--gray-50)" }}>
          <button onClick={() => setShowMobileFilter(false)} style={{ width: "100%", background: "var(--primary)", color: "white", border: "none", padding: "13px", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Show {total.toLocaleString()} Results</button>
        </div>
      </div>
    </div>
  );
}