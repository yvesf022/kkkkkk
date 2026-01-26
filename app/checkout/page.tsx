"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";

const API = process.env.NEXT_PUBLIC_API_URL!;

/** Maloti formatter */
const fmtM = (v: number) => `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    city: "",
    district: "",
    country: "Lesotho",
  });

  const addressValid =
    address.name &&
    address.phone.length >= 8 &&
    address.line1 &&
    address.city &&
    address.district;

  /* ======================
     CREATE ORDER
  ====================== */
  async function createOrder() {
    if (!token) {
      router.push("/login");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      const orderItems = items.map((i) => ({
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Order failed");
      }

      setOrderId(data.order_id);
      toast.success("Order created. Please upload payment proof.");
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  /* ======================
     SUBMIT PAYMENT PROOF
  ====================== */
  async function submitProof() {
    if (!orderId || !proof || !token) return;

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("proof", proof);

      const res = await fetch(
        `${API}/api/orders/${orderId}/payment-proof`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: fd,
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Upload failed");
      }

      clearCart();
      toast.success("Payment proof submitted");

      // 🔥 GO TO ORDER SUCCESS PAGE
      router.push(`/order-success?orderId=${orderId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit proof");
    } finally {
      setLoading(false);
    }
  }

  /* ======================
     EMPTY CART
  ====================== */
  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: "48px auto", textAlign: "center" }}>
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  /* ======================
     UI
  ====================== */
  return (
    <div style={{ display: "grid", gap: 26 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Checkout</h1>

      {/* ADDRESS */}
      {!orderId && (
        <section>
          <h3>Delivery Address</h3>
          {[
            ["Full Name", "name"],
            ["Phone Number", "phone"],
            ["Street / Village", "line1"],
            ["City / Town", "city"],
            ["District", "district"],
          ].map(([label, key]) => (
            <input
              key={key}
              className="pill"
              placeholder={label}
              value={(address as any)[key]}
              onChange={(e) =>
                setAddress({ ...address, [key]: e.target.value })
              }
            />
          ))}

          <button
            className="btn btnTech"
            disabled={!addressValid || loading}
            onClick={createOrder}
          >
            {loading ? "Creating order…" : "Proceed to Payment"}
          </button>
        </section>
      )}

      {/* PAYMENT */}
      {orderId && (
        <section>
          <h3>Upload Proof of Payment</h3>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setProof(e.target.files?.[0] || null)}
          />

          <button
            className="btn btnTech"
            disabled={!proof || loading}
            onClick={submitProof}
          >
            {loading ? "Submitting…" : "Submit Proof"}
          </button>
        </section>
      )}

      {/* SUMMARY */}
      <section>
        <h3>Order Summary</h3>
        {items.map((i) => (
          <div
            key={i.id}
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>
              {i.title} × {i.quantity}
            </span>
            <span>{fmtM(i.price * i.quantity)}</span>
          </div>
        ))}
        <b>Total: {fmtM(total)}</b>
      </section>
    </div>
  );
}
