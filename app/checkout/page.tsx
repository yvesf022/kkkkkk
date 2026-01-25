"use client";

import { useEffect, useState } from "react";
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
  const [bank, setBank] = useState<any>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
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

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          delivery_address: address,
          total_amount: total,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error();

      setOrderId(data.order_id);

      // fetch bank details
      const payRes = await fetch(
        `${API}/api/orders/${data.order_id}/payment-instructions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const payData = await payRes.json();
      setBank(payData.bank_details);

      toast.success("Order created. Please complete payment.");
    } catch {
      toast.error("Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  /* ======================
     SUBMIT PROOF
  ====================== */
  async function submitProof() {
    if (!orderId || !proof) return;

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("amount", String(total));
      fd.append("method", "bank_transfer");
      fd.append("proof", proof);

      const res = await fetch(
        `${API}/api/orders/${orderId}/payments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: fd,
        }
      );

      if (!res.ok) throw new Error();

      clearCart();
      toast.success("Payment proof submitted");
      router.push("/account");
    } catch {
      toast.error("Failed to submit proof");
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
      {orderId && bank && (
        <>
          <section>
            <h3>Bank Transfer Details</h3>
            <p><b>Bank:</b> {bank.bank_name}</p>
            <p><b>Account Name:</b> {bank.account_name}</p>
            <p><b>Account Number:</b> {bank.account_number}</p>
            <p><b>Reference:</b> {orderId}</p>
            <p>{bank.instructions}</p>
          </section>

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
        </>
      )}

      {/* SUMMARY */}
      <section>
        <h3>Order Summary</h3>
        {items.map((i) => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{i.title}</span>
            <span>{fmtM(i.price)}</span>
          </div>
        ))}
        <b>Total: {fmtM(total)}</b>
      </section>
    </div>
  );
}
