"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/* ================================================================
   IMAGE UTILS (Your original high-quality logic)
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

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  // 1. DYNAMIC CATEGORY FETCHING (Fixes "Fashion/Baby" Ghosting)
  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(res => res.json())
      .then(data => setDbCategories(data))
      .catch(err => console.error("Filter fetch error:", err));
  }, []);

  // 2. PRODUCT LOADING
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = searchParams.toString();
      // Ensure we only show active/stocked items to match Jumia behavior
      const res = await fetch(`${API}/api/products?status=active&${qs}`);
      const data = await res.json();
      setProducts(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /* ============================================================
     FILTER PANEL (YOUR DESIGN - NOW DYNAMIC)
  ============================================================ */
  const FilterPanel = () => {
    const currentCat = searchParams.get("category");
    const currentBrand = searchParams.get("brand");

    const toggleFilter = (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(key) === value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/store?${params.toString()}`);
    };

    return (
      <div style={{ padding: "16px" }}>
        {/* Category Section */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", marginBottom: "12px", color: "#1a1a1a" }}>Category</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dbCategories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => toggleFilter("category", cat.slug)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: "none",
                  border: "none",
                  padding: "4px 0",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: currentCat === cat.slug ? "#0f3f2f" : "#666",
                  fontWeight: currentCat === cat.slug ? 800 : 400,
                  textAlign: "left"
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

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px", display: "flex", gap: "30px" }}>
      
      {/* Sidebar - Desktop Only */}
      <aside style={{ width: "260px", flexShrink: 0 }} className="desktop-only">
        <FilterPanel />
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 900 }}>
            {searchParams.get("category")?.replace("_", " ").toUpperCase() || "ALL PRODUCTS"}
            <span style={{ fontSize: "14px", fontWeight: 400, color: "#666", marginLeft: "10px" }}>({total} products)</span>
          </h1>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" }}>
            {[...Array(8)].map((_, i) => <div key={i} className="shimbox" style={{ height: "300px", borderRadius: "8px" }} />)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" }}>
            {products.map((p) => (
              <Link key={p.id} href={`/store/product/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ border: "1px solid #eee", borderRadius: "8px", overflow: "hidden", background: "white" }}>
                  <div style={{ aspectRatio: "1/1", background: "#f9f9f9" }}>
                    <img src={optimizeImg(resolveImg(p.main_image)) || "/placeholder.png"} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "10px" }} />
                  </div>
                  <div style={{ padding: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>{p.brand}</div>
                    <div style={{ fontSize: "14px", fontWeight: 500, height: "40px", overflow: "hidden" }}>{p.title}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, marginTop: "8px" }}>{formatCurrency(p.price)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .shimbox { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (max-width: 768px) { .desktop-only { display: none; } }
      `}</style>
    </div>
  );
}