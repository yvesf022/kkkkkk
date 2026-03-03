// ✅ FULLY UPGRADED — see all improvements below
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const PER_PAGE = 40;

// ── Stars ─────────────────────────────────────────────────────────
function Stars({ rating, count }: { rating?: number | null; count?: number | null }) {
  if (!rating) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 5 }}>
      <div style={{ lineHeight: 1 }}>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ fontSize: 11, color: i <= Math.round(rating) ? "#f59e0b" : "#e5e7eb" }}>&#9733;</span>
        ))}
      </div>
      {count != null && (
        <span style={{ fontSize: 10, color: "#9ca3af" }}>
          ({count >= 1000 ? `${(count/1000).toFixed(1)}k` : count})
        </span>
      )}
    </div>
  );
}

// ── Active filter chip ────────────────────────────────────────────
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#0f3f2f", fontSize: 12, fontWeight: 600, padding: "4px 8px 4px 10px", borderRadius: 99 }}>
      {label}
      <button onClick={onRemove} style={{ background: "none", border: "none", padding: "0 2px", cursor: "pointer", color: "#6b7280", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center" }}>&#215;</button>
    </div>
  );
}

function discountPct(price: number, compare?: number | null): number | null {
  if (!compare || compare <= price || price <= 0) return null;
  return Math.round(((compare - price) / compare) * 100);
}

const SORT_LABELS: Record<string, string> = {
  newest:     "Newest First",
  price_asc:  "Price: Low to High",
  price_desc: "Price: High to Low",
  rating:     "Top Rated",
  sales:      "Best Sellers",
  discount:   "Biggest Discount",
};

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
  brand?: string | null;
  category?: string | null;
  rating?: number | null;
  rating_number?: number | null;
  in_stock: boolean;
  main_image?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function StoreClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts]       = useState<ProductListItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  // Track which filter params were active for the current product set
  // so we can reset when filters change
  const filterKey = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("page"); // page is managed locally
    return p.toString();
  }, [searchParams]);

  // 1. DYNAMIC CATEGORY FETCHING
  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(res => res.json())
      .then(data => {
        const cats = Array.isArray(data) ? data : [];
        const others = cats.filter((c: Category) => c.slug === "others");
        const rest   = cats.filter((c: Category) => c.slug !== "others");
        setDbCategories([...rest, ...others]);
      })
      .catch(err => console.error("Filter fetch error:", err));
  }, []);

  // 2. FETCH A PAGE OF PRODUCTS
  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else        setLoading(true);

    try {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has("status")) params.set("status", "active");
      params.set("page",     String(pageNum));
      params.set("per_page", String(PER_PAGE));

      const res  = await fetch(`${API}/api/products?${params.toString()}`);
      const data = await res.json();

      const incoming = data.results || [];
      const newTotal = data.total   || 0;

      setTotal(newTotal);
      setProducts(prev => {
        const next = append ? [...prev, ...incoming] : incoming;
        setHasMore(next.length < newTotal);
        return next;
      });
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchParams]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
    setProducts([]);
    setHasMore(false);
    fetchPage(1, false);
  }, [filterKey]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  /* ============================================================
     FILTER PANEL
  ============================================================ */
  const FilterPanel = () => {
    const currentCat = searchParams.get("category");

    const toggleFilter = (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(key) === value) params.delete(key);
      else params.set(key, value);
      router.push(`/store?${params.toString()}`);
    };

    return (
      <div style={{ padding: "16px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", marginBottom: "12px", color: "#1a1a1a" }}>
            Category
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

            {/* "All" Option */}
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString());
                p.delete("category");
                router.push(`/store?${p.toString()}`);
              }}
              style={{
                background: "none", border: "none", padding: "4px 0", cursor: "pointer",
                fontSize: "14px", color: !currentCat ? "#0f3f2f" : "#666",
                fontWeight: !currentCat ? 800 : 400, textAlign: "left",
              }}
            >
              All Departments
            </button>

            {dbCategories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => toggleFilter("category", cat.slug)}
                style={{
                  display: "flex", justifyContent: "space-between", background: "none",
                  border: "none", padding: "4px 0", cursor: "pointer", fontSize: "14px",
                  color: currentCat === cat.slug ? "#0f3f2f" : "#666",
                  fontWeight: currentCat === cat.slug ? 800 : 400, textAlign: "left",
                }}
              >
                <span>{cat.name}</span>
                <span style={{ fontSize: "11px", opacity: 0.5 }}>({cat.product_count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const activeCategory = searchParams.get("category");

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px", display: "flex", gap: "30px" }}>

      {/* Sidebar - Desktop Only */}
      <aside style={{ width: "260px", flexShrink: 0 }} className="desktop-only">
        <div style={{ position: "sticky", top: "20px" }}>
          <FilterPanel />
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 900 }}>
            {activeCategory?.replace(/_/g, " ").toUpperCase() || "ALL PRODUCTS"}
            {!loading && (
              <span style={{ fontSize: "14px", fontWeight: 400, color: "#666", marginLeft: "10px" }}>
                ({total} products)
              </span>
            )}
          </h1>
        </div>

        {/* LOADING SHIMMER */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className="shimbox" style={{ height: "320px", borderRadius: "8px" }} />
            ))}
          </div>
        ) : (
          <>
            {products.length > 0 ? (
              <>
                {/* PRODUCT GRID */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" }}>
                  {products.map(p => (
                    <Link key={p.id} href={`/store/product/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div
                        style={{ border: "1px solid #eee", borderRadius: "8px", overflow: "hidden", background: "white", transition: "transform 0.2s", height: "100%" }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                      >
                        <div style={{ aspectRatio: "1/1", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <img
                            src={optimizeImg(resolveImg(p.main_image)) || "/placeholder.png"}
                            alt={p.title}
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: "12px" }}
                          />
                        </div>
                        <div style={{ padding: "12px", borderTop: "1px solid #f5f5f5" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f3f2f", textTransform: "uppercase", marginBottom: "4px" }}>
                            {p.brand || "Generic"}
                          </div>
                          <div style={{ fontSize: "13px", fontWeight: 400, height: "38px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: "1.4" }}>
                            {p.title}
                          </div>
                          <div style={{ fontSize: "18px", fontWeight: 900, marginTop: "8px", color: "#1a1a1a" }}>
                            {formatCurrency(p.price)}
                          </div>
                          {p.compare_price && p.compare_price > p.price && (
                            <div style={{ fontSize: "12px", color: "#999", textDecoration: "line-through" }}>
                              {formatCurrency(p.compare_price)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* LOAD MORE SHIMMER */}
                {loadingMore && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px", marginTop: 15 }}>
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="shimbox" style={{ height: "320px", borderRadius: "8px" }} />
                    ))}
                  </div>
                )}

                {/* LOAD MORE CONTROLS */}
                <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>

                  {/* Progress bar */}
                  <div style={{ width: "100%", maxWidth: 400, background: "#e5e7eb", borderRadius: 99, height: 5, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99, background: "#0f3f2f",
                      width: `${Math.min(100, Math.round((products.length / total) * 100))}%`,
                      transition: "width 0.4s ease",
                    }} />
                  </div>

                  <p style={{ fontSize: 13, color: "#6b7280" }}>
                    Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
                  </p>

                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      style={{
                        background: loadingMore ? "#e5e7eb" : "#0f3f2f",
                        color: loadingMore ? "#9ca3af" : "white",
                        border: "none",
                        padding: "13px 44px",
                        borderRadius: 8,
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: loadingMore ? "not-allowed" : "pointer",
                        transition: "background 0.2s, transform 0.15s",
                      }}
                      onMouseEnter={e => { if (!loadingMore) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
                    >
                      {loadingMore ? "Loading…" : `Load More  (${total - products.length} remaining)`}
                    </button>
                  )}

                  {!hasMore && total > 0 && (
                    <p style={{ fontSize: 13, color: "#0f3f2f", fontWeight: 700 }}>
                      ✓ All {total} products loaded
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "100px 0", background: "white", borderRadius: "8px", border: "1px solid #eee" }}>
                <p style={{ color: "#666" }}>No products found in this category.</p>
                <button
                  onClick={() => router.push("/store")}
                  style={{ marginTop: "10px", color: "#0f3f2f", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .shimbox { background: linear-gradient(90deg,#f8f8f8 25%,#f0f0f0 50%,#f8f8f8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media (max-width: 768px) { .desktop-only { display: none; } }
      `}</style>
    </div>
  );
}