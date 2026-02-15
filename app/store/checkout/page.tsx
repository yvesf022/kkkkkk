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

    if (
      !shipping.fullName ||
      !shipping.phone ||
      !shipping.address
    ) {
      toast.error("Please complete shipping information");
      return;
    }

    setPlacing(true);

    try {
      const order = await cart.createOrder();

      router.push(
        `/order-success?order_id=${order.order_id}`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <h2>Your cart is empty</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 40,
      }}
    >
      <h1
        style={{
          fontSize: 32,
          fontWeight: 900,
          marginBottom: 40,
        }}
      >
        Checkout
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 50,
        }}
      >
        {/* ================= LEFT SIDE ================= */}
        <div>
          {/* STEP 1 – SHIPPING */}
          {step === 1 && (
            <>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  marginBottom: 20,
                }}
              >
                Shipping Address
              </h2>

              {savedAddress && useSaved ? (
                <div className="card">
                  <p>
                    <strong>
                      {savedAddress.fullName}
                    </strong>
                  </p>
                  <p>{savedAddress.phone}</p>
                  <p>{savedAddress.address}</p>
                  <p>{savedAddress.city}</p>
                  <p>{savedAddress.district}</p>

                  <div
                    style={{
                      marginTop: 24,
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn btnPrimary"
                      onClick={() => setStep(2)}
                    >
                      Use This Address
                    </button>

                    <button
                      className="btn btnGhost"
                      onClick={() =>
                        setUseSaved(false)
                      }
                    >
                      Use Different Address
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="card"
                  style={{ display: "grid", gap: 16 }}
                >
                  <Input
                    placeholder="Full Name"
                    value={shipping.fullName}
                    onChange={(e) =>
                      setShipping({
                        ...shipping,
                        fullName: e.target.value,
                      })
                    }
                  />

                  <Input
                    placeholder="Phone Number"
                    value={shipping.phone}
                    onChange={(e) =>
                      setShipping({
                        ...shipping,
                        phone: e.target.value,
                      })
                    }
                  />

                  <Input
                    placeholder="Street Address"
                    value={shipping.address}
                    onChange={(e) =>
                      setShipping({
                        ...shipping,
                        address: e.target.value,
                      })
                    }
                  />

                  <Input
                    placeholder="City"
                    value={shipping.city}
                    onChange={(e) =>
                      setShipping({
                        ...shipping,
                        city: e.target.value,
                      })
                    }
                  />

                  <Input
                    placeholder="District"
                    value={shipping.district}
                    onChange={(e) =>
                      setShipping({
                        ...shipping,
                        district: e.target.value,
                      })
                    }
                  />

                  <button
                    className="btn btnPrimary"
                    onClick={() => setStep(2)}
                  >
                    Continue to Review
                  </button>
                </div>
              )}
            </>
          )}

          {/* STEP 2 – REVIEW ORDER */}
          {step === 2 && (
            <div className="card">
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  marginBottom: 20,
                }}
              >
                Review Your Order
              </h2>

              {items.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span>
                    {item.title} × {item.quantity}
                  </span>
                  <span>
                    {formatCurrency(
                      item.price *
                        item.quantity
                    )}
                  </span>
                </div>
              ))}

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop:
                    "1px solid rgba(0,0,0,0.1)",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                <span>Total</span>
                <span>
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div
                style={{
                  marginTop: 30,
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn btnGhost"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>

                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="btn btnPrimary"
                >
                  {placing
                    ? "Placing Order..."
                    : "Confirm Order"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= ORDER SUMMARY ================= */}
        <div>
          <div className="card">
            <h3
              style={{
                fontWeight: 900,
                marginBottom: 20,
              }}
            >
              Order Summary
            </h3>

            {items.map((item) => (
              <div
                key={item.product_id}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                <span>
                  {item.title} × {item.quantity}
                </span>
                <span>
                  {formatCurrency(
                    item.price *
                      item.quantity
                  )}
                </span>
              </div>
            ))}

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop:
                  "1px solid rgba(0,0,0,0.1)",
                display: "flex",
                justifyContent:
                  "space-between",
                fontWeight: 900,
              }}
            >
              <span>Total</span>
              <span>
                {formatCurrency(subtotal)}
              </span>
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
        border:
          "2px solid var(--gray-200)",
        fontSize: 15,
        transition: "all 0.2s ease",
      }}
      onFocus={(e) =>
        (e.currentTarget.style.border =
          "2px solid var(--primary)")
      }
      onBlur={(e) =>
        (e.currentTarget.style.border =
          "2px solid var(--gray-200)")
      }
    />
  );
}
