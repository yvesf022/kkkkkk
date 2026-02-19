"use client";

import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import { useRouter } from "next/navigation";

export default function MiniCartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  // Access items via cart.items and subtotal as a plain number
  const cart = useCart((s) => s.cart);
  const subtotal = useCart((s) => s.subtotal);

  if (!open) return null;

  const items = cart?.items ?? [];

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        width: 420,
        height: "100vh",
        background: "#fff",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.15)",
        padding: 30,
        zIndex: 9999,
      }}
    >
      <h2 style={{ fontWeight: 900 }}>Your Cart</h2>

      <div style={{ marginTop: 20 }}>
        {items.map((item) => (
          <div key={item.id} style={{ marginBottom: 10 }}>
            {item.product?.title ?? "Product"} × {item.quantity}
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 14 }}>Your cart is empty</div>
        )}
      </div>

      <div style={{ marginTop: 30, fontWeight: 900 }}>
        Subtotal: {formatCurrency(subtotal)}
      </div>

      <button
        onClick={() => router.push("/store/cart")}
        className="btn btnPrimary"
        style={{ marginTop: 20 }}
      >
        View Cart
      </button>

      <button
        onClick={onClose}
        style={{
          marginTop: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  );
}