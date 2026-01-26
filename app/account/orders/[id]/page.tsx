"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import RequireAuth from "@/components/auth/RequireAuth";
import OrderTimeline from "@/components/orders/OrderTimeline";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES (BACKEND SAFE)
====================== */
type OrderItem = {
  product_id?: string;
  title?: string;
  price?: number;
  quantity: number;
};

type Order = {
  id: string;
  total_amount: number;
  payment_status: string;
  shipping_status: string;
  tracking_number?: string;
  created_at: string;
  items: OrderItem[];
};

type PaymentSetting = {
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc_code: string;
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
      label: "Payment Submitted",
      color: "#3b82f6",
    },
    payment_received: {
      label: "Payment Received",
      color: "#22c55e",
    },
    rejected: { label: "Payment Rejected", color: "#ef4444" },
  };

  return (
    <Badge
      {...(map[status] || {
        label: status,
        color: "#64748b",
      })}
    />
  );
}

function ShippingStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> =
    {
      created: { label: "Order Created", color: "#64748b" },
      processing: {
        label: "Processing",
        color: "#3b82f6",
      },
      shipped: { label: "Shipped", color: "#8b5cf6" },
      delivered: {
        label: "Delivered",
        color: "#22c55e",
      },
    };

  return (
    <Badge
      {...(map[status] || {
        label: status,
        color: "#9ca3af",
      })}
    />
  );
}

/* ======================
   PAGE
====================== */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paymentSetting, setPaymentSetting] = useState<PaymentSetting | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  /* ======================
     LOAD ORDER
  ====================== */
  async function load() {
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      setOrder(await res.json());
    } catch {
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }

  /* ======================
     LOAD PAYMENT SETTINGS
  ====================== */
  async function loadPaymentSettings() {
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/payment-settings/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      setPaymentSetting(await res.json());
    } catch {
      toast.error("Failed to load payment settings");
    }
  }

  useEffect(() => {
    load();
    loadPaymentSettings();
  }, [id]);

  /* ======================
     UPLOAD PAYMENT PROOF
  ====================== */
  async function submitProof() {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);

    try {
      const form = new FormData();
      form.append("proof", file);

      const res = await fetch(
        `${API}/api/orders/${id}/payment-proof`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Upload failed");
      }

      toast.success("Payment proof submitted");
      setFile(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return <p>Order not found</p>;

  const canUpload =
    order.payment_status === "on_hold" ||
    order.payment_status === "rejected";

  return (
    <RequireAuth>
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

        {/* STATUS */}
        <section style={{ display: "flex", gap: 12 }}>
          <PaymentStatus status={order.payment_status} />
          <ShippingStatus status={order.shipping_status} />
        </section>

        {/* PAYMENT INSTRUCTIONS */}
        {paymentSetting && order.payment_status === "on_hold" && (
          <section className="card">
            <h2 style={{ fontWeight: 900 }}>Bank Transfer Details</h2>
            <p style={{ marginTop: 12 }}>Please transfer the total amount to the following account:</p>
            <ul style={{ marginTop: 6 }}>
              <li><b>Bank Name:</b> {paymentSetting.bank_name}</li>
              <li><b>Account Holder:</b> {paymentSetting.account_name}</li>
              <li><b>Account Number:</b> {paymentSetting.account_number}</li>
              <li><b>IFSC/SWIFT Code:</b> {paymentSetting.ifsc_code}</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              After transferring, upload your payment proof below.
            </p>
          </section>
        )}

        {/* TIMELINE */}
        <OrderTimeline
          paymentStatus={order.payment_status}
          shippingStatus={order.shipping_status}
          trackingNumber={order.tracking_number}
        />

        {/* PAYMENT */}
        {canUpload && (
          <section className="card">
            <h2 style={{ fontWeight: 900 }}>
              Submit Payment Proof
            </h2>

            <p style={{ opacity: 0.7, marginTop: 6 }}>
              Transfer the total amount manually using our
              bank details, then upload your payment
              receipt or screenshot here.
            </p>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
              style={{ marginTop: 12 }}
            />

            <button
              className="btn btnTech"
              disabled={uploading}
              onClick={submitProof}
              style={{ marginTop: 12 }}
            >
              {uploading
                ? "Uploading…"
                : "Submit Payment Proof"}
            </button>
          </section>
        )}

        {order.payment_status ===
          "payment_submitted" && (
          <section className="card">
            <h2 style={{ fontWeight: 900 }}>
              Payment Under Review
            </h2>
            <p style={{ opacity: 0.7 }}>
              Your payment proof has been submitted and is
              currently under admin review.
            </p>
          </section>
        )}

        {/* ITEMS */}
        <section className="card">
          <h2 style={{ fontWeight: 900 }}>Items</h2>

          {order.items.map((i, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span>
                {i.title || "Product"} × {i.quantity}
              </span>
              <span>
                M{" "}
                {(
                  (i.price || 0) * i.quantity
                ).toLocaleString()}
              </span>
            </div>
          ))}

          <div
            style={{
              marginTop: 12,
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            Total: M{order.total_amount.toLocaleString()}
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}
