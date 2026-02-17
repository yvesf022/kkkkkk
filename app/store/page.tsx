"use client";

import { useEffect, useState } from "react";
import { productsApi } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";

export default function StorePage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    try {
      const data = await productsApi.list();
      setProducts(data.results);
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
      {/* ================= HEADER ================= */}
      <section className="section-spacing">
        <div className="container">
          <h1 style={{ marginBottom: 12 }}>
            Explore Our Collection
          </h1>

          <p style={{ opacity: 0.7, maxWidth: 600 }}>
            Discover premium fashion and beauty
            products curated for elegance and
            confidence.
          </p>
        </div>
      </section>

      {/* ================= PRODUCT GRID ================= */}
      <section className="section-spacing">
        <div className="container">
          {loading ? (
            <div className="text-center">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="card text-center">
              <div style={{ fontSize: 48 }}>📦</div>
              <h3 style={{ marginTop: 20 }}>
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
                  product={product}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

