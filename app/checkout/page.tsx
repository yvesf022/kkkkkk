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

  if (items.length === 0) {
    return (
      <div className="glass neon-border container">
        <h1 className="neon-text">Checkout</h1>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: "grid", gap: "var(--gap)" }}>
      {/* HEADER */}
      <div className="glass neon-border">
        <h1 className="neon-text">Checkout</h1>
        <p className="muted">
          Bank Transfer Payment – Karabo’s Boutique
        </p>
      </div>

      {/* ADDRESS */}
      <div className="glass neon-border">
        <h3>Delivery Address</h3>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            className="pill"
            placeholder="Full Name"
            value={address.name}
            onChange={(e) =>
              setAddress({ ...address, name: e.target.value })
            }
          />
          <input
            className="pill"
            placeholder="Phone Number"
            value={address.phone}
            onChange={(e) =>
              setAddress({ ...address, phone: e.target.value })
            }
          />
          <input
            className="pill"
            placeholder="Street / Village"
            value={address.line1}
            onChange={(e) =>
              setAddress({ ...address, line1: e.target.value })
            }
          />
          <input
            className="pill"
            placeholder="City / Town"
            value={address.city}
            onChange={(e) =>
              setAddress({ ...address, city: e.target.value })
            }
          />
          <input
            className="pill"
            placeholder="District"
            value={address.district}
            onChange={(e) =>
              setAddress({ ...address, district: e.target.value })
            }
          />
        </div>
      </div>

      {/* BANK DETAILS */}
      <div className="glass neon-border">
        <h3>Bank Transfer Details</h3>

        <div className="pill">
          <b>Account Name:</b> Karabo’s Boutique<br />
          <b>Bank Name:</b> YOUR BANK NAME<br />
          <b>Account Number:</b> XXXXXXXX<br />
          <b>Reference:</b> Your Full Name
        </div>

        <p className="muted">
          Please complete the transfer and upload proof of payment.
        </p>
      </div>

      {/* PROOF UPLOAD */}
      <div className="glass neon-border">
        <h3>Upload Proof of Payment</h3>

        <input
          type="file"
          accept="image/*,.pdf"
          className="pill"
          onChange={(e) => setProof(e.target.files?.[0] || null)}
        />
      </div>

      {/* SUMMARY */}
      <div className="glass neon-border">
        <h3>Order Summary</h3>

        {items.map((item, i) => (
          <div key={i} className="pill">
            <b>{item.title}</b> — {fmtM(item.price)}
          </div>
        ))}

        <div className="hr" />

        <div style={{ fontWeight: 1000 }}>
          Total: <span className="neon-text">{fmtM(total)}</span>
        </div>
      </div>

      {/* ACTION */}
      <div style={{ textAlign: "right" }}>
        <button
          className="btn btnPrimary"
          disabled={!addressValid || !proof || loading}
          onClick={submitOrder}
        >
          {loading ? "Submitting…" : "Submit Order"}
        </button>
      </div>
    </div>
  );
}
