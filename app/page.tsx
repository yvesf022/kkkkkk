"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { productsApi } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await productsApi.list({
          page: 1,
          per_page: 8,
        });
        if (Array.isArray(data)) setProducts(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* ================= HERO ================= */}
<section className="hero-section">
  <div className="container">
    <div className="hero-grid">

      {/* LEFT TEXT */}
      <div className="hero-text">
        <div className="hero-badge">
          🇱🇸 Lesotho Premium Boutique
        </div>

        <h1 className="hero-title">
          Discover Your Style
        </h1>

        <p className="hero-subtitle">
          Curated fashion and beauty collections crafted
          for elegance, confidence and modern lifestyle.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="btn btnPrimary"
            onClick={() => router.push("/store")}
          >
            Shop Now
          </button>

          <button
            className="btn btnGhost"
            onClick={() => router.push("/store")}
          >
            Explore
          </button>
        </div>
      </div>

      {/* RIGHT PRODUCT SHOWCASE */}
      {!loading && (
        <div className="hero-products">
          {products.slice(0, 4).map((product) => (
            <div
              key={product.id}
              className="product-card"
              onClick={() =>
                router.push(`/store/product/${product.id}`)
              }
              style={{ cursor: "pointer" }}
            >
              <div
                className="product-image"
                style={{
                  backgroundImage: product.main_image
                    ? `url(${product.main_image})`
                    : undefined,
                }}
              />

              <div
                className="product-info"
                style={{ padding: 12 }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {product.title}
                </div>

                <div
                  className="product-price"
                  style={{ fontSize: 16 }}
                >
                  {product.price}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  </div>
</section>


      {/* ================= FEATURED GRID ================= */}
      <section className="section-spacing">
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: 40,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <h2>Featured Collection</h2>

            <button
              className="btn btnPrimary"
              onClick={() =>
                router.push("/store")
              }
            >
              View All
            </button>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
