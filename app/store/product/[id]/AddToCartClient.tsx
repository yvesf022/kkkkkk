"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";

interface Props {
  product: Product;
}

export default function AddToCartClient({ product }: Props) {
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const addItem = useCart((s) => s.addItem);

  const inStock = product.in_stock && product.stock > 0;

  function handleAdd() {
    if (!inStock) {
      toast.error("Product is out of stock");
      return;
    }

    if (qty < 1) {
      toast.error("Invalid quantity");
      return;
    }

    if (qty > product.stock) {
      toast.error("Not enough stock available");
      return;
    }

    setAdding(true);

    try {
      addItem(product, qty);
      toast.success("Added to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        marginTop: 20,
      }}
    >
      {/* STOCK STATUS */}
      <div>
        {inStock ? (
          <span
            style={{
              fontWeight: 700,
              color: "#166534",
              fontSize: 14,
            }}
          >
            ✓ In Stock ({product.stock} available)
          </span>
        ) : (
          <span
            style={{
              fontWeight: 700,
              color: "#991b1b",
              fontSize: 14,
            }}
          >
            ✗ Out of Stock
          </span>
        )}
      </div>

      {/* QUANTITY SELECTOR */}
      {inStock && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span style={{ fontWeight: 700 }}>Quantity</span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(15,23,42,0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={qtyBtn}
            >
              −
            </button>

            <div
              style={{
                minWidth: 50,
                textAlign: "center",
                fontWeight: 800,
              }}
            >
              {qty}
            </div>

            <button
              type="button"
              onClick={() =>
                setQty((q) => Math.min(product.stock, q + 1))
              }
              style={qtyBtn}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* ADD TO CART BUTTON */}
      <button
        onClick={handleAdd}
        disabled={!inStock || adding}
        className="btn btnPrimary"
        style={{
          padding: "16px",
          fontSize: 16,
          fontWeight: 900,
          opacity: !inStock ? 0.6 : 1,
          cursor: !inStock ? "not-allowed" : "pointer",
        }}
      >
        {adding
          ? "Adding..."
          : inStock
          ? "🛒 Add to Cart"
          : "Unavailable"}
      </button>
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "#ffffff",
  border: "none",
  fontWeight: 900,
  fontSize: 18,
  cursor: "pointer",
};
