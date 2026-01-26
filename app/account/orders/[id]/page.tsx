"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import OrderTimeline from "@/components/orders/OrderTimeline";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */
type OrderItem = {
  id: string;
  title: string;
  price: number;
  img: string;
  quantity: number;
};

type Order = {
  id: string;
  total_amount: number;
  payment_status: string;
  shipping_status?: string;
  tracking_number?: string;
  created_at: string;
  items: OrderItem[];
};

type PaymentSettings = {
  bank_name: string;
  account_name: string;
  account_number: string;
};

/* ======================
   BADGES
====================== */
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: color,
        color: "#fff",
      }}
    >
      {label}
    </span>
  );
}

function PaymentStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    on_hold: { label: "Awaiting Payment", color: "#f59e0b" },
    payment_submitted: {
      label: "Payment Under Review",
      color: "#3b82f6",
    },
    payment_received: {
      label: "Payment Approved",
      color: "#22c55e",
    },
    rejected: { label: "Payment Rejected", color: "#ef4444" },
  };

  return <Badge {...map[status]} />;
}

function ShippingStatus({ status }: { status?: string }) {
  if (!status)
    return <Badge label="Not shipped yet" color="#9ca3af" />;

  const map: Record<string, { label: string; color: string }> = {
    created: { label: "Order Created", color: "#64748b" },
    processing: { label: "Processing", color: "#3b82f6" },
    shipped: { label: "Shipped", color: "#8b5cf6" },
    delivered: { label: "Delivered", color: "#22c55e" },
  };

  return <Badge {...map[status]} />;
}

/* ======================
   PAGE
====================== */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] =
    useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [proof, setProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  /* ======================
     LOAD DATA
  ====================== */
  async function load() {
    if (!token) return;

    try {
      const [orderRes, paymentRes] = await Promise.all([
        fetch(`${API}/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/payment-settings`),
      ]);

      if (!orderRes.ok) throw new Error();

      setOrder(await orderRes.json());
      setPayment(await paymentRes.json());
    } catch {
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  /* ======================
     UPLOAD PAYMENT PROOF
  ====================== */
  async function uploadProof() {
    if (!proof) {
      toast.error("Please select a file");
      return;
    }
    if (!token) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("proof", proof);

      const res = await fetch(
        `${API}/api/orders/${id}/payment-proof`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Payment proof submitted");
      setProof(null);
      await load();
    } catch {
      toast.error("Failed to upload payment proof");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return <p>Order not found</p>;

  return (
    <div style={{ display: "grid", gap: 26 }}>
      {/* HEADER */}
      <section className="card">
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          {new Date(order.created_at).toLocaleString()}
        </p>
      </section>

      {/* STATUS BADGES */}
      <section style={{ display: "flex", gap: 12 }}>
        <PaymentStatus status={order.payment_status} />
        <ShippingStatus status={order.shipping_status} />
      </section>

      {/* TIMELINE */}
      <OrderTimeline
        paymentStatus={order.payment_status}
        shippingStatus={order.shipping_status || "created"}
        trackingNumber={order.tracking_number}
      />

      {/* ITEMS */}
      <section className="card">
        <h2 style={{ fontWeight: 900 }}>Items</h2>

        {order.items.map((i) => (
          <div
            key={i.id}
            style={{ display: "flex", gap: 14, alignItems: "center" }}
          >
            <img
              src={i.img}
              alt={i.title}
              style={{
                width: 64,
                height: 64,
                objectFit: "cover",
                borderRadius: 12,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{i.title}</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                Qty: {i.quantity}
              </div>
            </div>
            <div style={{ fontWeight: 800 }}>₹{i.price}</div>
          </div>
        ))}

        <div style={{ fontWeight: 900 }}>
          Total: ₹{order.total_amount}
        </div>
      </section>

      {/* PAYMENT */}
      {order.payment_status === "on_hold" && payment && (
        <section className="card">
          <h2 style={{ fontWeight: 900 }}>
            Payment Instructions
          </h2>

          <p>Transfer the amount to:</p>

          <div style={{ fontWeight: 700 }}>
            {payment.bank_name}
            <br />
            {payment.account_name}
            <br />
            {payment.account_number}
          </div>

          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) =>
              setProof(e.target.files?.[0] || null)
            }
          />

          <button
            className="btn btnTech"
            onClick={uploadProof}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload Payment Proof"}
          </button>
        </section>
      )}
    </div>
  );
}
