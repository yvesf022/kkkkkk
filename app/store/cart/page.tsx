"use client";

import { formatCurrency } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();

  const items = cart.items;
  const total = cart.subtotal();

  /* ================= EMPTY CART ================= */

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: "60px 0" }}>
        <div className="card text-center" style={{ padding: 60 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🛒</div>

          <h1 className="text-display" style={{ fontSize: 32 }}>
            Your Cart is Empty
          </h1>

          <p style={{ opacity: 0.7, marginTop: 10 }}>
            Discover premium products and start shopping.
          </p>

          <button
            onClick={() => router.push("/store")}
            className="btn btnPrimary mt-lg"
          >
            Browse Store
          </button>
        </div>
      </div>
    );
  }

  /* ================= CART PAGE ================= */

  return (
    <div className="container" style={{ padding: "60px 0" }}>
      <h1 className="text-display mb-xl" style={{ fontSize: 34 }}>
        Shopping Cart
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 40,
        }}
      >
        {/* ================= ITEMS ================= */}
        <div style={{ display: "grid", gap: 20 }}>
          {items.map((item) => (
            <div key={item.product_id} className="card">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr auto",
                  gap: 20,
                  alignItems: "center",
                }}
              >
                {/* IMAGE PLACEHOLDER */}
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 16,
                    background: "var(--gradient-surface)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 42,
                  }}
                >
                  📦
                </div>

                {/* INFO */}
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      marginBottom: 6,
                    }}
                  >
                    {item.title}
                  </div>

                  <div style={{ fontSize: 14, opacity: 0.6 }}>
                    {formatCurrency(item.price)} × {item.quantity}
                  </div>

                  <button
                    onClick={() => cart.removeItem(item.product_id)}
                    className="btn btnGhost mt-sm"
                    style={{ padding: "6px 14px", fontSize: 13 }}
                  >
                    Remove
                  </button>
                </div>

                {/* TOTAL PRICE */}
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ================= SUMMARY ================= */}
        <div>
          <div
            className="card"
            style={{
              position: "sticky",
              top: 100,
              display: "grid",
              gap: 18,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              Order Summary
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
              }}
            >
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 20,
                fontWeight: 900,
                paddingTop: 12,
                borderTop: "1px solid var(--gray-200)",
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <button
              onClick={() => router.push("/store/checkout")}
              className="btn btnPrimary"
              style={{ width: "100%" }}
            >
              Proceed to Checkout
            </button>

            <button
              onClick={() => cart.clear()}
              className="btn btnGhost"
              style={{ width: "100%" }}
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
