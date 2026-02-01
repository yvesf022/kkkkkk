"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES (MATCH BACKEND)
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
  payment_status: string;
  shipping_status: string;
  tracking_number?: string;
  created_at: string;
};

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [shippingStatus, setShippingStatus] = useState("");
  const [tracking, setTracking] = useState("");

  /* ======================
     LOAD ORDER (ADMIN)
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
     UPDATE SHIPPING ONLY
  ====================== */
  async function updateShipping() {
    if (!order) return;

    setUpdating(true);
    try {
      const res = await fetch(
        `${API}/api/orders/admin/${order.id}/shipping`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shipping_status: shippingStatus,
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

  const paid = order.payment_status === "payment_received";

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 960 }}>
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
      <section className="card">
        <div>
          <b>Total:</b> {fmtM(order.total_amount)}
        </div>
        <div>
          <b>Payment:</b> {paymentLabel(order.payment_status)}
        </div>
        <div>
          <b>Shipping:</b> {shippingLabel(order.shipping_status)}
        </div>
      </section>

      {/* SHIPPING (ADMIN ONLY AFTER PAYMENT) */}
      {paid && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <h3>Shipping</h3>

          <select
            value={shippingStatus}
            onChange={(e) => setShippingStatus(e.target.value)}
          >
            <option value="">Not shipped</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>

          <input
            placeholder="Tracking number"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />

          <button
            className="btn btnTech"
            disabled={updating}
            onClick={updateShipping}
          >
            Update Shipping
          </button>
        </section>
      )}

      {/* ITEMS */}
      <section className="card">
        <h3>Items</h3>

        <div style={{ display: "grid", gap: 12 }}>
          {order.items.map((i, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>{i.title}</div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  Qty: {i.quantity}
                </div>
              </div>

              <div style={{ fontWeight: 700 }}>
                {fmtM(i.price * i.quantity)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ======================
   LABEL HELPERS
====================== */

function paymentLabel(status: string) {
  switch (status) {
    case "payment_submitted":
      return "Payment submitted";
    case "payment_received":
      return "Payment approved";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    default:
      return status;
  }
}

function shippingLabel(status: string) {
  if (!status) return "Not shipped";
  if (status === "processing") return "Processing";
  if (status === "shipped") return "Shipped";
  if (status === "delivered") return "Delivered";
  return status;
}
