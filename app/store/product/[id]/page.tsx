"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import { productsApi } from "@/lib/api";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import AddToCartClient from "./AddToCartClient";

export default function ProductPage() {
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await productsApi.get(productId);
        setProduct(data as Product);
      } catch {
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    if (productId) loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        Loading product...
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        Product not found.
      </div>
    );
  }

  const discount =
    product.compare_price &&
    product.compare_price > product.price
      ? Math.round(
          ((product.compare_price - product.price) /
            product.compare_price) *
            100,
        )
      : null;

  return (
    <div style={{ padding: "80px 0" }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 60,
            alignItems: "start",
          }}
        >
          {/* ================= LEFT IMAGE SECTION ================= */}
          <div>
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  height: 500,
                  background: product.main_image
                    ? `url(${product.main_image}) center/cover`
                    : "#e5e7eb",
                }}
              />
            </div>
          </div>

          {/* ================= RIGHT CONTENT ================= */}
          <div style={{ display: "grid", gap: 30 }}>
            {/* BRAND */}
            {product.brand && (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  opacity: 0.6,
                  letterSpacing: 1,
                }}
              >
                {product.brand.toUpperCase()}
              </div>
            )}

            {/* TITLE */}
            <h1
              style={{
                fontSize: 34,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              {product.title}
            </h1>

            {/* RATING */}
            {product.rating && (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#f59e0b",
                }}
              >
                ★ {product.rating} / 5
              </div>
            )}

            {/* PRICE SECTION */}
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: "var(--primary)",
                }}
              >
                {formatCurrency(product.price)}
              </div>

              {product.compare_price && (
                <div
                  style={{
                    fontSize: 18,
                    textDecoration: "line-through",
                    opacity: 0.5,
                  }}
                >
                  {formatCurrency(product.compare_price)}
                </div>
              )}

              {discount && (
                <div
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  -{discount}%
                </div>
              )}
            </div>

            {/* SHORT DESCRIPTION */}
            {product.short_description && (
              <p style={{ opacity: 0.7, fontSize: 15 }}>
                {product.short_description}
              </p>
            )}

            {/* ADD TO CART */}
            <AddToCartClient product={product} />

            {/* FULL DESCRIPTION */}
            {product.description && (
              <div
                style={{
                  marginTop: 40,
                  paddingTop: 40,
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    marginBottom: 16,
                  }}
                >
                  Product Details
                </h2>
                <p style={{ opacity: 0.75, lineHeight: 1.7 }}>
                  {product.description}
                </p>
              </div>
            )}

            {/* SPECS */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div
                style={{
                  marginTop: 30,
                  padding: 24,
                  borderRadius: 20,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <h3
                  style={{
                    fontWeight: 900,
                    marginBottom: 16,
                  }}
                >
                  Specifications
                </h3>

                <div style={{ display: "grid", gap: 8 }}>
                  {Object.entries(product.specs).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 14,
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>{key}</span>
                        <span style={{ fontWeight: 700 }}>
                          {String(value)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
