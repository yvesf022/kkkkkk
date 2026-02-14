"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */

type OrderItem = {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  items: OrderItem[];
  total_amount: number;
  payment_status: "pending" | "on_hold" | "paid" | "rejected";
  shipping_status: string | null;
  tracking_number?: string | null;
  created_at: string;
};

/* ======================
   MALOTI FORMAT
====================== */

const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

/* ======================
   PAGE
====================== */

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [shippingStatus, setShippingStatus] = useState("");
  const [tracking, setTracking] = useState("");

  /* ======================
     LOAD ORDER
  ====================== */

  async function load() {
    try {
      const res = await fetch(
        `${API}/api/orders/admin/${id}`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error();

      const data: Order = await res.json();
      setOrder(data);
      setShippingStatus(data.shipping_status || "");
      setTracking(data.tracking_number || "");
    } catch {
      toast.error("Unable to load order");
      router.replace("/admin/orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  /* ======================
     UPDATE SHIPPING
  ====================== */

  async function updateShipping() {
    if (!order) return;

    if (order.payment_status !== "paid") {
      toast.error("Shipping cannot be updated until payment is approved");
      return;
    }

    setUpdating(true);

    try {
      const res = await fetch(
        `${API}/api/admin/orders/${order.id}/shipping`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: shippingStatus,
            tracking_number: tracking,
          }),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Shipping updated");
      await load();
    } catch {
      toast.error("Failed to update shipping");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return null;

  const canShip = order.payment_status === "paid";

  return (
    <div style={{ display: "grid", gap: 32, maxWidth: 1000 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          Created {new Date(order.created_at).toLocaleString()}
        </p>
      </header>

      {/* SUMMARY */}
      <section
        style={{
          padding: 20,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          display: "grid",
          gap: 10,
        }}
      >
        <div>
          <b>Total:</b> {fmtM(order.total_amount)}
        </div>

        <StatusBadge
          label={paymentLabel(order.payment_status)}
          type="payment"
          status={order.payment_status}
        />

        <StatusBadge
          label={shippingLabel(order.shipping_status)}
          type="shipping"
          status={order.shipping_status || "none"}
        />
      </section>

      {/* SHIPPING SECTION */}
      <section
        style={{
          padding: 20,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          display: "grid",
          gap: 12,
        }}
      >
        <h3 style={{ fontWeight: 900 }}>Shipping Management</h3>

        {!canShip && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "#fef3c7",
              color: "#92400e",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Payment must be approved before shipping.
          </div>
        )}

        <select
          disabled={!canShip}
          value={shippingStatus}
          onChange={(e) => setShippingStatus(e.target.value)}
          style={{ padding: 10, borderRadius: 8 }}
        >
          <option value="">Not shipped</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>

        <input
          disabled={!canShip}
          placeholder="Tracking number"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          style={{ padding: 10, borderRadius: 8 }}
        />

        <button
          disabled={!canShip || updating}
          onClick={updateShipping}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            fontWeight: 800,
            border: "none",
            background: canShip ? "#111827" : "#9ca3af",
            color: "white",
            cursor: canShip ? "pointer" : "not-allowed",
          }}
        >
          {updating ? "Updating..." : "Update Shipping"}
        </button>
      </section>

      {/* ITEMS */}
      <section
        style={{
          padding: 20,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h3 style={{ fontWeight: 900, marginBottom: 16 }}>
          Items
        </h3>

        <div style={{ display: "grid", gap: 16 }}>
          {order.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 10,
                borderBottom: "1px solid #eee",
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  Qty: {item.quantity}
                </div>
              </div>

              <div style={{ fontWeight: 800 }}>
                {fmtM(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ======================
   STATUS BADGE
====================== */

function StatusBadge({
  label,
  type,
  status,
}: {
  label: string;
  type: "payment" | "shipping";
  status: string;
}) {
  let bg = "#f3f4f6";
  let text = "#374151";

  if (type === "payment") {
    if (status === "pending") {
      bg = "#fef3c7";
      text = "#92400e";
    }
    if (status === "on_hold") {
      bg = "#ffedd5";
      text = "#c2410c";
    }
    if (status === "paid") {
      bg = "#dcfce7";
      text = "#166534";
    }
    if (status === "rejected") {
      bg = "#fee2e2";
      text = "#991b1b";
    }
  }

  if (type === "shipping") {
    if (status === "processing") {
      bg = "#dbeafe";
      text = "#1e40af";
    }
    if (status === "shipped") {
      bg = "#e0e7ff";
      text = "#3730a3";
    }
    if (status === "delivered") {
      bg = "#dcfce7";
      text = "#166534";
    }
  }

  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        background: bg,
        color: text,
        fontWeight: 800,
        fontSize: 13,
        display: "inline-block",
      }}
    >
      {label}
    </div>
  );
}

/* ======================
   LABEL HELPERS
====================== */

function paymentLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending Payment";
    case "on_hold":
      return "Awaiting Review";
    case "paid":
      return "Payment Approved";
    case "rejected":
      return "Payment Rejected";
    default:
      return status;
  }
}

function shippingLabel(status: string | null) {
  if (!status) return "Not Shipped";
  if (status === "processing") return "Processing";
  if (status === "shipped") return "Shipped";
  if (status === "delivered") return "Delivered";
  return status;
}
