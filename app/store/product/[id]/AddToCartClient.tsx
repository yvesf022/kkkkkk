"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/lib/cart"; // assuming you use a cart store

type Props = {
  product: {
    id: string;
    title: string;
    price: number;
    main_image: string;
    in_stock?: boolean;
    stock: number;
  };
};

export default function AddToCartClient({ product }: Props) {
  const addItem = useCart((s) => s.addItem);

  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const isInStock = product.stock > 0;

  function increase() {
    if (qty >= product.stock) {
      toast.error("Maximum available stock reached");
      return;
    }
    setQty((q) => q + 1);
  }

  function decrease() {
    if (qty <= 1) return;
    setQty((q) => q - 1);
  }

  async function handleAdd() {
    if (!isInStock) {
      toast.error("Product is out of stock");
      return;
    }

    setAdding(true);

    try {
      addItem({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.main_image,
        quantity: qty,
      });

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
        gap: 16,
        marginTop: 10,
        maxWidth: 320,
      }}
    >
      {/* QUANTITY SELECTOR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={decrease}
          disabled={qty <= 1}
          style={qtyButton}
        >
          −
        </button>

        <span style={{ fontWeight: 800 }}>
          {qty}
        </span>

        <button
          onClick={increase}
          disabled={qty >= product.stock}
          style={qtyButton}
        >
          +
        </button>
      </div>

      {/* ADD BUTTON */}
      <button
        disabled={!isInStock || adding}
        onClick={handleAdd}
        style={{
          padding: "14px 20px",
          borderRadius: 12,
          background: isInStock ? "#111827" : "#9ca3af",
          color: "white",
          fontWeight: 800,
          border: "none",
          cursor: isInStock ? "pointer" : "not-allowed",
          fontSize: 15,
        }}
      >
        {adding
          ? "Adding..."
          : isInStock
          ? "Add to Cart"
          : "Out of Stock"}
      </button>

      {/* STOCK INFO */}
      {isInStock && product.stock <= 5 && (
        <div
          style={{
            fontSize: 13,
            color: "#dc2626",
            fontWeight: 700,
          }}
        >
          Only {product.stock} left in stock
        </div>
      )}
    </div>
  );
}

const qtyButton: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "white",
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
};
