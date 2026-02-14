"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

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
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          Store
        </h1>
        <p style={{ opacity: 0.6 }}>
          Browse available products
        </p>
      </header>

      {/* GRID */}
      {loading ? (
        <p>Loading products…</p>
      ) : products.length === 0 ? (
        <div
          style={{
            padding: 80,
            textAlign: "center",
            borderRadius: 22,
            background: "#ffffff",
            boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          }}
        >
          <div style={{ fontSize: 60 }}>📦</div>
          <h3 style={{ fontSize: 22, fontWeight: 900 }}>
            No products available
          </h3>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns:
              "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() =>
                router.push(`/store/product/${product.id}`)
              }
              style={{
                borderRadius: 20,
                background: "#ffffff",
                boxShadow:
                  "0 18px 50px rgba(15,23,42,0.12)",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              {/* IMAGE */}
              <div
                style={{
                  height: 220,
                  background: product.main_image
                    ? `url(${product.main_image}) center/cover`
                    : "#e5e7eb",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {!product.main_image && (
                  <span style={{ fontSize: 40 }}>
                    📦
                  </span>
                )}
              </div>

              {/* CONTENT */}
              <div style={{ padding: 20 }}>
                {/* CATEGORY BADGE */}
                {product.category && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "#e0e7ff",
                      color: "#3730a3",
                      display: "inline-block",
                      marginBottom: 10,
                    }}
                  >
                    {product.category}
                  </div>
                )}

                {/* TITLE */}
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    marginBottom: 8,
                  }}
                >
                  {product.title}
                </h3>

                {/* PRICE */}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                  }}
                >
                  {fmtM(product.price)}
                </div>

                {/* RATING */}
                {product.rating &&
                  product.rating > 0 && (
                    <div
                      style={{
                        fontSize: 13,
                        opacity: 0.7,
                        marginTop: 6,
                      }}
                    >
                      ⭐ {product.rating.toFixed(1)}
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
