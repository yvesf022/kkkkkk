"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import OrderTimeline from "@/components/orders/OrderTimeline";
import type {
  PaymentStatus,
  ShippingStatus,
} from "@/lib/types";

/* ======================
   TYPES
====================== */

type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_status: PaymentStatus | null;
  shipping_status: ShippingStatus | null;
  tracking_number?: string | null;
};

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  /* ======================
     REDIRECT AFTER HYDRATION
  ====================== */
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

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
        payment_status: data.payment_status ?? null,
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
    if (authLoading || !user) return;
    loadOrder();
  }, [id, authLoading, user]);

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
      if (fileRef.current) fileRef.current.value = "";
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

  if (authLoading) {
    return <p style={{ opacity: 0.6 }}>Loading your account…</p>;
  }

  if (!user) return null;

  if (loading) {
    return <p style={{ opacity: 0.6 }}>Loading order…</p>;
  }

  if (!order) {
    return (
      <p style={{ opacity: 0.6 }}>
        Order not available.
      </p>
    );
  }

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
        {order.payment_status ?? "—"} ·{" "}
        {order.shipping_status ?? "Not shipped yet"} ·{" "}
        <strong>{fmtM(order.total_amount)}</strong>
      </div>

      {/* TIMELINE */}
      <OrderTimeline
        paymentStatus={order.payment_status}
        shippingStatus={order.shipping_status}
        trackingNumber={order.tracking_number}
      />

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
