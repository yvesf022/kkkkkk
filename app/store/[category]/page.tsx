"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

// Import your original high-density ProductCard
import ProductCard from "@/components/store/ProductCard";

export default function CategoryStorePage() {
  const { category } = useParams<{ category: string }>();
  const router = useRouter();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ============ LOAD CATEGORY PRODUCTS ============ */
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);

        // ✅ FIX: Use raw slug (e.g., 'anti_aging' or 'others')
        // Your previous code forced "beauty" to "Beauty", which breaks slug-based lookups
        const slug = decodeURIComponent(category);

        const data = (await productsApi.list({
          category: slug,
          status: 'active' // Enterprise standard: only show active items
        })).results;

        setProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }

    if (category) {
      loadProducts();
    }
  }, [category]);

  // Format title: "anti_aging" -> "ANTI-AGING"
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
            display: "flex", alignItems: "center", gap: 8 
          }}
        >
          ← BACK TO ALL PRODUCTS
        </button>

        <h1 style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 900, marginBottom: 8, color: "#0f3f2f" }}>
          {categoryTitle}
        </h1>
        <p style={{ fontSize: 16, opacity: 0.6 }}>
          {products.length} {products.length === 1 ? "Product" : "Products"} available
        </p>
      </header>

      {/* LOADING STATE - Uses your Shimmer effect */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="shimbox" style={{ height: 420, borderRadius: 20 }} />
          ))}
        </div>
      )}

      {/* PRODUCTS GRID - Using your Original ProductCard */}
      {!loading && products.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* EMPTY STATE - Jumia Level Placeholder */}
      {!loading && products.length === 0 && (
        <div style={{ 
          padding: "100px 20px", textAlign: "center", borderRadius: 22, 
          background: "white", border: "1px solid #eee", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" 
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📦</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: "#0f3f2f" }}>
            Nothing here yet
          </h3>
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
        .shimbox { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}