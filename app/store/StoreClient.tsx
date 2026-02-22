"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { productsApi, searchApi, categoriesApi, brandsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/* ================================================================
   TYPES
================================================================ */
type SortOption = "newest" | "price_asc" | "price_desc" | "rating" | "popular" | "discount";

const SORT_LABELS: Record<SortOption, string> = {
  newest:     "Newest First",
  price_asc:  "Price: Low to High",
  price_desc: "Price: High to Low",
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
  discount:   { sort_by: "discount",   sort_order: "desc" },
};

const PAGE_SIZE = 40;

/* Quick-access categories shown at top */
const QUICK_CATS = [
  { label: "All",        q: "",            icon: "🛍️" },
  { label: "⚡ Deals",   q: "deal",        icon: "" },
  { label: "Phones",     q: "smartphone",  icon: "📱" },
  { label: "Laptops",    q: "laptop",      icon: "💻" },
  { label: "Audio",      q: "headphone",   icon: "🎧" },
  { label: "Beauty",     q: "skincare",    icon: "💄" },
  { label: "Fashion",    q: "clothing",    icon: "👗" },
  { label: "Shoes",      q: "shoes",       icon: "👟" },
  { label: "Watches",    q: "watch",       icon: "⌚" },
  { label: "Hair",       q: "hair",        icon: "💇" },
  { label: "Bags",       q: "bag",         icon: "👜" },
  { label: "Gaming",     q: "gaming",      icon: "🎮" },
  { label: "Perfume",    q: "perfume",     icon: "🌸" },
  { label: "Cameras",    q: "camera",      icon: "📷" },
  { label: "Jewellery",  q: "jewellery",   icon: "💍" },
  { label: "Baby",       q: "baby",        icon: "🍼" },
];

/* ================================================================
   PRODUCT CARD — Jumia style
================================================================ */
function ProductCard({ product, onClick }: { product: ProductListItem; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const [wishlist, setWishlist] = useState(false);
  const imageUrl = product.main_image ?? product.image_url ?? null;
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : null;
  const stars = product.rating ? Math.round(product.rating) : 0;

  return (
    <div className="pcard" onClick={onClick}>
      {/* Image */}
      <div className="pcard-img-wrap">
        {imageUrl && !imgErr
          ? <img src={imageUrl} alt={product.title} className="pcard-img" onError={() => setImgErr(true)} loading="lazy" />
          : <div className="pcard-no-img">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
        }
        {/* Badges */}
        <div className="pcard-badges">
          {discount && discount >= 5 && <span className="pcard-discount">-{discount}%</span>}
          {!product.in_stock && <span className="pcard-sold-out">Sold Out</span>}
        </div>
        {/* Wishlist */}
        <button className="pcard-wish" aria-label="Wishlist"
          onClick={e => { e.stopPropagation(); setWishlist(!wishlist); }}>
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill={wishlist ? "#e53935" : "none"}
            stroke={wishlist ? "#e53935" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        {/* Quick view CTA */}
        <div className="pcard-quick-cta">View Details</div>
      </div>

      {/* Info */}
      <div className="pcard-info">
        {product.brand && <div className="pcard-brand">{product.brand}</div>}
        <div className="pcard-title">{product.title}</div>

        {/* Price */}
        <div className="pcard-price-row">
          <span className="pcard-price">{formatCurrency(product.price)}</span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="pcard-compare">{formatCurrency(product.compare_price)}</span>
          )}
        </div>

        {/* Rating */}
        {stars > 0 && (
          <div className="pcard-rating">
            <span className="pcard-stars">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
            {product.rating_number && product.rating_number > 0 && (
              <span className="pcard-rcount">({product.rating_number.toLocaleString()})</span>
            )}
          </div>
        )}

        {/* Stock indicator */}
        <div className="pcard-stock">
          <span className={`pcard-stock-dot ${product.in_stock ? "in" : "out"}`} />
          <span className="pcard-stock-label">{product.in_stock ? "In Stock" : "Out of Stock"}</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function StoreClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Read URL params on mount
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
  const [activeQuickCat, setActiveQuickCat]   = useState(initQ || "");
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands]         = useState<any[]>([]);

  const [suggestions, setSuggestions]         = useState<string[]>([]);
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
      const params: Record<string, any> = { page: pg, per_page: PAGE_SIZE, ...SORT_MAP[sort] };
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
    setActiveQuickCat(q);
    setShowSuggestions(false);
    setPage(1);
  }

  function selectQuickCat(q: string) {
    setActiveQuickCat(q);
    setSearchQuery(q);
    setSearchInput(q);
    setSelectedCategory("");
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
    setSort("newest"); setActiveQuickCat("");
  }

  /* ================================================================
     FILTER PANEL — shared between sidebar and mobile drawer
  ================================================================ */
  const FilterPanel = () => (
    <div className="filter-panel">
      <div className="filter-section">
        <div className="filter-section-title">Categories</div>
        <div className="filter-options">
          <label className={`filter-radio ${selectedCategory === "" ? "active" : ""}`}
            onClick={() => setSelectedCategory("")}>
            <span className="filter-radio-dot" /> All Categories
          </label>
          {categories.slice(0, 20).map((c: any) => (
            <label key={c.id ?? c.slug}
              className={`filter-radio ${selectedCategory === (c.slug ?? c.name) ? "active" : ""}`}
              onClick={() => setSelectedCategory(selectedCategory === (c.slug ?? c.name) ? "" : (c.slug ?? c.name))}>
              <span className="filter-radio-dot" />
              <span className="filter-radio-label">{c.name}</span>
              {c.product_count > 0 && <span className="filter-count">{c.product_count.toLocaleString()}</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-section-title">Price Range</div>
        <div className="filter-price-inputs">
          <input type="number" placeholder="Min" value={priceMin}
            onChange={e => setPriceMin(e.target.value)} className="filter-input" />
          <span className="filter-dash">—</span>
          <input type="number" placeholder="Max" value={priceMax}
            onChange={e => setPriceMax(e.target.value)} className="filter-input" />
        </div>
        <div className="filter-price-presets">
          {[["Under M200","0","200"],["M200–500","200","500"],["M500–1000","500","1000"],["Over M1000","1000",""]].map(([l,mn,mx]) => (
            <button key={l} className={`price-preset ${priceMin===mn && priceMax===mx?"active":""}`}
              onClick={() => { setPriceMin(mn); setPriceMax(mx); }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {brands.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-title">Brand</div>
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="filter-select">
            <option value="">All Brands</option>
            {brands.map((b: any) => (
              <option key={b.id ?? b.slug} value={b.slug ?? b.name}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="filter-section">
        <div className="filter-section-title">Minimum Rating</div>
        <div className="filter-options">
          {["4","3","2",""].map(r => (
            <label key={r} className={`filter-radio ${minRating === r ? "active" : ""}`}
              onClick={() => setMinRating(r)}>
              <span className="filter-radio-dot" />
              {r ? <>{"★".repeat(Number(r))} & above</> : "All ratings"}
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-section-title">Availability</div>
        <label className="filter-toggle-row">
          <div className={`toggle-switch ${inStockOnly ? "on" : ""}`}
            onClick={() => setInStockOnly(!inStockOnly)}>
            <div className="toggle-knob" />
          </div>
          <span>In Stock Only</span>
        </label>
      </div>

      {hasFilters && (
        <button className="filter-clear-btn" onClick={clearAllFilters}>
          ✕ Clear All Filters
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{--orange:#f97316;--orange-dark:#ea580c;--text:#1a1a1a;--text-muted:#666;--border:#e8e8e8;--bg:#f2f2f2;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:var(--orange);border-radius:4px;}

        @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}

        .shimbox{background:linear-gradient(90deg,#ebebeb 0%,#d6d6d6 50%,#ebebeb 100%);
          background-size:200% 100%;animation:shimmer 1.5s ease-in-out infinite;}

        .store-root{min-height:100vh;background:var(--bg);font-family:'DM Sans',system-ui,sans-serif;color:var(--text);}

        /* TOP BAR */
        .store-topbar{background:#fff;border-bottom:1px solid var(--border);
          padding:12px clamp(12px,3vw,32px);display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.06);}
        .back-home{display:flex;align-items:center;gap:6px;text-decoration:none;
          font-size:13px;font-weight:600;color:var(--text-muted);padding:7px 14px;
          border-radius:50px;border:1.5px solid var(--border);transition:all .18s;white-space:nowrap;}
        .back-home:hover{border-color:var(--orange);color:var(--orange);}
        .store-breadcrumb{font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;}
        .store-breadcrumb a{color:var(--orange);text-decoration:none;font-weight:600;}
        .store-breadcrumb a:hover{text-decoration:underline;}

        /* SEARCH BAR */
        .search-wrap{flex:1;min-width:200px;max-width:520px;position:relative;}
        .search-input-wrap{display:flex;align-items:center;background:#f5f5f5;border:2px solid transparent;
          border-radius:8px;overflow:hidden;transition:border-color .2s;}
        .search-input-wrap:focus-within{border-color:var(--orange);background:#fff;}
        .search-icon{padding:0 12px;color:#aaa;flex-shrink:0;display:flex;}
        .search-input{flex:1;border:none;background:transparent;padding:10px 0;font-size:14px;
          color:var(--text);outline:none;min-width:0;}
        .search-input::placeholder{color:#bbb;}
        .search-clear{padding:0 12px;background:none;border:none;color:#aaa;cursor:pointer;font-size:18px;display:flex;}
        .search-btn{background:var(--orange);color:#fff;border:none;padding:0 18px;
          height:100%;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;
          transition:background .18s;}
        .search-btn:hover{background:var(--orange-dark);}
        .search-suggestions{position:absolute;top:calc(100% + 4px);left:0;right:0;
          background:#fff;border:1px solid var(--border);border-radius:8px;
          box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:200;overflow:hidden;}
        .suggestion-item{display:flex;align-items:center;gap:10px;padding:11px 16px;
          cursor:pointer;font-size:14px;color:var(--text);transition:background .12s;}
        .suggestion-item:hover{background:#fff7f0;}

        /* QUICK CATEGORY STRIP */
        .quick-cats{background:#fff;border-bottom:2px solid var(--border);
          overflow-x:auto;padding:0 clamp(12px,3vw,32px);}
        .quick-cats::-webkit-scrollbar{height:0;}
        .quick-cats-inner{display:flex;gap:4px;padding:10px 0;white-space:nowrap;}
        .quick-cat{display:inline-flex;align-items:center;gap:5px;padding:7px 15px;
          border-radius:50px;border:1.5px solid transparent;background:#f5f5f5;
          font-size:12px;font-weight:500;color:#444;cursor:pointer;
          transition:all .15s;flex-shrink:0;}
        .quick-cat:hover,.quick-cat.active{background:var(--orange);color:#fff;border-color:var(--orange);}
        .quick-cat-icon{font-size:14px;}

        /* LAYOUT */
        .store-layout{display:grid;grid-template-columns:240px 1fr;gap:0;
          max-width:1600px;margin:0 auto;min-height:calc(100vh - 120px);}
        @media(max-width:900px){.store-layout{grid-template-columns:1fr;}}

        /* SIDEBAR */
        .store-sidebar{background:#fff;border-right:1px solid var(--border);
          padding:20px 16px;align-self:start;position:sticky;top:64px;
          max-height:calc(100vh - 64px);overflow-y:auto;}
        @media(max-width:900px){.store-sidebar{display:none;}}
        .sidebar-title{font-size:14px;font-weight:800;color:var(--text);
          padding-bottom:12px;border-bottom:2px solid var(--orange);margin-bottom:16px;
          letter-spacing:.3px;text-transform:uppercase;}

        /* FILTER PANEL */
        .filter-panel{display:flex;flex-direction:column;gap:0;}
        .filter-section{padding:14px 0;border-bottom:1px solid #f0f0f0;}
        .filter-section:last-of-type{border-bottom:none;}
        .filter-section-title{font-size:12px;font-weight:700;color:var(--text);
          text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;}
        .filter-options{display:flex;flex-direction:column;gap:4px;}
        .filter-radio{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;
          cursor:pointer;font-size:13px;color:var(--text-muted);transition:all .12s;
          user-select:none;}
        .filter-radio:hover{background:#fff7f0;color:var(--orange);}
        .filter-radio.active{color:var(--orange);font-weight:600;}
        .filter-radio-dot{width:14px;height:14px;border-radius:50%;border:2px solid #ddd;
          flex-shrink:0;transition:all .15s;}
        .filter-radio.active .filter-radio-dot{border-color:var(--orange);background:var(--orange);}
        .filter-radio-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .filter-count{font-size:10px;color:#bbb;margin-left:auto;flex-shrink:0;}
        .filter-price-inputs{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
        .filter-dash{color:#bbb;flex-shrink:0;}
        .filter-input{flex:1;min-width:0;padding:7px 10px;border:1.5px solid var(--border);
          border-radius:6px;font-size:13px;color:var(--text);outline:none;transition:border-color .15s;}
        .filter-input:focus{border-color:var(--orange);}
        .filter-price-presets{display:flex;flex-direction:column;gap:4px;}
        .price-preset{padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;
          background:#fff;font-size:12px;color:var(--text-muted);cursor:pointer;
          text-align:left;transition:all .12s;}
        .price-preset:hover,.price-preset.active{border-color:var(--orange);color:var(--orange);background:#fff7f0;}
        .filter-select{width:100%;padding:8px 10px;border:1.5px solid var(--border);
          border-radius:6px;font-size:13px;color:var(--text);outline:none;
          background:#fff;cursor:pointer;}
        .filter-select:focus{border-color:var(--orange);}
        .filter-toggle-row{display:flex;align-items:center;gap:10px;cursor:pointer;}
        .toggle-switch{width:40px;height:22px;border-radius:99px;background:#ddd;
          position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;}
        .toggle-switch.on{background:var(--orange);}
        .toggle-knob{position:absolute;top:3px;left:3px;width:16px;height:16px;
          border-radius:50%;background:#fff;transition:left .2s;
          box-shadow:0 1px 4px rgba(0,0,0,.2);}
        .toggle-switch.on .toggle-knob{left:21px;}
        .filter-clear-btn{width:100%;margin-top:8px;padding:10px;border-radius:8px;
          border:1.5px solid #fca5a5;background:#fff1f2;color:#dc2626;
          font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;}
        .filter-clear-btn:hover{background:#fee2e2;}

        /* MOBILE FILTER DRAWER */
        .mobile-filter-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;
          display:none;}
        .mobile-filter-overlay.open{display:block;}
        .mobile-filter-drawer{position:fixed;left:0;top:0;bottom:0;width:290px;
          background:#fff;z-index:501;overflow-y:auto;padding:20px 16px;
          animation:slideIn .25s ease;}
        .mobile-filter-header{display:flex;align-items:center;justify-content:space-between;
          margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);}
        .mobile-filter-title{font-size:16px;font-weight:700;}
        .mobile-filter-close{background:none;border:none;font-size:22px;cursor:pointer;color:#666;}

        /* CONTENT */
        .store-content{padding:16px clamp(12px,2vw,20px);}

        /* CONTROLS */
        .store-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
          margin-bottom:16px;}
        .mobile-filter-btn{display:none;align-items:center;gap:6px;padding:8px 16px;
          border:1.5px solid var(--border);border-radius:50px;background:#fff;
          font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;}
        @media(max-width:900px){.mobile-filter-btn{display:flex;}}
        .results-info{font-size:13px;color:var(--text-muted);flex:1;}
        .results-info strong{color:var(--text);}
        .sort-select{padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;
          background:#fff;font-size:13px;color:var(--text);font-weight:600;
          outline:none;cursor:pointer;transition:border-color .15s;}
        .sort-select:focus{border-color:var(--orange);}

        /* ACTIVE FILTER CHIPS */
        .active-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
        .filter-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;
          border-radius:50px;background:#fff7f0;border:1px solid rgba(249,115,22,.3);
          font-size:12px;font-weight:600;color:var(--orange);}
        .filter-chip-remove{background:none;border:none;cursor:pointer;color:var(--orange);
          font-size:14px;line-height:1;padding:0;margin-left:2px;}

        /* PRODUCT GRID */
        .products-grid{display:grid;
          grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:2px;}
        @media(max-width:480px){.products-grid{grid-template-columns:repeat(2,1fr);}}

        /* PRODUCT CARD */
        .pcard{background:#fff;cursor:pointer;border:1px solid transparent;
          transition:all .18s ease;animation:fadeUp .35s ease both;}
        .pcard:hover{border-color:var(--orange);box-shadow:0 4px 20px rgba(249,115,22,.12);z-index:2;position:relative;}
        .pcard-img-wrap{position:relative;padding-top:100%;background:#f8f8f8;overflow:hidden;}
        .pcard-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
          transition:transform .4s ease;}
        .pcard:hover .pcard-img{transform:scale(1.06);}
        .pcard-no-img{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f0f0f0;}
        .pcard-badges{position:absolute;top:8px;left:8px;display:flex;flex-direction:column;gap:4px;z-index:3;}
        .pcard-discount{background:#e53935;color:#fff;font-size:10px;font-weight:800;
          padding:2px 7px;border-radius:3px;}
        .pcard-sold-out{background:rgba(0,0,0,.6);color:#fff;font-size:9px;font-weight:600;
          padding:2px 7px;border-radius:3px;}
        .pcard-wish{position:absolute;top:8px;right:8px;width:30px;height:30px;
          border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;
          display:flex;align-items:center;justify-content:center;z-index:3;
          box-shadow:0 2px 8px rgba(0,0,0,.12);
          opacity:0;transition:opacity .2s;}
        .pcard:hover .pcard-wish{opacity:1;}
        .pcard-quick-cta{position:absolute;bottom:0;left:0;right:0;background:var(--orange);
          color:#fff;text-align:center;font-size:12px;font-weight:600;padding:8px;
          transform:translateY(100%);transition:transform .25s ease;z-index:3;}
        .pcard:hover .pcard-quick-cta{transform:translateY(0);}
        .pcard-info{padding:10px 10px 14px;}
        .pcard-brand{font-size:10px;color:var(--orange);font-weight:700;
          text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;}
        .pcard-title{font-size:12px;color:var(--text);line-height:1.45;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
          overflow:hidden;min-height:35px;margin-bottom:7px;}
        .pcard-price-row{display:flex;align-items:baseline;gap:7px;margin-bottom:5px;flex-wrap:wrap;}
        .pcard-price{font-size:16px;font-weight:800;color:var(--text);}
        .pcard-compare{font-size:11px;color:#bbb;text-decoration:line-through;}
        .pcard-rating{display:flex;align-items:center;gap:4px;margin-bottom:5px;}
        .pcard-stars{color:#f57c00;font-size:11px;}
        .pcard-rcount{font-size:10px;color:#bbb;}
        .pcard-stock{display:flex;align-items:center;gap:5px;}
        .pcard-stock-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
        .pcard-stock-dot.in{background:#16a34a;}
        .pcard-stock-dot.out{background:#dc2626;}
        .pcard-stock-label{font-size:10px;color:var(--text-muted);}

        /* EMPTY STATE */
        .empty-state{text-align:center;padding:80px 20px;background:#fff;border-radius:8px;}
        .empty-icon{font-size:64px;margin-bottom:20px;}
        .empty-title{font-size:20px;font-weight:700;margin-bottom:8px;}
        .empty-sub{font-size:14px;color:var(--text-muted);margin-bottom:24px;}
        .empty-btn{padding:12px 28px;border-radius:50px;background:var(--orange);color:#fff;
          border:none;font-weight:700;font-size:14px;cursor:pointer;transition:background .18s;}
        .empty-btn:hover{background:var(--orange-dark);}

        /* LOAD MORE */
        .load-more-wrap{text-align:center;padding:32px 0;display:flex;flex-direction:column;
          align-items:center;gap:12px;}
        .load-more-info{font-size:13px;color:var(--text-muted);}
        .load-more-btn{padding:13px 48px;border-radius:50px;border:2px solid var(--text);
          background:#fff;color:var(--text);font-weight:800;font-size:14px;cursor:pointer;
          transition:all .18s;}
        .load-more-btn:hover:not(:disabled){background:var(--text);color:#fff;}
        .load-more-btn:disabled{opacity:.6;}
        .page-btns{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;}
        .page-btn{width:36px;height:36px;border-radius:6px;border:1.5px solid var(--border);
          background:#fff;color:var(--text);font-weight:700;font-size:13px;cursor:pointer;
          transition:all .12s;}
        .page-btn.active,.page-btn:hover{background:var(--orange);color:#fff;border-color:var(--orange);}
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="store-topbar">
        <Link href="/" className="back-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Home
        </Link>

        <div className="store-breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>{selectedCategory || searchQuery || "All Products"}</span>
        </div>

        {/* Search */}
        <div ref={searchRef} className="search-wrap">
          <div className="search-input-wrap">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
            <input
              type="text" placeholder="Search products, brands, categories..."
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && commitSearch()}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="search-input"
            />
            {searchInput && (
              <button className="search-clear"
                onClick={() => { setSearchInput(""); setSearchQuery(""); setSuggestions([]); setActiveQuickCat(""); }}>
                ×
              </button>
            )}
            <button className="search-btn" onClick={() => commitSearch()}>Search</button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((s, i) => (
                <div key={i} className="suggestion-item"
                  onClick={() => { setSearchInput(s); commitSearch(s); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK CATEGORIES ── */}
      <div className="quick-cats">
        <div className="quick-cats-inner">
          {QUICK_CATS.map(c => (
            <button key={c.q} className={`quick-cat ${activeQuickCat === c.q ? "active" : ""}`}
              onClick={() => selectQuickCat(c.q)}>
              {c.icon && <span className="quick-cat-icon">{c.icon}</span>}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div className="store-layout">

        {/* SIDEBAR */}
        <aside className="store-sidebar">
          <div className="sidebar-title">Filter & Refine</div>
          <FilterPanel />
        </aside>

        {/* MAIN CONTENT */}
        <main className="store-content">
          {/* Controls */}
          <div className="store-controls">
            <button className="mobile-filter-btn" onClick={() => setShowMobileFilter(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters {hasFilters && <span style={{ background: "#f97316", color: "#fff", borderRadius: "99px", padding: "1px 6px", fontSize: "11px" }}>!</span>}
            </button>
            <div className="results-info">
              {loading ? "Loading..." : (
                <>
                  <strong>{products.length}</strong> of <strong>{total.toLocaleString()}</strong> products
                  {searchQuery && <> for <strong>"{searchQuery}"</strong></>}
                </>
              )}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value as SortOption)} className="sort-select">
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="active-filters">
              {searchQuery     && <FilterChip label={`"${searchQuery}"`}  onRemove={() => { setSearchQuery(""); setSearchInput(""); setActiveQuickCat(""); }} />}
              {selectedCategory && <FilterChip label={selectedCategory}   onRemove={() => setSelectedCategory("")} />}
              {selectedBrand   && <FilterChip label={selectedBrand}       onRemove={() => setSelectedBrand("")} />}
              {(priceMin || priceMax) && <FilterChip label={`${priceMin||"0"} – ${priceMax||"∞"}`} onRemove={() => { setPriceMin(""); setPriceMax(""); }} />}
              {inStockOnly     && <FilterChip label="In Stock"            onRemove={() => setInStockOnly(false)} />}
              {minRating       && <FilterChip label={`★${minRating}+`}    onRemove={() => setMinRating("")} />}
              <button className="filter-chip filter-chip-remove" style={{ cursor: "pointer" }} onClick={clearAllFilters}>✕ Clear all</button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <SkeletonGrid count={PAGE_SIZE} />
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3 className="empty-title">{searchQuery ? `No results for "${searchQuery}"` : "No products found"}</h3>
              <p className="empty-sub">Try adjusting your filters or search for something else.</p>
              <button className="empty-btn" onClick={clearAllFilters}>Clear All Filters</button>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {products.map((p, i) => (
                  <div key={p.id} style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>
                    <ProductCard product={p} onClick={() => router.push(`/store/product/${p.id}`)} />
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="load-more-wrap">
                  <div className="load-more-info">
                    Showing {products.length} of {total.toLocaleString()} products
                  </div>
                  <button className="load-more-btn" onClick={() => loadProducts(page + 1, true)} disabled={loadingMore}>
                    {loadingMore ? "Loading..." : "Load More Products"}
                  </button>
                  <div className="page-btns">
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(pg => (
                      <button key={pg} className={`page-btn ${pg === page ? "active" : ""}`}
                        onClick={() => loadProducts(pg)}>
                        {pg}
                      </button>
                    ))}
                    {totalPages > 10 && <span style={{ color: "#999", fontSize: 14, display: "flex", alignItems: "center" }}>...</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MOBILE FILTER DRAWER */}
      <div className={`mobile-filter-overlay ${showMobileFilter ? "open" : ""}`}
        onClick={() => setShowMobileFilter(false)}>
        <div className="mobile-filter-drawer" onClick={e => e.stopPropagation()}>
          <div className="mobile-filter-header">
            <span className="mobile-filter-title">Filters</span>
            <button className="mobile-filter-close" onClick={() => setShowMobileFilter(false)}>×</button>
          </div>
          <FilterPanel />
          <button style={{ width: "100%", marginTop: 16, padding: "13px", borderRadius: 8,
            background: "#f97316", color: "#fff", border: "none", fontWeight: 700, fontSize: 14,
            cursor: "pointer" }}
            onClick={() => setShowMobileFilter(false)}>
            Show {total.toLocaleString()} Results
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   HELPERS
================================================================ */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="filter-chip">
      {label}
      <button className="filter-chip-remove" onClick={onRemove}>×</button>
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="products-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shimbox" style={{ borderRadius: 0, height: 280, animationDelay: `${i * 40}ms` }} />
      ))}
    </div>
  );
}