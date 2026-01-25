"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useCart } from "../context/CartContext";

/** Maloti formatter */
const fmtM = (v: number) => `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState<File | null>(null);

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

  async function submitOrder() {
    if (!proof) {
      toast.error("Please upload proof of payment");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("items", JSON.stringify(items));
      formData.append("address", JSON.stringify(address));
      formData.append("total", String(total));
      formData.append("currency", "LSL");
      formData.append("paymentMethod", "bank_transfer");
      formData.append("status", "pending_payment");
      formData.append("proof", proof);

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, {
        method: "POST",
        body: formData,
      });

      clearCart();
      toast.success("Order submitted. Awaiting payment confirmation.");
      router.push("/order-success");
    } catch {
      toast.error("Failed to submit order");
    } finally {
      setLoading(false);
    }
  }

  /* ================= EMPTY CART ================= */

  if (items.length === 0) {
    return (
      <div
        style={{
          maxWidth: 640,
          margin: "48px auto 0",
          padding: 32,
          borderRadius: 26,
          background: `
            radial-gradient(
              420px 220px at 10% 0%,
              rgba(96,165,250,0.25),
              transparent 60%
            ),
            linear-gradient(135deg,#f8fbff,#eef6ff)
          `,
          boxShadow: "0 26px 70px rgba(15,23,42,0.18)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Checkout</h1>
        <p style={{ marginTop: 8, color: "rgba(15,23,42,0.6)" }}>
          Your cart is empty.
        </p>
      </div>
    );
  }

  /* ================= CHECKOUT ================= */

  return (
    <div style={{ display: "grid", gap: 26 }}>
      {/* HEADER */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: `
            radial-gradient(
              420px 200px at 10% 0%,
              rgba(96,165,250,0.22),
              transparent 60%
            ),
            radial-gradient(
              360px 180px at 90% 10%,
              rgba(244,114,182,0.18),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Checkout</h1>
        <p style={{ marginTop: 6, color: "rgba(15,23,42,0.6)" }}>
          Bank transfer payment — Karabo’s Boutique
        </p>
      </section>

      {/* ADDRESS */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h3 style={{ fontWeight: 900 }}>Delivery Address</h3>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
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
        </div>
      </section>

      {/* BANK DETAILS */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h3 style={{ fontWeight: 900 }}>Bank Transfer Details</h3>

        <div
          style={{
            marginTop: 10,
            padding: 16,
            borderRadius: 18,
            background: "rgba(255,255,255,0.7)",
            boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.08)",
          }}
        >
          <b>Account Name:</b> Karabo’s Boutique<br />
          <b>Bank Name:</b> YOUR BANK NAME<br />
          <b>Account Number:</b> XXXXXXXX<br />
          <b>Reference:</b> Your Full Name
        </div>

        <p style={{ marginTop: 8, color: "rgba(15,23,42,0.6)" }}>
          Complete the transfer and upload proof of payment below.
        </p>
      </section>

      {/* PROOF */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h3 style={{ fontWeight: 900 }}>Upload Proof of Payment</h3>

        <input
          type="file"
          accept="image/*,.pdf"
          className="pill"
          onChange={(e) => setProof(e.target.files?.[0] || null)}
          style={{ marginTop: 12 }}
        />
      </section>

      {/* SUMMARY */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h3 style={{ fontWeight: 900 }}>Order Summary</h3>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
              }}
            >
              <span>{item.title}</span>
              <span>{fmtM(item.price)}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid rgba(15,23,42,0.08)",
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          Total:{" "}
          <span style={{ color: "#2563eb" }}>
            {fmtM(total)}
          </span>
        </div>
      </section>

      {/* ACTION */}
      <div style={{ textAlign: "right" }}>
        <button
          className="btn btnTech"
          disabled={!addressValid || !proof || loading}
          onClick={submitOrder}
        >
          {loading ? "Submitting…" : "Submit Order"}
        </button>
      </div>
    </div>
  );
}
