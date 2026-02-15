"use client";
import { formatCurrency } from '@/lib/currency';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();
  
  const items = cart.items;
  const total = cart.subtotal();

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 32 }}>
        <div
          style={{
            padding: 80,
            textAlign: "center",
            borderRadius: 22,
            background: "linear-gradient(135deg, #ffffff, #f8fbff)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 24 }}>🛒</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
            Your Cart is Empty
          </h1>
          <p style={{ opacity: 0.6, marginBottom: 32 }}>
            Browse products and add them to your cart.
          </p>

          <button
            onClick={() => router.push("/store")}
            className="btn btnPrimary"
          >
            Go to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 32 }}>
        Shopping Cart
      </h1>

      <div style={{ display: "grid", gap: 32, gridTemplateColumns: "2fr 1fr" }}>
        {/* ITEMS */}
        <div style={{ display: "grid", gap: 18 }}>
          {items.map((item) => (
            <div
              key={item.product_id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                gap: 20,
                alignItems: "center",
                padding: 20,
                borderRadius: 18,
                background: "#fff",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
              }}
            >
              {/* Placeholder for image */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #e0e7ff, #dbeafe)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 32,
                }}
              >
                📦
              </div>

              {/* Info */}
              <div>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 14, opacity: 0.6 }}>
                  {formatCurrency(item.price.toFixed(2))} × {item.quantity}
                </div>
              </div>

              {/* Price */}
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {formatCurrency((item.price * item.quantity).toFixed(2))}
              </div>

              {/* Remove */}
              <button
                className="btn btnGhost"
                onClick={() => cart.removeItem(item.product_id)}
                style={{ whiteSpace: "nowrap" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* SUMMARY */}
        <div>
          <div
            style={{
              position: "sticky",
              top: 100,
              padding: 24,
              borderRadius: 22,
              background: "linear-gradient(135deg, #ffffff, #f4f9ff)",
              boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              Order Summary
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 16,
                borderTop: "1px solid rgba(15,23,42,0.1)",
              }}
            >
              <span style={{ fontWeight: 700 }}>Subtotal</span>
              <span style={{ fontWeight: 700 }}>
                {formatCurrency(total.toFixed(2))}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
                fontWeight: 900,
                paddingTop: 16,
                borderTop: "2px solid rgba(15,23,42,0.1)",
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(total.toFixed(2))}</span>
            </div>

            <button
              onClick={() => router.push("/store/checkout")}
              className="btn btnPrimary"
              style={{ width: "100%", marginTop: 8 }}
            >
              Proceed to Checkout
            </button>

            <button
              className="btn btnGhost"
              onClick={() => cart.clear()}
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
