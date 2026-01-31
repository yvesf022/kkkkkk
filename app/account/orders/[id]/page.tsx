"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import OrderTimeline from "@/components/orders/OrderTimeline";

/* ======================
   TYPES
====================== */

type PaymentStatus = "pending" | "on_hold" | "paid" | "rejected";
type ShippingStatus = "awaiting_shipping" | "shipped" | null;

type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_status: PaymentStatus;
  shipping_status: ShippingStatus;
  tracking_number?: string | null;
};

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  /* ======================
     AUTH GUARD
  ====================== */

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [user, router]);

  /* ======================
     LOAD ORDER
  ====================== */

  async function loadOrder() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        throw new Error("Order not accessible");
      }

      const data = await res.json();

      setOrder({
        ...data,
        payment_status: data.payment_status ?? "pending",
        shipping_status: data.shipping_status ?? null,
      });
    } catch {
      toast.error("Unable to access this order");
      router.replace("/account/orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadOrder();
  }, [id, user]);

  /* ======================
     PAYMENT PROOF UPLOAD
  ====================== */

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}/payment-proof`,
        {
          method: "POST",
          body: form,
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Payment proof uploaded");
      fileRef.current && (fileRef.current.value = "");
      await loadOrder();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  /* ======================
     RENDER STATES
  ====================== */

  if (!user || loading) {
    return <p style={{ opacity: 0.6 }}>Loading order…</p>;
  }

  if (!order) return null;

  return (
    <div style={{ maxWidth: 1100, display: "grid", gap: 28 }}>
      {/* BREADCRUMB */}
      <div style={{ fontSize: 13 }}>
        <Link href="/account/orders">Orders</Link> ›{" "}
        <strong>Order #{order.id.slice(0, 8)}</strong>
      </div>

      {/* HEADER */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6 }}>
          Placed on{" "}
          {new Date(order.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* STATUS SUMMARY */}
      <div
        style={{
          padding: 20,
          borderRadius: 20,
          background: "#f8fafc",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <strong>Current status:</strong>{" "}
        {paymentLabel(order.payment_status)} ·{" "}
        {shippingLabel(order.shipping_status)} ·{" "}
        <strong>{fmtM(order.total_amount)}</strong>
      </div>

      {/* TIMELINE */}
      <OrderTimeline
        paymentStatus={order.payment_status}
        shippingStatus={order.shipping_status}
        trackingNumber={order.tracking_number}
      />

      {/* ACTION PANEL */}
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background:
            "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow:
            "0 18px 50px rgba(15,23,42,0.12)",
          display: "grid",
          gap: 16,
        }}
      >
        <h3 style={{ fontWeight: 900 }}>
          What’s happening now
        </h3>

        {order.payment_status === "on_hold" && (
          <>
            <p style={{ fontSize: 14 }}>
              Your order is awaiting payment verification.
              Please upload your payment proof below.
            </p>

            <label
              style={{
                fontWeight: 700,
                cursor: uploading ? "default" : "pointer",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading
                ? "Uploading…"
                : "Upload payment proof"}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                disabled={uploading}
                onChange={handleUpload}
              />
            </label>

            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Image only · Max 5MB · Secure upload
            </div>
          </>
        )}

        {order.payment_status === "paid" && (
          <p style={{ fontSize: 14 }}>
            Payment confirmed. Your order is now
            being prepared for shipment.
          </p>
        )}

        {order.payment_status === "rejected" && (
          <p style={{ fontSize: 14, color: "#b91c1c" }}>
            Payment was rejected. Please upload a
            new, valid proof.
          </p>
        )}
      </div>

      {/* TRUST NOTE */}
      <div style={{ fontSize: 13, opacity: 0.6 }}>
        🔒 Payments are completed externally. We never
        store payment details on your account.
      </div>

      {/* FOOTER ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <button
          className="btn btnGhost"
          onClick={() => router.push("/account/orders")}
        >
          Back to orders
        </button>

        <button
          className="btn btnPrimary"
          onClick={() => router.push("/store")}
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}

/* ======================
   LABEL HELPERS
====================== */

function paymentLabel(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return "Order placed";
    case "on_hold":
      return "Awaiting payment verification";
    case "paid":
      return "Payment confirmed";
    case "rejected":
      return "Payment rejected";
  }
}

function shippingLabel(status: ShippingStatus) {
  if (!status) return "Not shipped yet";
  if (status === "awaiting_shipping")
    return "Preparing shipment";
  if (status === "shipped") return "Shipped";
  return "—";
}
