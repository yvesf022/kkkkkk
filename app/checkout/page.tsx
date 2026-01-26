"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import RequireAuth from "@/components/auth/RequireAuth";
import { useCart } from "../context/CartContext";
import { getMyAddresses } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES (from Addresses)
====================== */
type Address = {
  id: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

/* Currency (no rounding) */
const fmtM = (v: number) =>
  `M ${v.toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, total, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] =
    useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);  // New state for showing confirmation

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  /* ======================
     LOAD ADDRESSES
  ====================== */
  useEffect(() => {
    async function loadAddresses() {
      try {
        const data = await getMyAddresses();
        setAddresses(data);

        const def = data.find((a) => a.is_default);
        if (def) setSelectedAddressId(def.id);
      } catch {
        toast.error("Failed to load addresses");
      }
    }

    loadAddresses();
  }, []);

  /* ======================
     PLACE ORDER
  ====================== */
  async function placeOrder() {
    if (!token) {
      router.push("/login");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }

    setLoading(true);

    try {
      const orderItems = cart.map((i) => ({
        product_id: i.id,
        quantity: i.quantity,
      }));

      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: orderItems,
          total_amount: total,
          address_id: selectedAddressId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.detail || "Failed to place order"
        );
      }

      clearCart();
      setOrderPlaced(true);  // Set the order as placed successfully
      toast.success("Order placed successfully");
      router.push("/account/orders");
    } catch (err: any) {
      toast.error(
        err.message || "Order placement failed"
      );
    } finally {
      setLoading(false);
    }
  }

  /* ======================
     EMPTY CART
  ====================== */
  if (cart.length === 0) {
    return (
      <RequireAuth>
        <div
          style={{
            maxWidth: 640,
            margin: "48px auto",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 900 }}>
            Checkout
          </h1>
          <p>Your cart is empty.</p>
        </div>
      </RequireAuth>
    );
  }

  /* ======================
     UI
  ====================== */
  return (
    <RequireAuth>
      <div style={{ display: "grid", gap: 26 }}>
        {orderPlaced ? (
          <section
            style={{
              textAlign: "center",
              padding: "20px",
              borderRadius: 10,
              background: "#e0f9e0",
              border: "1px solid #green",
            }}
          >
            <h2 style={{ fontWeight: 900 }}>Order Placed Successfully!</h2>
            <p>
              Your order has been placed. Please transfer the total amount to
              the bank details provided on the order page. Once your payment is
              complete, upload the payment proof.
            </p>
            <button
              className="btn btnTech"
              onClick={() => router.push("/account/orders")}
            >
              View My Orders
            </button>
          </section>
        ) : (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900 }}>
              Checkout
            </h1>

            {/* ADDRESS SELECTION */}
            <section
              style={{
                borderRadius: 22,
                padding: 24,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                display: "grid",
                gap: 14,
              }}
            >
              <h3 style={{ fontWeight: 900 }}>
                Delivery Address
              </h3>

              {addresses.length === 0 ? (
                <p style={{ opacity: 0.7 }}>
                  No saved addresses. Please add one in your
                  account before checkout.
                </p>
              ) : (
                addresses.map((a) => (
                  <label
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: 14,
                      borderRadius: 16,
                      border:
                        selectedAddressId === a.id
                          ? "2px solid #2563eb"
                          : "1px solid #e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === a.id}
                      onChange={() =>
                        setSelectedAddressId(a.id)
                      }
                    />
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {a.full_name} ({a.phone})
                      </div>
                      <div style={{ fontSize: 14 }}>
                        {a.address_line_1}
                        {a.address_line_2 && (
                          <> {a.address_line_2}</>
                        )}
                        <br />
                        {a.city}, {a.state},{" "}
                        {a.postal_code}
                        <br />
                        {a.country}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </section>

            {/* SUMMARY */}
            <section
              style={{
                borderRadius: 22,
                padding: 24,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                display: "grid",
                gap: 12,
              }}
            >
              <h3 style={{ fontWeight: 900 }}>
                Order Summary
              </h3>

              {cart.map((i) => (
                <div
                  key={i.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {i.title} × {i.quantity}
                  </span>
                  <span>
                    {fmtM(i.price * i.quantity)}
                  </span>
                </div>
              ))}

              <div
                style={{
                  marginTop: 8,
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                Total:{" "}
                <span style={{ color: "#2563eb" }}>
                  {fmtM(total)}
                </span>
              </div>
            </section>

            {/* ACTION */}
            <button
              className="btn btnTech"
              disabled={loading || addresses.length === 0}
              onClick={placeOrder}
            >
              {loading ? "Placing order…" : "Place Order"}
            </button>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
