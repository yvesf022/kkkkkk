"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { motion } from "framer-motion";

import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import { notify } from "@/components/ui/ToastProvider";
import type { ProductListItem } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function ProductCard({
  product,
}: {
  product: ProductListItem;
}) {
  const cart = useCart();
  const imageRef = useRef<HTMLDivElement>(null);

  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const isOutOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const imageUrl =
    product.main_image?.startsWith("http")
      ? product.main_image
      : product.main_image
      ? `${API}${product.main_image}`
      : "";

  function animateFlyToCart() {
    const cartIcon = document.querySelector(
      ".floating-cart"
    ) as HTMLElement;

    if (!imageRef.current || !cartIcon) return;

    const rect = imageRef.current.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    const clone = imageRef.current.cloneNode(true) as HTMLElement;

    clone.style.position = "fixed";
    clone.style.top = rect.top + "px";
    clone.style.left = rect.left + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    clone.style.zIndex = "9999";
    clone.style.transition =
      "all 0.7s cubic-bezier(.22,.9,.34,1)";
    clone.style.borderRadius = "16px";

    document.body.appendChild(clone);

    requestAnimationFrame(() => {
      clone.style.top = cartRect.top + "px";
      clone.style.left = cartRect.left + "px";
      clone.style.width = "30px";
      clone.style.height = "30px";
      clone.style.opacity = "0.4";
    });

    setTimeout(() => clone.remove(), 700);
  }

  async function handleAddToCart() {
    if (isOutOfStock) {
      notify.error("This product is out of stock");
      return;
    }

    setAdding(true);

    try {
      animateFlyToCart();
      cart.addItem(product, 1);
      notify.success("Added to cart");
    } catch {
      notify.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="product-card"
    >
      {/* IMAGE */}
      <div style={{ position: "relative" }}>
        <Link href={`/store/product/${product.id}`}>
          <motion.div
            ref={imageRef}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="product-image"
            style={{
              backgroundImage: imageUrl
                ? `url(${imageUrl})`
                : undefined,
              backgroundColor: imageUrl
                ? undefined
                : "#f3f4f6",
            }}
          >
            {!imageUrl && (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "100%",
                  fontSize: 40,
                }}
              >
                📦
              </div>
            )}
          </motion.div>
        </Link>

        {/* WISHLIST */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          animate={
            wishlisted ? { scale: [1, 1.2, 1] } : {}
          }
          transition={{ duration: 0.3 }}
          onClick={() => setWishlisted(!wishlisted)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: "#ffffff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow:
              "0 8px 20px rgba(0,0,0,0.12)",
            fontSize: 18,
          }}
        >
          {wishlisted ? "❤️" : "🤍"}
        </motion.button>

        {/* OUT OF STOCK OVERLAY */}
        {isOutOfStock && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 1,
            }}
          >
            OUT OF STOCK
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="product-info">
        {product.brand && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              opacity: 0.5,
              letterSpacing: 1,
            }}
          >
            {product.brand.toUpperCase()}
          </div>
        )}

        <Link
          href={`/store/product/${product.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="product-title">
            {product.title}
          </div>
        </Link>

        {product.rating && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#f59e0b",
            }}
          >
            ★ {product.rating}
          </div>
        )}

        {lowStock && !isOutOfStock && (
          <motion.div
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
            }}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#dc2626",
            }}
          >
            Only {product.stock} left!
          </motion.div>
        )}

        <div className="product-price">
          {formatCurrency(product.price)}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={`/store/product/${product.id}`}
            className="btn btnGhost"
          >
            View
          </Link>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddToCart}
            disabled={isOutOfStock || adding}
            className="btn btnPrimary"
            style={{
              opacity: isOutOfStock ? 0.6 : 1,
              cursor: isOutOfStock
                ? "not-allowed"
                : "pointer",
            }}
          >
            {adding
              ? "Adding..."
              : isOutOfStock
              ? "Unavailable"
              : "Add"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
