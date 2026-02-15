"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();

  const items = cart.items;
  const total = cart.subtotal();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [shipping, setShipping] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    district: "",
  });

  /* ================= EMPTY CART ================= */

  if (items.length === 0) {
    router.push("/store");
    return null;
  }

  /* ================= CREATE ORDER ================= */

  async function handlePlaceOrder() {
    try {
      setLoading(true);

      const order = await cart.createOrder();

      toast.success("Order placed successfully!");

      router.push(`/account/orders/${order.order_id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  /* ================= PAGE ================= */

  return (
    <div className="container" style={{ padding: "60px 0" }}>
      <h1 className="text-display mb-xl" style={{ fontSize: 34 }}>
        Checkout
      </h1>

      {/* STEP INDICATOR */}
      <div style={{ display: "flex", gap: 40, marginBottom: 40 }}>
        {["Shipping", "Review", "Confirm"].map((label, index) => (
          <div
            key={label}
            style={{
              fontWeight: step === index + 1 ? 900 : 600,
              opacity: step >= index + 1 ? 1 : 0.4,
            }}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {/* STEP 1 - SHIPPING */}
      {step === 1 && (
        <div className="card" style={{ padding: 30 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 20 }}>
            Shipping Information
          </h2>

          <div style={{ display: "grid", gap: 16 }}>
            <input
              placeholder="Full Name"
              value={shipping.fullName}
              onChange={(e) =>
                setShipping({ ...shipping, fullName: e.target.value })
              }
            />

            <input
              placeholder="Phone Number"
              value={shipping.phone}
              onChange={(e) =>
                setShipping({ ...shipping, phone: e.target.value })
              }
            />

            <input
              placeholder="Address"
              value={shipping.address}
              onChange={(e) =>
                setShipping({ ...shipping, address: e.target.value })
              }
            />

            <input
              placeholder="City"
              value={shipping.city}
              onChange={(e) =>
                setShipping({ ...shipping, city: e.target.value })
              }
            />

            <input
              placeholder="District"
              value={shipping.district}
              onChange={(e) =>
                setShipping({ ...shipping, district: e.target.value })
              }
            />
          </div>

          <button
            className="btn btnPrimary mt-lg"
            onClick={() => {
              if (
                !shipping.fullName ||
                !shipping.phone ||
                !shipping.address
              ) {
                toast.error("Please complete all required fields");
                return;
              }
              setStep(2);
            }}
          >
            Continue to Review
          </button>
        </div>
      )}

      {/* STEP 2 - REVIEW */}
      {step === 2 && (
        <div style={{ display: "grid", gap: 30 }}>
          <div className="card" style={{ padding: 30 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 20 }}>
              Order Review
            </h2>

            <div style={{ display: "grid", gap: 14 }}>
              {items.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {item.title} × {item.quantity}
                  </span>
                  <span>
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid var(--gray-200)",
                fontWeight: 900,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <button
              className="btn btnGhost"
              onClick={() => setStep(1)}
            >
              Back
            </button>

            <button
              className="btn btnPrimary"
              onClick={() => setStep(3)}
            >
              Confirm & Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 - CONFIRM */}
      {step === 3 && (
        <div className="card" style={{ padding: 30 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 20 }}>
            Confirm Order
          </h2>

          <p style={{ marginBottom: 20 }}>
            Total Payment:{" "}
            <strong>{formatCurrency(total)}</strong>
          </p>

          <button
            className="btn btnPrimary"
            onClick={handlePlaceOrder}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Processing..." : "Place Order"}
          </button>
        </div>
      )}
    </div>
  );
}
