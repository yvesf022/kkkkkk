"use client";
import { formatCurrency } from '@/lib/currency';

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const cart = useCart();
  
  const [loading, setLoading] = useState(false);

  const items = cart.items;
  const total = cart.subtotal();

  // Redirect to login if not authenticated
  if (!user) {
    router.push("/login");
    return null;
  }

  // Empty cart check
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
          <div style={{ fontSize: 64, marginBottom: 24 }}>📦</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
            Your cart is empty
          </h1>
          <p style={{ opacity: 0.6, marginBottom: 32 }}>
            Add some items to checkout
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

  async function handlePlaceOrder() {
    setLoading(true);

    try {
      // Create order (backend only needs total_amount)
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ total_amount: total }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to create order");
      }

      const order = await res.json();

      // Clear cart
      cart.clear();

      toast.success("Order placed successfully!");
      
      // Redirect to order details to upload payment proof
      router.push(`/account/orders/${order.order_id}`);

    } catch (err: any) {
      console.error("Order creation failed:", err);
      toast.error(err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 32 }}>
        Checkout
      </h1>

      <div style={{ display: "grid", gap: 32, gridTemplateColumns: "2fr 1fr" }}>
        {/* ORDER ITEMS */}
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>
            Order Items
          </h2>

          <div style={{ display: "grid", gap: 18 }}>
            {items.map((item) => (
              <div
                key={item.product_id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 20,
                  alignItems: "center",
                  padding: 20,
                  borderRadius: 18,
                  background: "#fff",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                }}
              >
                {/* Placeholder */}
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
              </div>
            ))}
          </div>
        </div>

        {/* ORDER SUMMARY */}
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

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ opacity: 0.7 }}>Subtotal</span>
                <span style={{ fontWeight: 700 }}>
                  {formatCurrency(total.toFixed(2))}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ opacity: 0.7 }}>Shipping</span>
                <span style={{ fontWeight: 700 }}>Free</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 20,
                fontWeight: 900,
                paddingTop: 16,
                borderTop: "2px solid rgba(15,23,42,0.1)",
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(total.toFixed(2))}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="btn btnPrimary"
              style={{ width: "100%", marginTop: 8 }}
            >
              {loading ? "Processing..." : "Place Order"}
            </button>

            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#fef3c7",
                color: "#92400e",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              💳 <strong>Next Step:</strong> After placing your order, you'll see bank details to make payment and upload proof.
            </div>

            <button
              onClick={() => router.push("/store/cart")}
              className="btn btnGhost"
              style={{ width: "100%" }}
            >
              ← Back to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
