"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { productsApi, searchApi, categoriesApi, brandsApi } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/* ================================================================
   TYPES
================================================================ */
type SortOption = "newest" | "price_asc" | "price_desc" | "rating" | "popular";
type ViewMode = "grid" | "list";

const SORT_LABELS: Record<SortOption, string> = {
  newest:     "Newest First",
  price_asc:  "Price: Low to High",
  price_desc: "Price: High to Low",
  rating:     "Top Rated",
  popular:    "Most Popular",
};

// Maps our UI sort options → backend query params
const SORT_MAP: Record<SortOption, Record<string, string>> = {
  newest:     { sort_by: "created_at", sort_order: "desc" },
  price_asc:  { sort_by: "price",      sort_order: "asc"  },
  price_desc: { sort_by: "price",      sort_order: "desc" },
  rating:     { sort_by: "rating",     sort_order: "desc" },
  popular:    { sort_by: "sales",      sort_order: "desc" },
};

const PAGE_SIZE = 24;

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function StoreClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Products
  const [products, setProducts]       = useState<ProductListItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]               = useState(1);

  // Filter state
  const [searchQuery, setSearchQuery]         = useState(searchParams.get("q") ?? "");
  const [searchInput, setSearchInput]         = useState(searchParams.get("q") ?? "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") ?? "");
  const [selectedBrand, setSelectedBrand]     = useState("");
  const [sort, setSort]                       = useState<SortOption>("newest");
  const [priceMin, setPriceMin]               = useState("");
  const [priceMax, setPriceMax]               = useState("");
  const [inStockOnly, setInStockOnly]         = useState(false);
  const [viewMode, setViewMode]               = useState<ViewMode>("grid");
  const [showFilters, setShowFilters]         = useState(false);

  // Filter data
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands]         = useState<any[]>([]);

  // Search suggestions
  const [suggestions, setSuggestions]     = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef      = useRef<HTMLDivElement>(null);

  /* ---- Load filter data ---- */
  useEffect(() => {
    Promise.allSettled([categoriesApi.list(), brandsApi.list()]).then(([c, b]) => {
      if (c.status === "fulfilled") setCategories((c.value as any) ?? []);
      if (b.status === "fulfilled") setBrands((b.value as any) ?? []);
    });
  }, []);

  /* ---- Load products ---- */
  const loadProducts = useCallback(async (pg = 1, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);

    try {
      const params: Record<string, any> = {
        page:     pg,
        per_page: PAGE_SIZE,
        ...SORT_MAP[sort],
      };

      if (selectedCategory) params.category  = selectedCategory;
      if (selectedBrand)    params.brand      = selectedBrand;
      if (priceMin)         params.min_price  = Number(priceMin);
      if (priceMax)         params.max_price  = Number(priceMax);
      if (inStockOnly)      params.in_stock   = true;

      let results: ProductListItem[];
      let totalCount: number;

      if (searchQuery.trim()) {
        // Search endpoint: GET /api/search?q=...
        const res = await searchApi.search({ q: searchQuery.trim(), ...params }) as any;
        results    = res?.products ?? res?.results ?? [];
        totalCount = res?.total ?? results.length;
      } else {
        // Products endpoint: GET /api/products?...
        const res  = await productsApi.list(params);
        results    = res?.results ?? [];
        totalCount = res?.total   ?? results.length;
      }

      if (append) {
        setProducts((prev) => [...prev, ...results]);
      } else {
        setProducts(results);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setTotal(totalCount);
      setPage(pg);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedCategory, selectedBrand, sort, priceMin, priceMax, inStockOnly]);

  useEffect(() => { loadProducts(1); }, [loadProducts]);

  /* ---- Search suggestions ---- */
  function handleSearchInput(val: string) {
    setSearchInput(val);
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    if (val.length < 2) { setSuggestions([]); return; }
    suggestTimeout.current = setTimeout(async () => {
      try {
        const res = await searchApi.suggestions(val, 6) as any;
        setSuggestions(res?.suggestions ?? res ?? []);
        setShowSuggestions(true);
      } catch {}
    }, 300);
  }

  function commitSearch(val?: string) {
    const q = val ?? searchInput;
    setSearchQuery(q);
    setShowSuggestions(false);
    setPage(1);
  }

  /* ---- Close suggestions on outside click ---- */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---- Derived ---- */
  const totalPages     = Math.ceil(total / PAGE_SIZE);
  const hasMore        = page < totalPages;
  const hasActiveFilters = !!(selectedCategory || selectedBrand || priceMin || priceMax || inStockOnly || searchQuery);

  function clearFilters() {
    setSearchQuery(""); setSearchInput("");
    setSelectedCategory(""); setSelectedBrand("");
    setPriceMin(""); setPriceMax("");
    setInStockOnly(false);
    setSort("newest");
  }

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ background: "#fafaf8", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ============================================================
          HEADER
      ============================================================ */}
      <div style={{
        background: "linear-gradient(160deg, #08091a, #0a1845 50%, #003520)",
        padding: "clamp(40px, 6vw, 72px) clamp(20px, 5vw, 80px) clamp(32px, 4vw, 56px)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,51,160,0.3) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(30px)" }} />
        <div style={{ position: "absolute", bottom: -40, left: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,149,67,0.25) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(25px)" }} />

        <div style={{ maxWidth: 1440, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#d4af37", marginBottom: 12 }}>
            — Karabo Store
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 400, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em", fontFamily: "Georgia, serif" }}>
            All Products
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, margin: 0, fontWeight: 300 }}>
            {total > 0
              ? `${total.toLocaleString()} products${selectedCategory ? ` in ${selectedCategory}` : ""}`
              : "Discover our full collection"}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(16px, 4vw, 64px)" }}>

        {/* ============================================================
            CONTROLS BAR
        ============================================================ */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          padding: "20px 0", borderBottom: "1px solid #e8e4df",
          position: "sticky", top: 0, background: "#fafaf8", zIndex: 10,
        }}>

          {/* Search */}
          <div ref={searchRef} style={{ position: "relative", flex: "1 1 260px", maxWidth: 420 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 16, pointerEvents: "none" }}>🔍</span>
              <input
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitSearch()}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                style={{
                  width: "100%", padding: "11px 40px 11px 42px", borderRadius: 12,
                  border: "1.5px solid #e2e0db", background: "#fff", fontSize: 14,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); setSearchQuery(""); setSuggestions([]); }}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}
                >✕</button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", borderRadius: 12, border: "1.5px solid #e2e0db", boxShadow: "0 12px 32px rgba(0,0,0,0.12)", zIndex: 50, overflow: "hidden" }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setSearchInput(s); commitSearch(s); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 14, color: "#0f172a" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ color: "#94a3b8" }}>🔍</span> {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 16px", borderRadius: 10,
              border: `1.5px solid ${hasActiveFilters ? "#0033a0" : "#e2e0db"}`,
              background: hasActiveFilters ? "#eff4ff" : "#fff",
              color: hasActiveFilters ? "#0033a0" : "#475569",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            ⚙ Filters {hasActiveFilters && (
              <span style={{ background: "#0033a0", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 11 }}>
                {[selectedCategory, selectedBrand, priceMin || priceMax, inStockOnly].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e0db", background: "#fff", fontSize: 13, color: "#0f172a", fontWeight: 600, cursor: "pointer", outline: "none" }}
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #fca5a5", background: "#fff1f2", color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              ✕ Clear
            </button>
          )}

          {/* View mode */}
          <div style={{ display: "flex", marginLeft: "auto", gap: 4 }}>
            {(["grid", "list"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${viewMode === m ? "#0f172a" : "#e2e0db"}`, background: viewMode === m ? "#0f172a" : "#fff", color: viewMode === m ? "#fff" : "#64748b", cursor: "pointer", fontSize: 14 }}
              >
                {m === "grid" ? "⊞" : "☰"}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================
            FILTER PANEL
        ============================================================ */}
        <div style={{
          overflow: "hidden",
          maxHeight: showFilters ? 600 : 0,
          transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
          opacity: showFilters ? 1 : 0,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, border: "1px solid #e8e4df",
            padding: "24px 28px", margin: "12px 0",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24,
          }}>
            {/* Category */}
            <div>
              <label style={filterLabel}>Category</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={filterSelect}>
                <option value="">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c.id ?? c.slug} value={c.slug ?? c.name}>
                    {c.name} {c.product_count ? `(${c.product_count})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label style={filterLabel}>Brand</label>
              <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} style={filterSelect}>
                <option value="">All Brands</option>
                {brands.map((b: any) => (
                  <option key={b.id ?? b.slug} value={b.slug ?? b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label style={filterLabel}>Price Range</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} style={{ ...filterInput, flex: 1 }} />
                <span style={{ color: "#94a3b8" }}>–</span>
                <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} style={{ ...filterInput, flex: 1 }} />
              </div>
            </div>

            {/* In stock toggle */}
            <div>
              <label style={filterLabel}>Availability</label>
              <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                <div
                  onClick={() => setInStockOnly(!inStockOnly)}
                  style={{ width: 44, height: 24, borderRadius: 99, background: inStockOnly ? "#0033a0" : "#e2e0db", position: "relative", transition: "background 0.2s", cursor: "pointer", flexShrink: 0 }}
                >
                  <div style={{ position: "absolute", top: 3, left: inStockOnly ? "calc(100% - 21px)" : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>In Stock Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* ============================================================
            ACTIVE FILTER CHIPS
        ============================================================ */}
        {hasActiveFilters && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 0 4px" }}>
            {searchQuery     && <FilterChip label={`"${searchQuery}"`}  onRemove={() => { setSearchQuery(""); setSearchInput(""); }} />}
            {selectedCategory && <FilterChip label={selectedCategory}    onRemove={() => setSelectedCategory("")} />}
            {selectedBrand   && <FilterChip label={selectedBrand}        onRemove={() => setSelectedBrand("")} />}
            {(priceMin || priceMax) && (
              <FilterChip
                label={`${priceMin ? formatCurrency(Number(priceMin)) : "0"} – ${priceMax ? formatCurrency(Number(priceMax)) : "∞"}`}
                onRemove={() => { setPriceMin(""); setPriceMax(""); }}
              />
            )}
            {inStockOnly && <FilterChip label="In Stock" onRemove={() => setInStockOnly(false)} />}
          </div>
        )}

        {/* ============================================================
            MAIN GRID
        ============================================================ */}
        <div style={{ padding: "24px 0 64px" }}>
          {loading ? (
            <SkeletonGrid count={PAGE_SIZE} mode={viewMode} />
          ) : products.length === 0 ? (
            <EmptyState query={searchQuery} onClear={clearFilters} />
          ) : (
            <>
              {/* Results info */}
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                Showing <strong style={{ color: "#0f172a" }}>{products.length}</strong> of <strong style={{ color: "#0f172a" }}>{total.toLocaleString()}</strong> products
                {searchQuery && <> for <strong style={{ color: "#0033a0" }}>"{searchQuery}"</strong></>}
              </div>

              {viewMode === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: "clamp(12px, 2vw, 22px)" }}>
                  {products.map((p, i) => (
                    <div key={p.id} style={{ animation: `fadeSlideUp 0.4s ease both`, animationDelay: `${Math.min(i, 15) * 40}ms` }}>
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {products.map((p) => (
                    <ListCard key={p.id} product={p} />
                  ))}
                </div>
              )}

              {/* LOAD MORE */}
              {hasMore && (
                <div style={{ textAlign: "center", marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>
                    Page {page} of {totalPages} · {total - products.length} more products
                  </div>
                  <button
                    onClick={() => loadProducts(page + 1, true)}
                    disabled={loadingMore}
                    style={{ padding: "14px 48px", borderRadius: 50, border: "2px solid #0f172a", background: "#fff", color: "#0f172a", fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: loadingMore ? 0.7 : 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#0f172a"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#0f172a"; }}
                  >
                    {loadingMore ? "Loading..." : "Load More Products"}
                  </button>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => loadProducts(pg)}
                        style={{ width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${pg === page ? "#0033a0" : "#e2e0db"}`, background: pg === page ? "#0033a0" : "#fff", color: pg === page ? "#fff" : "#0f172a", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                      >
                        {pg}
                      </button>
                    ))}
                    {totalPages > 10 && <span style={{ display: "flex", alignItems: "center", color: "#94a3b8", fontSize: 14 }}>...</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}

/* ================================================================
   LIST CARD
   FIX: image field — backend returns main_image or image_url
================================================================ */
function ListCard({ product }: { product: ProductListItem }) {
  const router   = useRouter();
  // Resolve whichever image field the API returns
  const imageUrl = product.main_image ?? product.image_url ?? null;
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : null;

  return (
    <div
      onClick={() => router.push(`/store/product/${product.id}`)}
      style={{ display: "flex", gap: 20, alignItems: "center", background: "#fff", borderRadius: 16, border: "1px solid #e8e4df", padding: "16px 20px", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ width: 80, height: 80, borderRadius: 12, background: "#f1f0ee", overflow: "hidden", flexShrink: 0 }}>
        {imageUrl
          ? <img src={imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📦</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.title}</div>
        {product.brand && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{product.brand}</div>}
        {product.short_description && <div style={{ fontSize: 13, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.short_description}</div>}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{formatCurrency(product.price)}</div>
        {product.compare_price && product.compare_price > product.price && (
          <div style={{ fontSize: 12, color: "#94a3b8", textDecoration: "line-through" }}>{formatCurrency(product.compare_price)}</div>
        )}
        {discount && <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>-{discount}%</div>}
      </div>
      <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: product.in_stock ? "#16a34a" : "#dc2626", marginLeft: 8 }} />
    </div>
  );
}

/* ================================================================
   FILTER CHIP
================================================================ */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: "#eff4ff", border: "1px solid #bfdbfe", fontSize: 12, fontWeight: 600, color: "#1e40af" }}>
      {label}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
    </div>
  );
}

/* ================================================================
   EMPTY STATE
================================================================ */
function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 32px", background: "#fff", borderRadius: 20, border: "1px solid #e8e4df" }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🔍</div>
      <h3 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
        {query ? `No results for "${query}"` : "No products found"}
      </h3>
      <p style={{ color: "#6b7280", fontSize: 15, marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
        Try adjusting your search or filters to find what you're looking for.
      </p>
      <button onClick={onClear} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Clear All Filters
      </button>
    </div>
  );
}

/* ================================================================
   SKELETON GRID
================================================================ */
function SkeletonGrid({ count, mode }: { count: number; mode: ViewMode }) {
  if (mode === "list") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 80, borderRadius: 14, background: "linear-gradient(90deg,#f1f0ee 0%,#e4e2de 50%,#f1f0ee 100%)", backgroundSize: "200% 100%", animation: `shimmer 1.4s ease-in-out infinite`, animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "#f1f0ee" }}>
          <div style={{ paddingTop: "100%", background: "linear-gradient(90deg,#f1f0ee 0%,#e4e2de 50%,#f1f0ee 100%)", backgroundSize: "200% 100%", animation: `shimmer 1.4s ease-in-out infinite`, animationDelay: `${i * 50}ms` }} />
          <div style={{ padding: "14px 14px 16px" }}>
            <div style={{ height: 13, borderRadius: 7, background: "#e4e2de", marginBottom: 8 }} />
            <div style={{ height: 16, width: "45%", borderRadius: 7, background: "#e4e2de" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   STYLES
================================================================ */
const filterLabel: React.CSSProperties  = { display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 };
const filterSelect: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e0db", background: "#fff", fontSize: 13, color: "#0f172a", outline: "none", cursor: "pointer" };
const filterInput: React.CSSProperties  = { padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e0db", background: "#fff", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" };