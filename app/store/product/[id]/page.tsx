"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  /* ============ LOAD PRODUCT ============ */
  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`${API_URL}/api/products/${id}`);

        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Product not found");
            router.push("/store");
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setProduct(data);
      } catch (err: any) {
        console.error("Failed to load product:", err);
        toast.error("Failed to load product");
        router.push("/store");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, router]);

  /* ============ ADD TO CART ============ */
  async function handleAddToCart() {
    if (!product) return;

    if (product.stock < quantity) {
      toast.error("Not enough stock available");
      return;
    }

    setAdding(true);

    try {
      addItem(product, quantity);
      toast.success("Added to cart!");
    } catch (err) {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  /* ============ LOADING STATE ============ */
  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            height: 500,
            borderRadius: 22,
            background: "#f8fafc",
            display: "grid",
            placeItems: "center",
          }}
        >
          <p style={{ opacity: 0.6 }}>Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <p>Product not found</p>
      </div>
    );
  }

  const images = product.images || [];
  const imageUrls = images.map((img: any) => 
    typeof img === 'string' ? img : img.image_url
  );
  
  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      {/* BREADCRUMB */}
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 24 }}>
        <button
          onClick={() => router.push("/store")}
          style={{
            background: "none",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Store
        </button>
        {product.category && (
          <>
            {" › "}
            <button
              onClick={() => router.push(`/store?category=${product.category}`)}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {product.category}
            </button>
          </>
        )}
        {" › "}
        <strong>{product.title}</strong>
      </div>

      {/* PRODUCT DETAILS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
          marginBottom: 48,
        }}
      >
        {/* LEFT: IMAGES */}
        <div>
          {/* MAIN IMAGE */}
          <div
            style={{
              height: 500,
              borderRadius: 22,
              background: imageUrls[selectedImage]
                ? `url(${imageUrls[selectedImage]}) center/contain no-repeat`
                : product.main_image
                ? `url(${product.main_image}) center/contain no-repeat`
                : "linear-gradient(135deg, #e0e7ff, #dbeafe)",
              border: "1px solid rgba(15,23,42,0.08)",
              marginBottom: 16,
              position: "relative",
            }}
          >
            {!imageUrls[selectedImage] && !product.main_image && (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 64,
                  opacity: 0.3,
                }}
              >
                📦
              </div>
            )}

            {/* Discount Badge */}
            {hasDiscount && (
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: 20,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "#991b1b",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                -{discountPercent}% OFF
              </div>
            )}
          </div>

          {/* THUMBNAILS */}
          {imageUrls.length > 1 && (
            <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
              {imageUrls.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    background: `url(${img}) center/cover`,
                    border:
                      selectedImage === idx
                        ? "3px solid #6366f1"
                        : "1px solid rgba(15,23,42,0.1)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: INFO */}
        <div>
          {/* BADGES */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {product.category && (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "#e0e7ff",
                  color: "#3730a3",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {product.category}
              </span>
            )}

            {product.brand && (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "#f3f4f6",
                  color: "#374151",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {product.brand}
              </span>
            )}
          </div>

          {/* TITLE */}
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              marginBottom: 12,
              lineHeight: 1.2,
            }}
          >
            {product.title}
          </h1>

          {/* RATING */}
          {product.rating && product.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 18 }}>
                {"⭐".repeat(Math.round(product.rating))}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {product.rating.toFixed(1)}
              </span>
              {product.sales && product.sales > 0 && (
                <span style={{ fontSize: 14, opacity: 0.6 }}>
                  • {product.sales} sold
                </span>
              )}
            </div>
          )}

          {/* SHORT DESCRIPTION */}
          {product.short_description && (
            <p
              style={{
                fontSize: 16,
                opacity: 0.8,
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              {product.short_description}
            </p>
          )}

          {/* PRICE */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 40, fontWeight: 900 }}>
                R {Math.round(product.price).toLocaleString()}
              </div>

              {hasDiscount && (
                <div
                  style={{
                    fontSize: 24,
                    opacity: 0.5,
                    textDecoration: "line-through",
                  }}
                >
                  R {Math.round(product.compare_price!).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* STOCK STATUS */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: product.stock > 0 ? "#dcfce7" : "#fee2e2",
              color: product.stock > 0 ? "#166534" : "#991b1b",
              fontSize: 14,
              fontWeight: 800,
              marginBottom: 24,
            }}
          >
            {product.stock > 0
              ? `✓ In Stock (${product.stock} available)`
              : "✗ Out of Stock"}
          </div>

          {/* QUANTITY SELECTOR */}
          {product.stock > 0 && (
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Quantity
              </label>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: "1px solid rgba(15,23,42,0.2)",
                    background: "#fff",
                    fontSize: 18,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  −
                </button>

                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1))
                    )
                  }
                  style={{
                    width: 80,
                    height: 40,
                    textAlign: "center",
                    border: "1px solid rgba(15,23,42,0.2)",
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                />

                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: "1px solid rgba(15,23,42,0.2)",
                    background: "#fff",
                    fontSize: 18,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* ADD TO CART BUTTON */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0 || adding}
            className="btn btnPrimary"
            style={{
              width: "100%",
              padding: "16px",
              fontSize: 16,
              fontWeight: 900,
              marginBottom: 12,
              opacity: product.stock === 0 ? 0.5 : 1,
              cursor: product.stock === 0 ? "not-allowed" : "pointer",
            }}
          >
            {adding ? "Adding..." : product.stock === 0 ? "Out of Stock" : "🛒 Add to Cart"}
          </button>

          <button
            onClick={() => router.push("/store/cart")}
            className="btn btnGhost"
            style={{ width: "100%", padding: "16px" }}
          >
            View Cart
          </button>
        </div>
      </div>

      {/* DESCRIPTION & FEATURES */}
      <div style={{ display: "grid", gap: 28 }}>
        {/* DESCRIPTION */}
        {product.description && (
          <section
            style={{
              padding: 32,
              borderRadius: 22,
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>
              Description
            </h2>

            <div
              style={{
                fontSize: 15,
                lineHeight: 1.8,
                opacity: 0.9,
                whiteSpace: "pre-wrap",
              }}
            >
              {product.description}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}