"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
  status: string; // payment status
  shipping_status?: string;
  created_at: string;
  items: OrderItem[];
  payment_proof?: string;
};

type PaymentSettings = {
  bank_name: string;
  account_name: string;
  account_number: string;
};

/* ======================
   STATUS BADGES
====================== */
function Badge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
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
    pending: { label: "Awaiting Payment", color: "#f59e0b" },
    payment_submitted: {
      label: "Payment Under Review",
      color: "#3b82f6",
    },
    confirmed: { label: "Payment Approved", color: "#22c55e" },
    rejected: { label: "Payment Rejected", color: "#ef4444" },
  };

  const s = map[status] || {
    label: status,
    color: "#64748b",
  };

  return <Badge {...s} />;
}

function ShippingStatus({ status }: { status?: string }) {
  if (!status)
    return (
      <Badge label="Not shipped yet" color="#9ca3af" />
    );

  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "#f59e0b" },
    processing: { label: "Processing", color: "#3b82f6" },
    shipped: { label: "Shipped", color: "#8b5cf6" },
    delivered: { label: "Delivered", color: "#22c55e" },
    cancelled: { label: "Cancelled", color: "#ef4444" },
  };

  const s = map[status] || {
    label: status,
    color: "#64748b",
  };

  return <Badge {...s} />;
}

/* ======================
   PAGE
====================== */
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] =
    useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [proof, setProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ======================
     FETCH DATA
  ====================== */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    Promise.all([
      fetch(`${API}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API}/api/payment-settings`).then((r) =>
        r.json()
      ),
    ])
      .then(([orderData, paymentData]) => {
        setOrder(orderData);
        setPayment(paymentData);
      })
      .catch(() =>
        toast.error("Failed to load order details")
      )
      .finally(() => setLoading(false));
  }, [orderId]);

  /* ======================
     UPLOAD PAYMENT PROOF
  ====================== */
  async function uploadProof() {
    if (!proof) return toast.error("Select a file");
    const token = localStorage.getItem("token");
    if (!token) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", proof);

      const res = await fetch(
        `${API}/api/orders/${orderId}/payment-proof`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      );

      if (!res.ok) throw new Error();
      toast.success("Payment proof submitted");
      router.refresh();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return <p>Order not found</p>;

  return (
    <div style={{ display: "grid", gap: 26 }}>
      {/* HEADER */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background:
            "linear-gradient(135deg,#f8fbff,#eef6ff)",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          {new Date(order.created_at).toLocaleString()}
        </p>
      </section>

      {/* STATUS */}
      <section
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <PaymentStatus status={order.status} />
        <ShippingStatus status={order.shipping_status} />
      </section>

      {/* ITEMS */}
      <section
        style={{
          borderRadius: 22,
          padding: 20,
          background:
            "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow:
            "0 18px 50px rgba(15,23,42,0.14)",
          display: "grid",
          gap: 14,
        }}
      >
        <h2 style={{ fontWeight: 900 }}>Items</h2>

        {order.items.map((i) => (
          <div
            key={i.id}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
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
              <div style={{ fontWeight: 700 }}>
                {i.title}
              </div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                Qty: {i.quantity}
              </div>
            </div>
            <div style={{ fontWeight: 800 }}>
              ₹{i.price}
            </div>
          </div>
        ))}

        <div style={{ fontWeight: 900 }}>
          Total: ₹{order.total_amount}
        </div>
      </section>

      {/* PAYMENT */}
      {(order.status === "pending" ||
        order.status === "rejected") &&
        payment && (
          <section
            style={{
              borderRadius: 22,
              padding: 20,
              background:
                "linear-gradient(135deg,#ffffff,#f8fbff)",
              boxShadow:
                "0 18px 50px rgba(15,23,42,0.14)",
              display: "grid",
              gap: 12,
            }}
          >
            <h2 style={{ fontWeight: 900 }}>
              Payment Instructions
            </h2>

            <p>
              Transfer the amount to:
            </p>

            <div style={{ fontWeight: 700 }}>
              {payment.bank_name}
              <br />
              {payment.account_name}
              <br />
              {payment.account_number}
            </div>

            <input
              type="file"
              onChange={(e) =>
                setProof(e.target.files?.[0] || null)
              }
            />

            <button
              className="btn btnTech"
              onClick={uploadProof}
              disabled={uploading}
            >
              {uploading
                ? "Uploading…"
                : "Upload Payment Proof"}
            </button>
          </section>
        )}
    </div>
  );
}
