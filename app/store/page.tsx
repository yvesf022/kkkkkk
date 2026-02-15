"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { productsApi } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";

export default function StorePage() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    try {
      const data = await productsApi.list();
      setProducts(data);
    } catch {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div>
      {/* ================= STORE HEADER ================= */}
      <section
        style={{
          padding: "60px 0",
          background: "var(--gradient-surface)",
        }}
      >
        <div className="container">
          <h1
            className="text-display"
            style={{ fontSize: 42, marginBottom: 10 }}
          >
            Explore Our Collection
          </h1>

          <p style={{ opacity: 0.7 }}>
            Discover premium fashion and beauty products curated for elegance and confidence.
          </p>
        </div>
      </section>

      {/* ================= PRODUCT GRID ================= */}
      <section style={{ padding: "70px 0" }}>
        <div className="container">
          {loading ? (
            <div className="text-center animate-pulse">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="card text-center" style={{ padding: 60 }}>
              <div style={{ fontSize: 60 }}>📦</div>
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  marginTop: 20,
                }}
              >
                No products available
              </h3>
              <p style={{ opacity: 0.6 }}>
                Please check back later.
              </p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product as any}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
