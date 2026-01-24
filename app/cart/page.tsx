"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "../context/CartContext";

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) => `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function CartPage() {
  const { items, removeFromCart, clearCart, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="glass neon-border" style={{ padding: 18 }}>
        <h1 className="neon-text">Your cart is empty</h1>
        <p style={{ marginTop: 10 }}>
          Add products from Karabo’s Boutique and checkout securely.
        </p>

        <Link href="/store" className="btn btnPrimary" style={{ marginTop: 14 }}>
          Go to Store →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* HEADER */}
      <div className="glass neon-border" style={{ padding: 16 }}>
        <h1 className="neon-text">Your Cart</h1>
        <p style={{ opacity: 0.7 }}>
          Review your items before checkout.
        </p>
      </div>

      {/* ITEMS */}
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => {
          const id = item._id || item.id!;

          return (
            <div
              key={id}
              className="glass neon-border"
              style={{
                padding: 14,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {item.img ? (
                <div
                  style={{
                    width: 86,
                    height: 64,
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={item.img}
                    alt={item.title}
                    width={300}
                    height={200}
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ) : null}

              <div style={{ flex: 1, minWidth: 220 }}>
                <b>{item.title}</b>
                <div style={{ marginTop: 6, opacity: 0.75 }}>
                  {fmtM(item.price)}
                </div>
              </div>

              <button
                className="btn"
                aria-label="Remove item"
                onClick={() => removeFromCart(id)}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {/* SUMMARY */}
      <div className="glass neon-border" style={{ padding: 16 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 1000 }}>
            Total:{" "}
            <span className="neon-text">{fmtM(total)}</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button className="btn" onClick={clearCart}>
            Clear Cart
          </button>

          <Link href="/checkout" className="btn btnPrimary">
            Proceed to Checkout →
          </Link>
        </div>
      </div>
    </div>
  );
}
