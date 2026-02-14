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

  // ✅ Matches CartState exactly
  const addItem = useCart((s) => s.addItem);

  function handleAdd() {
    if (!product.in_stock || product.stock <= 0) {
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

    // ✅ CORRECT — pass full Product + quantity
    addItem(product, qty);

    toast.success("Added to cart");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Quantity Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          style={qtyBtn}
        >
          -
        </button>

        <span style={{ fontWeight: 800, fontSize: 16 }}>
          {qty}
        </span>

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

      {/* Add to Cart Button */}
      <button
        onClick={handleAdd}
        disabled={!product.in_stock}
        style={{
          padding: "14px 20px",
          borderRadius: 12,
          border: "none",
          fontWeight: 900,
          background: product.in_stock
            ? "#111827"
            : "#9ca3af",
          color: "#ffffff",
          cursor: product.in_stock
            ? "pointer"
            : "not-allowed",
        }}
      >
        {product.in_stock
          ? "Add to Cart"
          : "Out of Stock"}
      </button>
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};
