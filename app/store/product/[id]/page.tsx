"use client";

import { formatCurrency } from "@/lib/currency";

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

  /* ================= LOAD PRODUCT ================= */
  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`${API_URL}/api/products/${id}`);

        if (!res.ok) {
          toast.error("Product not found");
          router.push("/store");
          return;
        }

        const data = await res.json();
        setProduct(data);
      } catch (err) {
        toast.error("Failed to load product");
        router.push("/store");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, router]);

  if (loading)
    return (
      <div className="container" style={{ padding: "80px 0" }}>
        <div className="animate-pulse text-center">
          Loading product...
        </div>
      </div>
    );

  if (!product)
    return (
      <div className="container" style={{ padding: "80px 0" }}>
        Product not found
      </div>
    );

  const images = product.images || [];
  const imageUrls = images.map((img: any) =>
    typeof img === "string" ? img : img.image_url
  );

  const hasDiscount =
    product.compare_price &&
    product.compare_price > product.price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compare_price! - product.price) /
          product.compare_price!) *
          100
      )
    : 0;

  /* ================= ADD TO CART ================= */
  function handleAddToCart() {
    if (!product) return;

    if (product.stock < quantity) {
      toast.error("Not enough stock available");
      return;
    }

    setAdding(true);

    try {
      addItem(product, quantity);
      toast.success("Added to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container">
        {/* ================= GRID ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 60,
          }}
        >
          {/* ================= LEFT: IMAGES ================= */}
          <div>
            <div
              className="card"
              style={{
                height: 520,
                background:
                  imageUrls[selectedImage]
                    ? `url(${imageUrls[selectedImage]}) center/contain no-repeat`
                    : product.main_image
                    ? `url(${product.main_image}) center/contain no-repeat`
                    : "var(--gradient-surface)",
                position: "relative",
              }}
            >
              {!imageUrls[selectedImage] &&
                !product.main_image && (
                  <div
                    style={{
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 60,
                      opacity: 0.3,
                    }}
                  >
                    📦
                  </div>
                )}

              {hasDiscount && (
                <div
                  className="badge badge-error"
                  style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                  }}
                >
                  -{discountPercent}% OFF
                </div>
              )}
            </div>

            {/* THUMBNAILS */}
            {imageUrls.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {imageUrls.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      setSelectedImage(idx)
                    }
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 12,
                      background: `url(${img}) center/cover`,
                      border:
                        selectedImage === idx
                          ? "3px solid var(--primary)"
                          : "1px solid var(--gray-200)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ================= RIGHT: INFO ================= */}
          <div>
            {/* CATEGORY */}
            {product.category && (
              <div className="badge badge-primary mb-sm">
                {product.category}
              </div>
            )}

            {/* TITLE */}
            <h1
              className="text-display"
              style={{
                fontSize: 36,
                marginBottom: 16,
              }}
            >
              {product.title}
            </h1>

            {/* PRICE */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                }}
              >
                {formatCurrency(product.price)}
              </div>

              {hasDiscount && (
                <div
                  style={{
                    fontSize: 22,
                    textDecoration:
                      "line-through",
                    opacity: 0.5,
                  }}
                >
                  {formatCurrency(
                    product.compare_price!
                  )}
                </div>
              )}
            </div>

            {/* STOCK */}
            <div
              className={
                product.stock > 0
                  ? "badge badge-success mb-md"
                  : "badge badge-error mb-md"
              }
            >
              {product.stock > 0
                ? `In Stock (${product.stock})`
                : "Out of Stock"}
            </div>

            {/* SHORT DESCRIPTION */}
            {product.short_description && (
              <p
                style={{
                  opacity: 0.8,
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                {product.short_description}
              </p>
            )}

            {/* QUANTITY */}
            {product.stock > 0 && (
              <div className="mb-md">
                <label
                  style={{
                    fontWeight: 700,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Quantity
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <button
                    className="btn btnGhost"
                    onClick={() =>
                      setQuantity(
                        Math.max(1, quantity - 1)
                      )
                    }
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
                        Math.min(
                          product.stock,
                          Math.max(
                            1,
                            Number(e.target.value)
                          )
                        )
                      )
                    }
                    style={{
                      width: 80,
                      textAlign: "center",
                    }}
                  />

                  <button
                    className="btn btnGhost"
                    onClick={() =>
                      setQuantity(
                        Math.min(
                          product.stock,
                          quantity + 1
                        )
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
              }}
            >
              <button
                onClick={handleAddToCart}
                disabled={
                  product.stock === 0 || adding
                }
                className="btn btnPrimary"
                style={{ flex: 1 }}
              >
                {adding
                  ? "Adding..."
                  : "Add to Cart"}
              </button>

              <button
                onClick={() =>
                  router.push("/store/cart")
                }
                className="btn btnGhost"
                style={{ flex: 1 }}
              >
                View Cart
              </button>
            </div>
          </div>
        </div>

        {/* ================= DESCRIPTION ================= */}
        {product.description && (
          <div
            className="card mt-xl"
            style={{ padding: 40 }}
          >
            <h2
              className="text-display mb-md"
              style={{ fontSize: 26 }}
            >
              Product Description
            </h2>

            <div
              style={{
                lineHeight: 1.8,
                opacity: 0.85,
                whiteSpace: "pre-wrap",
              }}
            >
              {product.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
