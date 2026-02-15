"use client";

import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";

import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL!;

/** Currency formatter */
const fmt = (v: number) => `R ${Math.round(v).toLocaleString()}`;

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const cart = useCart();
  const [adding, setAdding] = useState(false);

  const discount = useMemo(() => {
    if (
      !product.compare_price ||
      product.compare_price <= product.price
    )
      return null;

    return Math.round(
      ((product.compare_price - product.price) /
        product.compare_price) *
        100
    );
  }, [product.compare_price, product.price]);

  const isOutOfStock =
    product.in_stock === false || product.stock <= 0;

  const imageUrl = product.main_image?.startsWith("http")
    ? product.main_image
    : product.main_image
    ? `${API}${product.main_image}`
    : "";

  function handleAddToCart() {
    if (isOutOfStock) {
      toast.error("This product is currently out of stock");
      return;
    }

    setAdding(true);
    
    try {
      // ✅ Pass full product object and quantity
      cart.addItem(product, 1);
      toast.success("Added to cart");
    } catch (err) {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 22,
        background: "linear-gradient(135deg,#ffffff,#f8fbff)",
        boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
        display: "grid",
        gap: 10,
        opacity: isOutOfStock ? 0.6 : 1,
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        if (!isOutOfStock) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 24px 60px rgba(15,23,42,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 18px 50px rgba(15,23,42,0.14)";
      }}
    >
      {/* TOP ROW */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {product.category && (
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 900,
              background: "rgba(96,165,250,0.12)",
              color: "#1e3a8a",
            }}
          >
            {product.category.toUpperCase()}
          </span>
        )}

        {isOutOfStock ? (
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 900,
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            OUT OF STOCK
          </span>
        ) : (
          discount && (
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 900,
                background:
                  "linear-gradient(135deg,#fde68a,#f472b6)",
              }}
            >
              −{discount}%
            </span>
          )
        )}
      </div>

      {/* IMAGE */}
      <Link href={`/store/product/${product.id}`}>
        <div
          style={{
            height: 170,
            borderRadius: 18,
            overflow: "hidden",
            background: imageUrl
              ? `url(${imageUrl}) center/cover`
              : "linear-gradient(135deg, #e0e7ff, #dbeafe)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {!imageUrl && (
            <div style={{ fontSize: 48, opacity: 0.3 }}>📦</div>
          )}
        </div>
      </Link>

      {/* TITLE */}
      <div
        style={{
          fontWeight: 900,
          fontSize: 14,
          color: "#0f172a",
          lineHeight: 1.3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {product.title}
      </div>

      {/* PRICE */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 900, fontSize: 18 }}>
          {fmt(product.price)}
          {product.compare_price && (
            <span
              style={{
                marginLeft: 6,
                textDecoration: "line-through",
                opacity: 0.5,
                fontSize: 14,
              }}
            >
              {fmt(product.compare_price)}
            </span>
          )}
        </span>
      </div>

      {/* ACTIONS */}
      <div style={{ display: "flex", gap: 8 }}>
        <Link
          href={`/store/product/${product.id}`}
          className="btn btnGhost"
          style={{ flex: 1, textAlign: "center" }}
        >
          View
        </Link>

        <button
          className="btn btnPrimary"
          style={{ flex: 1 }}
          disabled={isOutOfStock || adding}
          onClick={handleAddToCart}
        >
          {adding ? "..." : isOutOfStock ? "Unavailable" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}