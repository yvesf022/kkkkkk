"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "../context/CartContext";

/* Currency */
const fmt = (v: number) => `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, total } = useCart();

  /* ================= EMPTY CART ================= */

  if (cart.length === 0) {
    return (
      <div
        style={{
          maxWidth: 640,
          margin: "48px auto 0",
          padding: 32,
          borderRadius: 26,
          textAlign: "center",
          background: `
            radial-gradient(
              420px 220px at 10% 0%,
              rgba(96,165,250,0.25),
              transparent 60%
            ),
            radial-gradient(
              360px 200px at 90% 10%,
              rgba(244,114,182,0.20),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 26px 70px rgba(15,23,42,0.18)",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Your Cart is Empty
        </h1>

        <p style={{ marginTop: 8, color: "rgba(15,23,42,0.6)" }}>
          Looks like you haven’t added anything yet.
        </p>

        <Link
          href="/store"
          className="btn btnTech"
          style={{ marginTop: 22 }}
        >
          Browse Store →
        </Link>
      </div>
    );
  }

  /* ================= CART ================= */

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* HEADER */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: `
            radial-gradient(
              420px 200px at 10% 0%,
              rgba(96,165,250,0.22),
              transparent 60%
            ),
            radial-gradient(
              360px 180px at 90% 10%,
              rgba(244,114,182,0.18),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Shopping Cart
        </h1>

        <p style={{ marginTop: 6, color: "rgba(15,23,42,0.6)" }}>
          Review your items before checkout.
        </p>
      </section>

      {/* ITEMS */}
      <section
        style={{
          borderRadius: 26,
          padding: 24,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 26px 70px rgba(15,23,42,0.16)",
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          {cart.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "86px 1fr auto",
                gap: 16,
                alignItems: "center",
                padding: 16,
                borderRadius: 22,
                background:
                  "linear-gradient(135deg,#ffffff,#f4f9ff)",
                boxShadow:
                  "0 14px 40px rgba(15,23,42,0.14)",
              }}
            >
              {/* IMAGE */}
              {item.image && (
                <div
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={200}
                    height={200}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}

              {/* INFO */}
              <div>
                <div style={{ fontWeight: 900 }}>
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontWeight: 700,
                    color: "rgba(15,23,42,0.65)",
                  }}
                >
                  {fmt(item.price)}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <button
                    className="btn btnGhost"
                    onClick={() =>
                      updateQuantity(item.id, item.quantity - 1)
                    }
                  >
                    −
                  </button>

                  <span style={{ fontWeight: 700 }}>
                    {item.quantity}
                  </span>

                  <button
                    className="btn btnGhost"
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {/* REMOVE */}
              <button
                className="btn btnGhost"
                onClick={() => removeFromCart(item.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SUMMARY */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900 }}>
          Total:{" "}
          <span style={{ color: "#2563eb" }}>
            {fmt(total)}
          </span>
        </div>

        <Link href="/checkout" className="btn btnTech">
          Proceed to Checkout →
        </Link>
      </section>
    </div>
  );
}
