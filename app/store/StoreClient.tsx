"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { productsApi, searchApi, categoriesApi, brandsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/* ================================================================
   TYPES
================================================================ */
type SortOption = "newest" | "price_asc" | "price_desc" | "rating" | "popular" | "discount";

const SORT_LABELS: Record<SortOption, string> = {
  newest:     "Newest First",
  price_asc:  "Price: Low → High",
  price_desc: "Price: High → Low",
  rating:     "Top Rated",
  popular:    "Most Popular",
  discount:   "Biggest Discount",
};

const SORT_MAP: Record<SortOption, Record<string, string>> = {
  newest:     { sort_by: "created_at", sort_order: "desc" },
  price_asc:  { sort_by: "price",      sort_order: "asc"  },
  price_desc: { sort_by: "price",      sort_order: "desc" },
  rating:     { sort_by: "rating",     sort_order: "desc" },
  popular:    { sort_by: "sales",      sort_order: "desc" },
  discount:   { sort: "discount" },
};

const PAGE_SIZE = 40;

/* ================================================================
   PRODUCT CARD — luxury Jumia style, SVG only
================================================================ */
function ProductCard({ product, onClick }: {
  product: ProductListItem; onClick: () => void;
}) {
  const [imgErr, setImgErr]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const imageUrl = product.main_image ?? product.image_url ?? null;
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : null;

  return (
    <div className="pcard" onClick={onClick}>
      {/* ── IMAGE ── */}
      <div className="pcard-img-wrap">
        {imageUrl && !imgErr ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="pcard-img"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <div className="pcard-no-img">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c8c4bc" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="pcard-badges">
          {discount && discount >= 5 && (
            <span className="pcard-discount">-{discount}%</span>
          )}
          {!product.in_stock && (
            <span className="pcard-soldout">Sold Out</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          className="pcard-wish"
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          onClick={e => { e.stopPropagation(); setSaved(!saved); }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={saved ? "#c0392b" : "none"}
            stroke={saved ? "#c0392b" : "#aaa"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>

        {/* Quick view */}
        <div className="pcard-quick">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          View Details
        </div>
      </div>

      {/* ── INFO ── */}
      <div className="pcard-info">
        {product.brand && <div className="pcard-brand">{product.brand}</div>}
        <div className="pcard-title">{product.title}</div>

        <div className="pcard-price-row">
          <span className="pcard-price">{formatCurrency(product.price)}</span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="pcard-compare">{formatCurrency(product.compare_price)}</span>
          )}
        </div>

        {product.rating && product.rating > 0 && (
          <div className="pcard-rating">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="9" height="9" viewBox="0 0 24 24"
                fill={i < Math.round(product.rating!) ? "#c8a75a" : "#e0ddd6"}
                stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            ))}
            {product.rating_number && product.rating_number > 0 && (
              <span className="pcard-rcount">({product.rating_number.toLocaleString()})</span>
            )}
          </div>
        )}

        <div className="pcard-stock">
          <span className={`pcard-dot ${product.in_stock ? "in" : "out"}`} />
          <span className="pcard-stock-label">
            {product.in_stock ? "In Stock" : "Out of Stock"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SKELETON CARD
================================================================ */
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="shimbox" style={{ height: "56%", borderRadius: 0 }} />
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
   SIDEBAR SECTION TITLE
================================================================ */
function SideTitle({ children }: { children: React.ReactNode }) {
  return <div className="side-title">{children}</div>;
}

/* ================================================================
   FILTER CHIP
================================================================ */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="filter-chip">
      {label}
      <button className="chip-x" onClick={onRemove} aria-label="Remove filter">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function StoreClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const initQ    = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const initCat  = searchParams.get("category") ?? "";
  const initSort = (searchParams.get("sort") as SortOption) ?? "newest";

  const [products, setProducts]         = useState<ProductListItem[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [page, setPage]                 = useState(1);

  const [searchInput, setSearchInput]         = useState(initQ);
  const [searchQuery, setSearchQuery]         = useState(initQ);
  const [selectedCategory, setSelectedCategory] = useState(initCat);
  const [selectedBrand, setSelectedBrand]     = useState("");
  const [sort, setSort]                       = useState<SortOption>(initSort);
  const [priceMin, setPriceMin]               = useState("");
  const [priceMax, setPriceMax]               = useState("");
  const [inStockOnly, setInStockOnly]         = useState(false);
  const [minRating, setMinRating]             = useState("");
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Dynamic categories/brands from backend
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands]         = useState<any[]>([]);

  // Dynamic quick-filters built from backend sections
  const [quickFilters, setQuickFilters] = useState<{ label: string; q: string }[]>([]);
  const [activeQuick, setActiveQuick]   = useState(initQ || "");

  const [suggestions, setSuggestions]         = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef      = useRef<HTMLDivElement>(null);

  /* ── Load filter data ── */
  useEffect(() => {
    Promise.allSettled([categoriesApi.list(), brandsApi.list()]).then(([c, b]) => {
      if (c.status === "fulfilled") setCategories((c.value as any) ?? []);
      if (b.status === "fulfilled") setBrands((b.value as any) ?? []);
    });
  }, []);

  /* ── Build dynamic quick-filters from backend homepage sections ── */
  useEffect(() => {
    fetch(`${API}/api/homepage/sections`)
      .then(r => r.json())
      .then(d => {
        const sections = d.sections ?? [];
        const staticFirst = [
          { label: "All", q: "" },
          { label: "Flash Deals", q: "discount" },
          { label: "New Arrivals", q: "newest" },
        ];
        // Extract category names from dynamic sections
        const dynamic = sections
          .filter((s: any) => !["flash_deals","new_arrivals","best_sellers","top_rated"].includes(s.key))
          .map((s: any) => ({ label: s.title.replace(" & ", " · "), q: s.title.split(" ")[0].toLowerCase() }));
        setQuickFilters([...staticFirst, ...dynamic.slice(0, 18)]);
      })
      .catch(() => {
        setQuickFilters([
          { label: "All", q: "" },
          { label: "Flash Deals", q: "discount" },
          { label: "Best Sellers", q: "popular" },
        ]);
      });
  }, []);

  /* ── Load products ── */
  const loadProducts = useCallback(async (pg = 1, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const sortEntry = SORT_MAP[sort];
      const sortParams = "sort_by" in sortEntry
        ? { sort_by: sortEntry.sort_by, sort_order: sortEntry.sort_order }
        : { sort: sortEntry.sort };
      const params: Record<string, any> = { page: pg, per_page: PAGE_SIZE, ...sortParams };
      if (selectedCategory) params.category  = selectedCategory;
      if (selectedBrand)    params.brand      = selectedBrand;
      if (priceMin)         params.min_price  = Number(priceMin);
      if (priceMax)         params.max_price  = Number(priceMax);
      if (inStockOnly)      params.in_stock   = true;
      if (minRating)        params.min_rating = Number(minRating);

      let results: ProductListItem[];
      let totalCount: number;

      if (searchQuery.trim()) {
        const res  = await searchApi.search({ q: searchQuery.trim(), ...params }) as any;
        results    = res?.products ?? res?.results ?? [];
        totalCount = res?.total ?? results.length;
      } else {
        const res  = await productsApi.list(params);
        results    = res?.results ?? [];
        totalCount = res?.total   ?? results.length;
      }

      if (append) setProducts(prev => [...prev, ...results]);
      else { setProducts(results); window.scrollTo({ top: 0, behavior: "smooth" }); }
      setTotal(totalCount);
      setPage(pg);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedCategory, selectedBrand, sort, priceMin, priceMax, inStockOnly, minRating]);

  useEffect(() => { loadProducts(1); }, [loadProducts]);

  /* ── Search suggestions ── */
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
    setActiveQuick(q);
    setShowSuggestions(false);
    setPage(1);
  }

  function selectQuick(q: string) {
    setActiveQuick(q);
    if (q === "discount" || q === "newest" || q === "popular") {
      setSort(q === "discount" ? "discount" : q === "newest" ? "newest" : "popular");
      setSearchQuery("");
      setSearchInput("");
    } else {
      setSearchQuery(q);
      setSearchInput(q);
      setSelectedCategory("");
    }
    setPage(1);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasMore    = page < totalPages;
  const hasFilters = !!(selectedCategory || selectedBrand || priceMin || priceMax || inStockOnly || minRating || searchQuery);

  function clearAllFilters() {
    setSearchQuery(""); setSearchInput("");
    setSelectedCategory(""); setSelectedBrand("");
    setPriceMin(""); setPriceMax("");
    setInStockOnly(false); setMinRating("");
    setSort("newest"); setActiveQuick("");
  }

  /* ================================================================
     FILTER PANEL — sidebar + mobile drawer
  ================================================================ */
  const FilterPanel = () => (
    <div className="filter-panel">

      {/* Categories */}
      <div className="filter-group">
        <SideTitle>Category</SideTitle>
        <div className="filter-opts">
          {[{ id: "__all__", name: "All Categories", slug: "" }, ...categories.slice(0, 22)].map((c: any) => {
            const val = c.slug ?? c.name ?? "";
            const active = selectedCategory === val;
            return (
              <button
                key={c.id}
                className={`filter-opt ${active ? "active" : ""}`}
                onClick={() => setSelectedCategory(active ? "" : val)}
              >
                <span className="opt-radio">
                  {active && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <circle cx="12" cy="12" r="8"/>
                    </svg>
                  )}
                </span>
                <span className="opt-label">{c.name}</span>
                {c.product_count > 0 && (
                  <span className="opt-count">{c.product_count.toLocaleString()}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div className="filter-group">
        <SideTitle>Price Range</SideTitle>
        <div className="price-inputs">
          <input
            type="number" placeholder="Min"
            value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            className="price-input"
          />
          <span className="price-sep">–</span>
          <input
            type="number" placeholder="Max"
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            className="price-input"
          />
        </div>
        <div className="price-presets">
          {[
            ["Under M200","0","200"],
            ["M200–500","200","500"],
            ["M500–1 000","500","1000"],
            ["Over M1 000","1000",""],
          ].map(([l,mn,mx]) => (
            <button
              key={l}
              className={`price-preset ${priceMin===mn && priceMax===mx ? "active" : ""}`}
              onClick={() => { setPriceMin(mn); setPriceMax(mx); }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div className="filter-group">
          <SideTitle>Brand</SideTitle>
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="brand-select"
          >
            <option value="">All Brands</option>
            {brands.map((b: any) => (
              <option key={b.id ?? b.slug} value={b.slug ?? b.name}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Rating */}
      <div className="filter-group">
        <SideTitle>Minimum Rating</SideTitle>
        <div className="filter-opts">
          {[{ label: "All Ratings", value: "" }, { label: "4+ Stars", value: "4" }, { label: "3+ Stars", value: "3" }].map(r => (
            <button
              key={r.value}
              className={`filter-opt ${minRating === r.value ? "active" : ""}`}
              onClick={() => setMinRating(r.value)}
            >
              <span className="opt-radio">
                {minRating === r.value && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                )}
              </span>
              <span className="opt-label">{r.label}</span>
              {r.value && (
                <span className="opt-stars">
                  {Array.from({ length: Number(r.value) }).map((_, i) => (
                    <svg key={i} width="9" height="9" viewBox="0 0 24 24" fill="#c8a75a" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* In Stock */}
      <div className="filter-group">
        <SideTitle>Availability</SideTitle>
        <button
          className="stock-toggle"
          onClick={() => setInStockOnly(!inStockOnly)}
        >
          <div className={`toggle-track ${inStockOnly ? "on" : ""}`}>
            <div className="toggle-knob" />
          </div>
          <span className="toggle-label">In Stock Only</span>
        </button>
      </div>

      {hasFilters && (
        <button className="clear-btn" onClick={clearAllFilters}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Clear All Filters
        </button>
      )}
    </div>
  );

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <div className="store-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --primary:#0f3f2f;--primary-dark:#0a2a1f;--primary-light:#1b5e4a;
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
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}

        .shimbox{
          background:linear-gradient(90deg,#ebebea 0%,#d9d8d5 50%,#ebebea 100%);
          background-size:200% 100%;animation:shimmer 1.6s ease-in-out infinite;
        }

        .store-root{
          min-height:100vh;background:var(--bg);
          font-family:'DM Sans',system-ui,sans-serif;color:var(--text);
        }

        /* ── TOP BAR ─────────────────────── */
        .store-topbar{
          background:var(--white);border-bottom:1px solid var(--border);
          padding:12px clamp(12px,3vw,32px);
          display:flex;align-items:center;gap:10px;flex-wrap:wrap;
          position:sticky;top:0;z-index:200;
          box-shadow:0 2px 8px rgba(0,0,0,0.05);
        }
        .back-btn{
          display:inline-flex;align-items:center;gap:6px;
          font-size:12px;font-weight:600;color:var(--text-muted);
          text-decoration:none;padding:7px 14px;
          border:1px solid var(--border);border-radius:3px;
          transition:all .18s;white-space:nowrap;flex-shrink:0;
        }
        .back-btn:hover{border-color:var(--primary);color:var(--primary);}
        .store-breadcrumb{
          font-size:11px;color:var(--text-muted);
          display:flex;align-items:center;gap:5px;flex-shrink:0;
        }
        .store-breadcrumb a{color:var(--primary);text-decoration:none;font-weight:600;}
        .store-breadcrumb a:hover{text-decoration:underline;}
        .crumb-sep{
          color:var(--border);
          display:inline-block;
          width:4px;height:4px;background:var(--text-light);
          border-radius:50%;
        }

        /* ── SEARCH ──────────────────────── */
        .search-wrap{flex:1;min-width:180px;max-width:560px;position:relative;}
        .search-row{
          display:flex;align-items:center;
          background:#f4f3f0;border:1.5px solid transparent;
          border-radius:3px;overflow:hidden;
          transition:border-color .2s,background .2s;
        }
        .search-row:focus-within{background:var(--white);border-color:var(--primary);}
        .search-icon-wrap{
          padding:0 12px;color:var(--text-light);flex-shrink:0;
          display:flex;align-items:center;
        }
        .search-input{
          flex:1;border:none;background:transparent;
          padding:10px 0;font-size:13px;color:var(--text);
          outline:none;min-width:0;font-family:'DM Sans',sans-serif;
        }
        .search-input::placeholder{color:var(--text-light);}
        .search-clear{
          padding:0 10px;background:none;border:none;
          color:var(--text-light);cursor:pointer;
          display:flex;align-items:center;
          transition:color .15s;
        }
        .search-clear:hover{color:var(--text);}
        .search-btn{
          background:var(--primary);color:#fff;border:none;
          padding:0 18px;height:100%;
          font-weight:700;font-size:12px;
          cursor:pointer;white-space:nowrap;
          letter-spacing:0.3px;text-transform:uppercase;
          transition:background .18s;
          font-family:'DM Sans',sans-serif;
        }
        .search-btn:hover{background:var(--primary-dark);}
        .search-suggestions{
          position:absolute;top:calc(100% + 4px);left:0;right:0;
          background:var(--white);border:1px solid var(--border);
          border-radius:4px;box-shadow:var(--shadow-lg);
          z-index:300;overflow:hidden;
        }
        .suggest-item{
          display:flex;align-items:center;gap:10px;
          padding:10px 14px;cursor:pointer;
          font-size:13px;color:var(--text);
          transition:background .12s;
        }
        .suggest-item:hover{background:var(--bg);}

        /* ── QUICK FILTERS ───────────────── */
        .quick-bar{
          background:var(--white);border-bottom:2px solid var(--border);
          overflow-x:auto;padding:0 clamp(12px,3vw,32px);
        }
        .quick-bar::-webkit-scrollbar{height:0;}
        .quick-bar-inner{
          display:flex;gap:4px;padding:10px 0;
          white-space:nowrap;
        }
        .quick-btn{
          display:inline-flex;align-items:center;gap:5px;
          padding:6px 14px;border-radius:2px;
          border:1px solid var(--border);
          background:var(--white);
          font-size:11px;font-weight:600;
          color:var(--text-muted);cursor:pointer;
          transition:all .15s;flex-shrink:0;
          letter-spacing:0.2px;
          font-family:'DM Sans',sans-serif;
        }
        .quick-btn:hover{
          border-color:var(--primary);color:var(--primary);
          background:#f0f7f4;
        }
        .quick-btn.active{
          background:var(--primary);color:#fff;
          border-color:var(--primary);
        }

        /* ── LAYOUT ──────────────────────── */
        .store-layout{
          display:grid;
          grid-template-columns:230px 1fr;
          gap:0;max-width:1700px;
          margin:0 auto;
          min-height:calc(100vh - 120px);
        }
        @media(max-width:900px){.store-layout{grid-template-columns:1fr;}}

        /* ── SIDEBAR ─────────────────────── */
        .store-sidebar{
          background:var(--white);border-right:1px solid var(--border);
          padding:20px 16px;
          align-self:start;position:sticky;top:65px;
          max-height:calc(100vh - 65px);overflow-y:auto;
        }
        @media(max-width:900px){.store-sidebar{display:none;}}
        .sidebar-head{
          font-size:11px;font-weight:800;color:var(--text);
          padding-bottom:12px;border-bottom:2px solid var(--primary);
          margin-bottom:16px;letter-spacing:0.8px;text-transform:uppercase;
          display:flex;align-items:center;justify-content:space-between;
        }

        /* ── FILTER PANEL ────────────────── */
        .filter-panel{display:flex;flex-direction:column;gap:0;}
        .filter-group{padding:14px 0;border-bottom:1px solid #f0efeb;}
        .filter-group:last-of-type{border-bottom:none;}
        .side-title{
          font-size:10px;font-weight:800;color:var(--text);
          text-transform:uppercase;letter-spacing:0.8px;
          margin-bottom:10px;
        }
        .filter-opts{display:flex;flex-direction:column;gap:2px;}
        .filter-opt{
          display:flex;align-items:center;gap:8px;
          padding:6px 8px;border-radius:3px;
          border:none;background:none;cursor:pointer;
          font-size:12px;color:var(--text-muted);
          text-align:left;transition:all .12s;
          width:100%;font-family:'DM Sans',sans-serif;
        }
        .filter-opt:hover{background:#f4f3f0;color:var(--primary);}
        .filter-opt.active{color:var(--primary);font-weight:600;}
        .opt-radio{
          width:14px;height:14px;border-radius:50%;
          border:1.5px solid #d0cec8;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;
          transition:border-color .12s;color:var(--primary);
        }
        .filter-opt.active .opt-radio{border-color:var(--primary);}
        .opt-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .opt-count{font-size:10px;color:var(--text-light);}
        .opt-stars{display:flex;gap:1px;margin-left:auto;}

        .price-inputs{display:flex;align-items:center;gap:6px;margin-bottom:8px;}
        .price-sep{color:var(--text-light);font-size:13px;}
        .price-input{
          flex:1;min-width:0;
          padding:7px 9px;border:1.5px solid var(--border);
          border-radius:3px;font-size:12px;color:var(--text);
          outline:none;transition:border-color .15s;
          font-family:'DM Sans',sans-serif;
        }
        .price-input:focus{border-color:var(--primary);}
        .price-presets{display:flex;flex-direction:column;gap:3px;}
        .price-preset{
          padding:5px 9px;border:1px solid var(--border);
          border-radius:3px;background:var(--white);
          font-size:11px;color:var(--text-muted);
          cursor:pointer;text-align:left;
          transition:all .12s;font-family:'DM Sans',sans-serif;
        }
        .price-preset:hover,.price-preset.active{
          border-color:var(--primary);color:var(--primary);
          background:#f0f7f4;
        }
        .brand-select{
          width:100%;padding:8px 10px;
          border:1.5px solid var(--border);border-radius:3px;
          font-size:12px;color:var(--text);outline:none;
          background:var(--white);cursor:pointer;
          font-family:'DM Sans',sans-serif;
          transition:border-color .15s;
        }
        .brand-select:focus{border-color:var(--primary);}

        .stock-toggle{
          display:flex;align-items:center;gap:10px;
          background:none;border:none;cursor:pointer;padding:0;
        }
        .toggle-track{
          width:38px;height:20px;border-radius:10px;
          background:#d0cec8;position:relative;
          transition:background .2s;flex-shrink:0;
        }
        .toggle-track.on{background:var(--primary);}
        .toggle-knob{
          position:absolute;top:2px;left:2px;
          width:16px;height:16px;border-radius:50%;
          background:var(--white);transition:left .2s;
          box-shadow:0 1px 4px rgba(0,0,0,0.2);
        }
        .toggle-track.on .toggle-knob{left:20px;}
        .toggle-label{font-size:12px;color:var(--text-muted);}

        .clear-btn{
          width:100%;margin-top:12px;padding:9px;
          border-radius:3px;border:1px solid #fca5a5;
          background:#fff8f8;color:#c0392b;
          font-weight:700;font-size:11px;cursor:pointer;
          letter-spacing:0.3px;text-transform:uppercase;
          display:flex;align-items:center;justify-content:center;gap:6px;
          transition:all .15s;font-family:'DM Sans',sans-serif;
        }
        .clear-btn:hover{background:#fee2e2;border-color:#e74c3c;}

        /* ── MAIN CONTENT ────────────────── */
        .store-content{padding:16px clamp(12px,2vw,20px);}
        .store-controls{
          display:flex;align-items:center;gap:10px;
          flex-wrap:wrap;margin-bottom:14px;
        }
        .mob-filter-btn{
          display:none;align-items:center;gap:7px;
          padding:8px 14px;border:1px solid var(--border);
          border-radius:3px;background:var(--white);
          font-weight:600;font-size:11px;cursor:pointer;
          letter-spacing:0.2px;white-space:nowrap;
          font-family:'DM Sans',sans-serif;color:var(--text);
          transition:all .15s;
        }
        .mob-filter-btn:hover{border-color:var(--primary);color:var(--primary);}
        @media(max-width:900px){.mob-filter-btn{display:flex;}}
        .results-label{font-size:12px;color:var(--text-muted);flex:1;}
        .results-label strong{color:var(--text);font-weight:700;}
        .sort-select{
          padding:8px 12px;border:1px solid var(--border);
          border-radius:3px;background:var(--white);
          font-size:12px;color:var(--text);font-weight:600;
          outline:none;cursor:pointer;transition:border-color .15s;
          font-family:'DM Sans',sans-serif;
        }
        .sort-select:focus{border-color:var(--primary);}

        /* ── ACTIVE CHIPS ────────────────── */
        .active-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}
        .filter-chip{
          display:inline-flex;align-items:center;gap:5px;
          padding:4px 10px;border-radius:2px;
          background:#f0f7f4;border:1px solid rgba(15,63,47,0.2);
          font-size:11px;font-weight:600;color:var(--primary);
        }
        .chip-x{
          background:none;border:none;cursor:pointer;
          color:var(--primary);padding:0;
          display:flex;align-items:center;
          opacity:0.6;transition:opacity .15s;
        }
        .chip-x:hover{opacity:1;}

        /* ── PRODUCT GRID ────────────────── */
        .products-grid{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));
          gap:2px;
        }
        @media(max-width:480px){
          .products-grid{grid-template-columns:repeat(2,1fr);}
        }

        /* ── PRODUCT CARD ────────────────── */
        .pcard{
          background:var(--white);cursor:pointer;
          border:1px solid transparent;
          transition:all .2s ease;
          animation:fadeUp .35s ease both;
        }
        .pcard:hover{
          border-color:rgba(200,167,90,0.4);
          box-shadow:0 4px 20px rgba(15,63,47,0.08);
          z-index:2;position:relative;
          transform:translateY(-1px);
        }
        .pcard-img-wrap{
          position:relative;padding-top:100%;
          background:#f4f3f0;overflow:hidden;
        }
        .pcard-img{
          position:absolute;inset:0;width:100%;height:100%;
          object-fit:cover;
          transition:transform .45s ease;
        }
        .pcard:hover .pcard-img{transform:scale(1.07);}
        .pcard-no-img{
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          background:#ece9e4;
        }
        .pcard-badges{
          position:absolute;top:8px;left:8px;
          display:flex;flex-direction:column;gap:4px;z-index:3;
        }
        .pcard-discount{
          background:#c0392b;color:#fff;
          font-size:9px;font-weight:800;
          padding:2px 7px;border-radius:2px;
          letter-spacing:0.3px;
        }
        .pcard-soldout{
          background:rgba(0,0,0,0.55);color:#fff;
          font-size:9px;font-weight:600;
          padding:2px 7px;border-radius:2px;
        }
        .pcard-wish{
          position:absolute;top:8px;right:8px;
          width:28px;height:28px;border-radius:50%;
          background:rgba(255,255,255,0.92);
          border:1px solid var(--border);
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          z-index:3;box-shadow:var(--shadow-sm);
          opacity:0;transition:opacity .2s;
        }
        .pcard:hover .pcard-wish{opacity:1;}
        .pcard-quick{
          position:absolute;bottom:0;left:0;right:0;
          background:var(--primary);color:#fff;
          text-align:center;font-size:11px;font-weight:700;
          padding:8px;letter-spacing:0.3px;text-transform:uppercase;
          transform:translateY(100%);transition:transform .22s ease;z-index:3;
          display:flex;align-items:center;justify-content:center;gap:6px;
        }
        .pcard:hover .pcard-quick{transform:translateY(0);}

        .pcard-info{padding:10px 12px 14px;}
        .pcard-brand{
          font-size:9px;color:var(--gold);font-weight:800;
          text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;
        }
        .pcard-title{
          font-size:12px;color:var(--text);line-height:1.45;
          display:-webkit-box;-webkit-line-clamp:2;
          -webkit-box-orient:vertical;overflow:hidden;
          min-height:34px;margin-bottom:6px;font-weight:400;
        }
        .pcard-price-row{display:flex;align-items:baseline;gap:7px;margin-bottom:5px;flex-wrap:wrap;}
        .pcard-price{font-size:15px;font-weight:800;color:var(--text);}
        .pcard-compare{font-size:10px;color:var(--text-light);text-decoration:line-through;}
        .pcard-rating{display:flex;align-items:center;gap:2px;margin-bottom:5px;}
        .pcard-rcount{font-size:9px;color:var(--text-light);margin-left:2px;}
        .pcard-stock{display:flex;align-items:center;gap:5px;}
        .pcard-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
        .pcard-dot.in{background:#16a34a;}
        .pcard-dot.out{background:#c0392b;}
        .pcard-stock-label{font-size:10px;color:var(--text-muted);}

        .skeleton-card{
          background:var(--white);
          height:320px;overflow:hidden;
        }

        /* ── EMPTY STATE ─────────────────── */
        .empty-state{
          text-align:center;padding:80px 20px;
          background:var(--white);border-radius:0;
        }
        .empty-icon{margin:0 auto 20px;color:var(--border);}
        .empty-title{
          font-family:'Cormorant Garamond',serif;
          font-size:22px;font-weight:600;
          margin-bottom:8px;color:var(--text);
        }
        .empty-sub{font-size:13px;color:var(--text-muted);margin-bottom:24px;}
        .empty-cta{
          padding:11px 28px;border-radius:3px;
          background:var(--primary);color:#fff;border:none;
          font-weight:700;font-size:12px;cursor:pointer;
          letter-spacing:0.3px;text-transform:uppercase;
          transition:background .18s;font-family:'DM Sans',sans-serif;
        }
        .empty-cta:hover{background:var(--primary-dark);}

        /* ── LOAD MORE ───────────────────── */
        .load-more-wrap{
          text-align:center;padding:32px 0;
          display:flex;flex-direction:column;
          align-items:center;gap:14px;
        }
        .load-more-count{font-size:12px;color:var(--text-muted);}
        .load-more-btn{
          padding:12px 44px;border-radius:3px;
          border:2px solid var(--text);background:var(--white);
          color:var(--text);font-weight:800;font-size:13px;
          cursor:pointer;transition:all .18s;letter-spacing:0.3px;
          text-transform:uppercase;font-family:'DM Sans',sans-serif;
        }
        .load-more-btn:hover:not(:disabled){
          background:var(--primary);color:#fff;border-color:var(--primary);
        }
        .load-more-btn:disabled{opacity:0.5;cursor:not-allowed;}
        .page-btns{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;}
        .page-btn{
          width:34px;height:34px;border-radius:3px;
          border:1px solid var(--border);background:var(--white);
          color:var(--text);font-weight:700;font-size:12px;cursor:pointer;
          transition:all .12s;font-family:'DM Sans',sans-serif;
        }
        .page-btn.active,.page-btn:hover{
          background:var(--primary);color:#fff;border-color:var(--primary);
        }

        /* ── MOBILE FILTER DRAWER ────────── */
        .mob-overlay{
          position:fixed;inset:0;background:rgba(0,0,0,0.5);
          z-index:500;display:none;
        }
        .mob-overlay.open{display:block;}
        .mob-drawer{
          position:fixed;left:0;top:0;bottom:0;width:290px;
          background:var(--white);z-index:501;overflow-y:auto;
          padding:20px 16px;
          animation:slideIn .25s ease;
        }
        .mob-drawer-head{
          display:flex;align-items:center;justify-content:space-between;
          margin-bottom:20px;padding-bottom:14px;
          border-bottom:2px solid var(--primary);
        }
        .mob-drawer-title{
          font-size:14px;font-weight:800;color:var(--text);
          letter-spacing:0.5px;text-transform:uppercase;
        }
        .mob-drawer-close{
          background:none;border:none;cursor:pointer;
          color:var(--text-muted);padding:2px;
          display:flex;align-items:center;
          transition:color .15s;
        }
        .mob-drawer-close:hover{color:var(--text);}
        .mob-show-btn{
          width:100%;margin-top:16px;padding:13px;
          border-radius:3px;background:var(--primary);
          color:#fff;border:none;font-weight:800;font-size:13px;
          cursor:pointer;letter-spacing:0.4px;text-transform:uppercase;
          transition:background .18s;font-family:'DM Sans',sans-serif;
        }
        .mob-show-btn:hover{background:var(--primary-dark);}
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="store-topbar">
        <Link href="/" className="back-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Home
        </Link>

        <div className="store-breadcrumb">
          <Link href="/">Home</Link>
          <span className="crumb-sep" />
          <span>{selectedCategory || searchQuery || "Store"}</span>
        </div>

        {/* Search */}
        <div ref={searchRef} className="search-wrap">
          <div className="search-row">
            <div className="search-icon-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search products, brands, categories..."
              className="search-input"
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && commitSearch()}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            {searchInput && (
              <button className="search-clear"
                onClick={() => { setSearchInput(""); setSearchQuery(""); setSuggestions([]); setActiveQuick(""); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
            <button className="search-btn" onClick={() => commitSearch()}>Search</button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((s, i) => (
                <div key={i} className="suggest-item"
                  onClick={() => { setSearchInput(s); commitSearch(s); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK FILTERS — backend-driven ── */}
      <div className="quick-bar">
        <div className="quick-bar-inner">
          {quickFilters.map((c, i) => (
            <button
              key={i}
              className={`quick-btn ${activeQuick === c.q ? "active" : ""}`}
              onClick={() => selectQuick(c.q)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── STORE LAYOUT ── */}
      <div className="store-layout">

        {/* SIDEBAR */}
        <aside className="store-sidebar">
          <div className="sidebar-head">
            <span>Refine</span>
            {hasFilters && (
              <button onClick={clearAllFilters} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#c0392b", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.3px", fontFamily: "'DM Sans',sans-serif",
              }}>
                CLEAR ALL
              </button>
            )}
          </div>
          <FilterPanel />
        </aside>

        {/* MAIN */}
        <main className="store-content">
          {/* Controls */}
          <div className="store-controls">
            <button className="mob-filter-btn" onClick={() => setShowMobileFilter(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              Filters
              {hasFilters && (
                <span style={{
                  background: "var(--primary)", color: "#fff",
                  borderRadius: "2px", padding: "0px 6px",
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.3px",
                }}>
                  ON
                </span>
              )}
            </button>

            <div className="results-label">
              {loading ? "Loading..." : (
                <>
                  <strong>{products.length.toLocaleString()}</strong>
                  {" "}/{" "}
                  <strong>{total.toLocaleString()}</strong> products
                  {searchQuery && <> — <em>"{searchQuery}"</em></>}
                </>
              )}
            </div>

            <select
              className="sort-select"
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
            >
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="active-filters">
              {searchQuery      && <FilterChip label={`"${searchQuery}"`}         onRemove={() => { setSearchQuery(""); setSearchInput(""); setActiveQuick(""); }} />}
              {selectedCategory && <FilterChip label={selectedCategory}           onRemove={() => setSelectedCategory("")} />}
              {selectedBrand    && <FilterChip label={selectedBrand}              onRemove={() => setSelectedBrand("")} />}
              {(priceMin || priceMax) && <FilterChip label={`${priceMin||"0"} – ${priceMax||"∞"}`} onRemove={() => { setPriceMin(""); setPriceMax(""); }} />}
              {inStockOnly      && <FilterChip label="In Stock"                   onRemove={() => setInStockOnly(false)} />}
              {minRating        && <FilterChip label={`${minRating}+ Stars`}      onRemove={() => setMinRating("")} />}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="products-grid">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} style={{ animationDelay: `${i * 20}ms` }}>
                  <SkeletonCard />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                  <line x1="9" y1="9" x2="13" y2="13"/>
                  <line x1="13" y1="9" x2="9" y2="13"/>
                </svg>
              </div>
              <div className="empty-title">
                {searchQuery ? `No results for "${searchQuery}"` : "No products found"}
              </div>
              <p className="empty-sub">Try adjusting your filters or explore something else.</p>
              <button className="empty-cta" onClick={clearAllFilters}>Browse All Products</button>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {products.map((p, i) => (
                  <div key={p.id} style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>
                    <ProductCard
                      product={p}
                      onClick={() => router.push(`/store/product/${p.id}`)}
                    />
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="load-more-wrap">
                  <div className="load-more-count">
                    Showing {products.length.toLocaleString()} of {total.toLocaleString()} products
                  </div>
                  <button
                    className="load-more-btn"
                    onClick={() => loadProducts(page + 1, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More Products"}
                  </button>
                  <div className="page-btns">
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(pg => (
                      <button
                        key={pg}
                        className={`page-btn ${pg === page ? "active" : ""}`}
                        onClick={() => loadProducts(pg)}
                      >
                        {pg}
                      </button>
                    ))}
                    {totalPages > 10 && (
                      <span style={{ color: "#aaa", fontSize: 13, display: "flex", alignItems: "center" }}>…</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── MOBILE FILTER DRAWER ── */}
      <div
        className={`mob-overlay ${showMobileFilter ? "open" : ""}`}
        onClick={() => setShowMobileFilter(false)}
      >
        <div className="mob-drawer" onClick={e => e.stopPropagation()}>
          <div className="mob-drawer-head">
            <span className="mob-drawer-title">Refine Results</span>
            <button className="mob-drawer-close" onClick={() => setShowMobileFilter(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <FilterPanel />
          <button
            className="mob-show-btn"
            onClick={() => setShowMobileFilter(false)}
          >
            Show {total.toLocaleString()} Results
          </button>
        </div>
      </div>
    </div>
  );
}