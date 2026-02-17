"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import { productsApi } from "@/lib/api";
import type { Product, ProductListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import AddToCartClient from "./AddToCartClient";
import ProductCard from "@/components/store/ProductCard";

export default function ProductPage() {
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(false);

  /* ================= LOAD MAIN PRODUCT ================= */

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

  /* ================= LOAD RELATED PRODUCTS ================= */

  useEffect(() => {
    async function loadRelated() {
      if (!product?.category) return;

      try {
        setLoadingRelated(true);

        const data = await productsApi.list({
          category: product.category,
          per_page: 8,
        });

        const filtered = data.results
          .filter((p) => p.id !== product.id)
          .slice(0, 4);

        setRelated(filtered);
      } catch {
        console.error("Failed to load related products");
      } finally {
        setLoadingRelated(false);
      }
    }

    if (product) loadRelated();
  }, [product]);

  /* ================= LOADING STATES ================= */

  if (loading) {
    return (
      <div style={{ padding: 120, textAlign: "center" }}>
        Loading product...
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: 120, textAlign: "center" }}>
        Product not found.
      </div>
    );
  }

  /* ================= DISCOUNT ================= */

  const discount =
    product.compare_price &&
    product.compare_price > product.price
      ? Math.round(
          ((product.compare_price - product.price) /
            product.compare_price) *
            100
        )
      : null;

  /* ========================================================= */

  return (
    <div style={{ padding: "100px 0" }}>
      <div className="container">
        {/* ================= MAIN GRID ================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 80,
            alignItems: "start",
          }}
        >
          {/* IMAGE SIDE */}
          <div>
            <div
              style={{
                borderRadius: 28,
                overflow: "hidden",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                boxShadow: "0 30px 80px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  height: 520,
                  background: product.main_image
                    ? `url(${product.main_image}) center/cover`
                    : "#e5e7eb",
                }}
              />
            </div>
          </div>

          {/* BUY BOX */}
          <div
            style={{
              position: "sticky",
              top: 120,
              display: "grid",
              gap: 28,
              padding: 40,
              borderRadius: 28,
              border: "1px solid #e5e7eb",
              boxShadow: "0 30px 80px rgba(0,0,0,0.06)",
              background: "#ffffff",
            }}
          >
            {product.brand && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  opacity: 0.5,
                  letterSpacing: 1.5,
                }}
              >
                {product.brand.toUpperCase()}
              </div>
            )}

            <h1
              style={{
                fontSize: 32,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              {product.title}
            </h1>

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

            {/* PRICE */}
            <div style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: "var(--primary)",
                }}
              >
                {formatCurrency(product.price)}
              </div>

              {product.compare_price && (
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      textDecoration: "line-through",
                      opacity: 0.5,
                      fontSize: 16,
                    }}
                  >
                    {formatCurrency(product.compare_price)}
                  </div>

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
                      Save {discount}%
                    </div>
                  )}
                </div>
              )}
            </div>

            {product.short_description && (
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  opacity: 0.7,
                }}
              >
                {product.short_description}
              </p>
            )}

            <AddToCartClient product={product} />
          </div>
        </div>

        {/* ================= DETAILS SECTION ================= */}

        {product.description && (
          <div style={{ marginTop: 100 }}>
            <div
              style={{
                maxWidth: 900,
                margin: "0 auto",
                padding: 40,
                borderRadius: 28,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 20px 60px rgba(0,0,0,0.05)",
              }}
            >
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  marginBottom: 24,
                }}
              >
                Product Details
              </h2>

              <p
                style={{
                  lineHeight: 1.8,
                  opacity: 0.75,
                }}
              >
                {product.description}
              </p>
            </div>
          </div>
        )}

        {/* ================= RELATED PRODUCTS ================= */}

        {related.length > 0 && (
          <div style={{ marginTop: 120 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 900,
                marginBottom: 40,
              }}
            >
              Customers Also Bought
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 30,
              }}
            >
              {related.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                />
              ))}
            </div>
          </div>
        )}
      </div>
     <div className="mobile-buy-bar">
  <div className="price">
    {formatCurrency(product.price)}
  </div>

  <button
    className="btn btnPrimary"
    onClick={() => {
      // trigger your AddToCart logic
      const btn = document.querySelector(".add-to-cart-trigger") as HTMLElement;
      btn?.click();
    }}
  >
    Add to Cart
  </button>
</div>

    </div>
  );
}

