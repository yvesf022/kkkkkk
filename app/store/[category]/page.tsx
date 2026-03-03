"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

import ProductCard from "@/components/store/ProductCard";

const PER_PAGE = 40;

export default function CategoryStorePage() {
  const { category } = useParams<{ category: string }>();
  const router = useRouter();

  const [products, setProducts]       = useState<ProductListItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(false);

  /* ============ LOAD A PAGE OF PRODUCTS ============ */
  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else        setLoading(true);

      const slug = decodeURIComponent(category);

      // productsApi.list response shape: { results: ProductListItem[], total: number }
      const res = await productsApi.list({
        category: slug,
        status:   "active",
        page:     pageNum,
        per_page: PER_PAGE,
      } as any);

      const incoming = (res as any).results ?? res ?? [];
      const newTotal = (res as any).total   ?? incoming.length;

      setTotal(newTotal);
      setProducts(prev => {
        const next = append ? [...prev, ...incoming] : incoming;
        setHasMore(next.length < newTotal);
        return next;
      });
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category]);

  // Reset + first page whenever category changes
  useEffect(() => {
    if (!category) return;
    setProducts([]);
    setPage(1);
    setHasMore(false);
    loadPage(1, false);
  }, [category]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next, true);
  };

  const categoryTitle = category
    ? decodeURIComponent(category).replace(/_/g, "-").toUpperCase()
    : "STORE";

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px clamp(16px, 4vw, 40px)" }}>

      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <button
          onClick={() => router.push("/store")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#0f3f2f", fontWeight: 800, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          ← BACK TO ALL PRODUCTS
        </button>

        <h1 style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 900, marginBottom: 8, color: "#0f3f2f" }}>
          {categoryTitle}
        </h1>
        <p style={{ fontSize: 16, opacity: 0.6 }}>
          {loading ? "Loading…" : `${total} ${total === 1 ? "Product" : "Products"} available`}
        </p>
      </header>

      {/* INITIAL LOADING SHIMMER */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="shimbox" style={{ height: 420, borderRadius: 20 }} />
          ))}
        </div>
      )}

      {/* PRODUCTS GRID */}
      {!loading && products.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* LOAD MORE SECTION */}
          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>

            {/* Progress bar */}
            <div style={{ width: "100%", maxWidth: 480, background: "#e5e7eb", borderRadius: 99, height: 6, overflow: "hidden" }}>
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
                  marginTop: 4,
                  background: loadingMore ? "#e5e7eb" : "#0f3f2f",
                  color: loadingMore ? "#9ca3af" : "white",
                  border: "none",
                  padding: "14px 48px",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loadingMore ? "not-allowed" : "pointer",
                  transition: "background 0.2s, transform 0.15s",
                  letterSpacing: 0.3,
                }}
                onMouseEnter={e => { if (!loadingMore) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
              >
                {loadingMore ? "Loading…" : `Load More  (${total - products.length} remaining)`}
              </button>
            )}

            {!hasMore && (
              <p style={{ fontSize: 13, color: "#0f3f2f", fontWeight: 700 }}>
                ✓ All {total} products loaded
              </p>
            )}
          </div>
        </>
      )}

      {/* LOAD MORE SHIMMER (appended rows) */}
      {loadingMore && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, marginTop: 20 }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="shimbox" style={{ height: 420, borderRadius: 20 }} />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && products.length === 0 && (
        <div style={{
          padding: "100px 20px", textAlign: "center", borderRadius: 22,
          background: "white", border: "1px solid #eee", boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📦</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: "#0f3f2f" }}>Nothing here yet</h3>
          <p style={{ fontSize: 16, opacity: 0.6, marginBottom: 30 }}>
            We're currently restocking our {categoryTitle.toLowerCase()} collection.
          </p>
          <button
            onClick={() => router.push("/store")}
            style={{
              background: "#0f3f2f", color: "white", border: "none",
              padding: "14px 32px", borderRadius: 10, fontWeight: 800, cursor: "pointer"
            }}
          >
            Explore Other Categories
          </button>
        </div>
      )}

      <style>{`
        .shimbox { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </div>
  );
}