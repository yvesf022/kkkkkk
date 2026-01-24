"use client";

import { useCart } from "../context/CartContext";
import Link from "next/link";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity } = useCart();

  if (cart.length === 0) {
    return (
      <div className="glass neon-text" style={{ padding: "2rem", marginTop: "2rem" }}>
        <h1>Your Cart is Empty</h1>
        <Link href="/store" className="btn pill">
          Go to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="glass neon-text" style={{ padding: "2rem", marginTop: "2rem" }}>
      <h1>Your Cart</h1>

      {cart.map((item) => (
        <div
          key={item.id}
          className="glass"
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1rem",
            padding: "1rem",
            alignItems: "center",
          }}
        >
          {/* ✅ FIX: image instead of img */}
          {item.image && (
            <div
              style={{
                width: 86,
                height: 86,
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: 12,
              }}
            />
          )}

          <div style={{ flex: 1 }}>
            <h3>{item.title}</h3>
            <p>{item.price}</p>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                className="btn pill"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
              >
                −
              </button>

              <span>{item.quantity}</span>

              <button
                className="btn pill"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
              >
                +
              </button>
            </div>
          </div>

          <button className="btn" onClick={() => removeFromCart(item.id)}>
            Remove
          </button>
        </div>
      ))}

      <Link href="/checkout" className="btn pill">
        Proceed to Checkout
      </Link>
    </div>
  );
}
