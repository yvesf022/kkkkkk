"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { productsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await productsApi.list({ page: 1, per_page: 8 });
        if (Array.isArray(data)) setProducts(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* ================= SHORT HERO + PRODUCTS ================= */}
      <section
        style={{
          padding: "60px 0",
          background:
            "linear-gradient(135deg,#006838 0%,#004d28 50%,#0047ab 100%)",
          color: "white",
        }}
      >
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.3fr",
            gap: 50,
            alignItems: "center",
          }}
        >
          {/* LEFT MESSAGE */}
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                fontWeight: 700,
                marginBottom: 18,
              }}
            >
              🇱🇸 Lesotho Premium Boutique
            </div>

            <h1
              style={{
                fontSize: 48,
                fontWeight: 900,
                lineHeight: 1.1,
                marginBottom: 20,
              }}
            >
              Discover Your Style
            </h1>

            <p
              style={{
                fontSize: 16,
                opacity: 0.9,
                marginBottom: 28,
              }}
            >
              Curated fashion and beauty collections crafted
              for elegance, confidence and modern lifestyle.
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btnAccent"
                onClick={() => router.push("/store")}
              >
                Shop Now
              </button>

              <button
                className="btn btnOutline"
                style={{ color: "white", borderColor: "white" }}
                onClick={() => router.push("/store")}
              >
                Explore
              </button>
            </div>
          </div>

          {/* RIGHT – PRODUCTS VISIBLE IMMEDIATELY */}
          <div>
            {loading ? (
              <div className="text-center">
                Loading products...
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(180px,1fr))",
                  gap: 16,
                }}
              >
                {products.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    style={{
                      background: "white",
                      borderRadius: 16,
                      overflow: "hidden",
                      cursor: "pointer",
                      boxShadow:
                        "0 12px 30px rgba(0,0,0,0.2)",
                    }}
                    onClick={() =>
                      router.push(
                        `/store/product/${product.id}`
                      )
                    }
                  >
                    <div
                      style={{
                        height: 140,
                        background: product.main_image
                          ? `url(${product.main_image}) center/cover`
                          : "#e5e7eb",
                      }}
                    />

                    <div style={{ padding: 12 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: 4,
                          color: "#111",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {product.title}
                      </div>

                      <div
                        style={{
                          fontWeight: 900,
                          color: "#006838",
                        }}
                      >
                        {formatCurrency(product.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= FULL PRODUCT GRID ================= */}
      <section style={{ padding: "80px 0" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 40,
            }}
          >
            <h2
              style={{
                fontSize: 32,
                fontWeight: 900,
              }}
            >
              Featured Collection
            </h2>

            <button
              className="btn btnSecondary"
              onClick={() => router.push("/store")}
            >
              View All
            </button>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product as any}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
