"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import { notify } from "@/components/ui/ToastProvider";
import type { Product } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const cart = useCart();
  const [adding, setAdding] = useState(false);

  const discount = useMemo(() => {
    if (!product.compare_price || product.compare_price <= product.price)
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
      notify.error("This product is currently out of stock");
      return;
    }

    setAdding(true);

    try {
      cart.addItem(product, 1);
      notify.success(`${product.title} added to cart`);
    } catch (err) {
      notify.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="product-card">
      {/* IMAGE */}
      <Link href={`/store/product/${product.id}`}>
        <div
          className="product-image"
          style={{
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          }}
        >
          {!imageUrl && <div style={{ fontSize: 40 }}>📦</div>}

          {discount && !isOutOfStock && (
            <div className="product-badge badge badge-primary">
              −{discount}%
            </div>
          )}

          {isOutOfStock && (
            <div className="product-badge badge badge-error">
              OUT OF STOCK
            </div>
          )}
        </div>
      </Link>

      {/* INFO */}
      <div className="product-info">
        <div className="product-title">
          {product.title}
        </div>

        <div className="product-price">
          {formatCurrency(product.price)}
        </div>

        {product.compare_price && (
          <div
            style={{
              textDecoration: "line-through",
              opacity: 0.6,
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            {formatCurrency(product.compare_price)}
          </div>
        )}

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
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
            {adding
              ? "..."
              : isOutOfStock
              ? "Unavailable"
              : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
