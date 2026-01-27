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

/* ======================
   STATUS CHIP
====================== */
function StatusChip({
  label,
  bg,
}: {
  label: string;
  bg: string;
}) {
  return (
    <span
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        background: bg,
        color: "#fff",
      }}
    >
      {label}
    </span>
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

  async function loadOrder() {
    try {
      const res = await fetch(`${API}/api/orders/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setOrder(await res.json());
    } catch {
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

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
          credentials: "include",
          body: form,
        }
      );

      if (!res.ok) throw new Error();
      toast.success("Payment proof submitted");
      setFile(null);
      loadOrder();
    } catch {
      toast.error("Failed to upload payment proof");
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
        <StatusChip
          label={order.payment_status.replace("_", " ")}
          bg="#0ea5e9"
        />
        <StatusChip
          label={order.shipping_status.replace("_", " ")}
          bg="#8b5cf6"
        />
      </section>

      {/* GUIDANCE */}
      <section className="card">
        {order.payment_status === "on_hold" && (
          <p>
            Your order is awaiting payment. Please complete
            the payment using your chosen method and upload
            the proof below to continue processing.
          </p>
        )}

        {order.payment_status === "payment_submitted" && (
          <p>
            Your payment proof has been received and is
            currently under review. We’ll notify you once
            it’s confirmed.
          </p>
        )}

        {order.payment_status === "payment_received" && (
          <p>
            Payment confirmed. Your order is being prepared
            for shipment.
          </p>
        )}

        {order.shipping_status === "shipped" && (
          <p>
            Your order has been shipped.
            {order.tracking_number && (
              <>
                {" "}
                Tracking number:{" "}
                <b>{order.tracking_number}</b>
              </>
            )}
          </p>
        )}
      </section>

      {/* TIMELINE */}
      <OrderTimeline
        paymentStatus={order.payment_status}
        shippingStatus={order.shipping_status}
        trackingNumber={order.tracking_number}
      />

      {/* PAYMENT PROOF */}
      {canUpload && (
        <section className="card">
          <h2 style={{ fontWeight: 900 }}>
            Upload Payment Proof
          </h2>

          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
            style={{ marginTop: 12 }}
          />

          <button
            className="btn btnPrimary"
            disabled={uploading}
            onClick={submitProof}
            style={{ marginTop: 12 }}
          >
            {uploading
              ? "Uploading…"
              : "Submit payment proof"}
          </button>
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
          }}
        >
          Total: M{order.total_amount.toLocaleString()}
        </div>
      </section>
    </div>
  );
}
