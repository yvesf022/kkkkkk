"use client";

import { formatCurrency } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();

  const items = cart.items;
  const total = cart.subtotal();

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: "80px 0" }}>
        <div className="card text-center" style={{ padding: 60 }}>
          <div style={{ fontSize: 70, marginBottom: 20 }}>🛒</div>

          <h1 style={{ fontSize: 32, fontWeight: 900 }}>
            Your Cart is Empty
          </h1>

          <p style={{ opacity: 0.6, margin: "16px 0 30px" }}>
            Looks like you haven't added anything yet.
          </p>

          <button
            onClick={() => router.push("/store")}
            className="btn btnPrimary"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "70px 0" }}>
      <h1
        style={{
          fontSize: 36,
          fontWeight: 900,
          marginBottom: 40,
        }}
      >
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
        <div style={{ display: "grid", gap: 24 }}>
          {items.map((item) => (
            <div
              key={item.product_id}
              className="card"
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr auto",
                gap: 20,
                alignItems: "center",
                padding: 24,
              }}
            >
              {/* IMAGE */}
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 16,
                  background: item.main_image
                    ? `url(${item.main_image}) center/cover`
                    : "var(--gradient-surface)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 40,
                }}
              >
                {!item.main_image && "📦"}
              </div>

              {/* INFO */}
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 18,
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </div>

                <div style={{ opacity: 0.6, marginBottom: 12 }}>
                  {formatCurrency(item.price)} each
                </div>

                {/* Quantity Control */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn btnGhost"
                    onClick={() =>
                      cart.updateQuantity(
                        item.product_id,
                        Math.max(1, item.quantity - 1)
                      )
                    }
                  >
                    −
                  </button>

                  <div
                    style={{
                      minWidth: 40,
                      textAlign: "center",
                      fontWeight: 800,
                    }}
                  >
                    {item.quantity}
                  </div>

                  <button
                    className="btn btnGhost"
                    onClick={() =>
                      cart.updateQuantity(
                        item.product_id,
                        item.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {/* TOTAL */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    marginBottom: 10,
                  }}
                >
                  {formatCurrency(item.price * item.quantity)}
                </div>

                <button
                  className="btn btnGhost"
                  onClick={() =>
                    cart.removeItem(item.product_id)
                  }
                >
                  Remove
                </button>
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
              padding: 32,
              display: "grid",
              gap: 20,
            }}
          >
            <h2 style={{ fontWeight: 900, fontSize: 22 }}>
              Order Summary
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--gray-200)",
                paddingTop: 16,
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
                borderTop: "2px solid var(--gray-300)",
                paddingTop: 16,
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <button
              className="btn btnPrimary"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() =>
                router.push("/store/checkout")
              }
            >
              Proceed to Checkout
            </button>

            <button
              className="btn btnGhost"
              style={{ width: "100%" }}
              onClick={() => cart.clear()}
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
