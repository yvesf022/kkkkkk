"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();

  const items = cart.items;
  const subtotal = cart.subtotal();

  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);

  const [savedAddress, setSavedAddress] = useState<any>(null);
  const [useSaved, setUseSaved] = useState(true);

  const [shipping, setShipping] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    district: "",
  });

  /* ================= LOAD SAVED ADDRESS ================= */

  useEffect(() => {
    async function loadAddress() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/addresses`,
          { credentials: "include" }
        );

        if (!res.ok) return;

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setSavedAddress(data[0]);
          setShipping(data[0]);
        }
      } catch {
        console.log("No saved address");
      }
    }

    loadAddress();
  }, []);

  /* ================= PLACE ORDER ================= */

  async function handlePlaceOrder() {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setPlacing(true);

    try {
      const order = await cart.createOrder();

      router.push(`/order-success?order_id=${order.order_id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Your cart is empty</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 30 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 30 }}>
        Checkout
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
        {/* ================= LEFT SIDE ================= */}
        <div>
          {/* STEP 1: SHIPPING */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>
                Shipping Address
              </h2>

              {savedAddress && useSaved ? (
                <div
                  style={{
                    padding: 30,
                    borderRadius: 20,
                    background: "#ffffff",
                    boxShadow: "0 15px 40px rgba(15,23,42,0.08)",
                  }}
                >
                  <p><strong>{savedAddress.fullName}</strong></p>
                  <p>{savedAddress.phone}</p>
                  <p>{savedAddress.address}</p>
                  <p>{savedAddress.city}</p>
                  <p>{savedAddress.district}</p>

                  <div style={{ marginTop: 20, display: "flex", gap: 15 }}>
                    <button
                      className="btn btnPrimary"
                      onClick={() => setStep(2)}
                    >
                      Use This Address
                    </button>

                    <button
                      className="btn btnGhost"
                      onClick={() => setUseSaved(false)}
                    >
                      Use Different Address
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 30,
                    borderRadius: 20,
                    background: "#ffffff",
                    boxShadow: "0 15px 40px rgba(15,23,42,0.08)",
                    display: "grid",
                    gap: 18,
                  }}
                >
                  <Input
                    placeholder="Full Name"
                    value={shipping.fullName}
                    onChange={(e) =>
                      setShipping({ ...shipping, fullName: e.target.value })
                    }
                  />

                  <Input
                    placeholder="Phone Number"
                    value={shipping.phone}
                    onChange={(e) =>
                      setShipping({ ...shipping, phone: e.target.value })
                    }
                  />

                  <Input
                    placeholder="Street Address"
                    value={shipping.address}
                    onChange={(e) =>
                      setShipping({ ...shipping, address: e.target.value })
                    }
                  />

                  <Input
                    placeholder="City"
                    value={shipping.city}
                    onChange={(e) =>
                      setShipping({ ...shipping, city: e.target.value })
                    }
                  />

                  <Input
                    placeholder="District"
                    value={shipping.district}
                    onChange={(e) =>
                      setShipping({ ...shipping, district: e.target.value })
                    }
                  />

                  <button
                    className="btn btnPrimary"
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </button>
                </div>
              )}
            </>
          )}

          {/* STEP 2: PAYMENT */}
          {step === 2 && (
            <div
              style={{
                padding: 30,
                borderRadius: 20,
                background: "#ffffff",
                boxShadow: "0 15px 40px rgba(15,23,42,0.08)",
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>
                Payment Instructions
              </h2>

              <p style={{ marginBottom: 20 }}>
                Please transfer the total amount to the bank account below.
              </p>

              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: "#f0fdf4",
                  marginBottom: 20,
                }}
              >
                <p><strong>Bank:</strong> Standard Lesotho Bank</p>
                <p><strong>Account Name:</strong> Karabo Online Store</p>
                <p><strong>Account Number:</strong> 123456789</p>
                <p><strong>Reference:</strong> Your Order ID</p>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="btn btnPrimary"
                style={{ width: "100%" }}
              >
                {placing ? "Placing Order..." : "Confirm Order"}
              </button>
            </div>
          )}
        </div>

        {/* ================= ORDER SUMMARY ================= */}
        <div>
          <div
            style={{
              position: "sticky",
              top: 100,
              padding: 30,
              borderRadius: 20,
              background: "#ffffff",
              boxShadow: "0 15px 40px rgba(15,23,42,0.08)",
            }}
          >
            <h3 style={{ fontWeight: 900, marginBottom: 20 }}>
              Order Summary
            </h3>

            {items.map((item) => (
              <div
                key={item.product_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  fontSize: 14,
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

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid #eee",
                fontWeight: 900,
                fontSize: 18,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= REUSABLE INPUT ================= */

function Input(props: any) {
  return (
    <input
      {...props}
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        fontSize: 15,
        outline: "none",
      }}
    />
  );
}
