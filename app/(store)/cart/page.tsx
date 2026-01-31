"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/app/context/CartContext";

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart();

  const total = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Your Cart is Empty
        </h1>
        <p style={{ opacity: 0.6, marginTop: 8 }}>
          Browse products and add them to your cart.
        </p>

        <Link
          href="/store"
          className="btn btnTech"
          style={{ marginTop: 16, display: "inline-block" }}
        >
          Go to Store
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>
        Shopping Cart
      </h1>

      {/* ITEMS */}
      <div style={{ display: "grid", gap: 18 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr auto",
              gap: 16,
              alignItems: "center",
              padding: 16,
              borderRadius: 18,
              background: "#fff",
              boxShadow:
                "0 12px 30px rgba(15,23,42,0.08)",
            }}
          >
            <Image
              src={item.image}
              alt={item.title}
              width={80}
              height={80}
              style={{ objectFit: "cover", borderRadius: 12 }}
            />

            <div>
              <div style={{ fontWeight: 800 }}>
                {item.title}
              </div>
              <div style={{ opacity: 0.6 }}>
                {fmtM(item.price)} × {item.quantity}
              </div>
            </div>

            <button
              className="btn btnGhost"
              onClick={() => removeFromCart(item.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* SUMMARY */}
      <div
        style={{
          padding: 20,
          borderRadius: 22,
          background:
            "linear-gradient(135deg,#ffffff,#f4f9ff)",
          boxShadow:
            "0 18px 50px rgba(15,23,42,0.14)",
          display: "grid",
          gap: 14,
          maxWidth: 420,
        }}
      >
        <div style={{ fontWeight: 800 }}>
          Order Summary
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          <span>Total</span>
          <span>{fmtM(total)}</span>
        </div>

        <Link
          href="/store/checkout"
          className="btn btnTech"
        >
          Proceed to Checkout
        </Link>

        <button
          className="btn btnGhost"
          onClick={clearCart}
        >
          Clear Cart
        </button>
      </div>
    </div>
  );
}
