"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  user_email: string;
  total_amount: number;
  status: string; // on_hold | payment_submitted | payment_received | rejected
  shipping_status?: string; // created | processing | shipped | delivered
  tracking_number?: string;
  payment_proof?: string;
  created_at: string;
  items: OrderItem[];
};

/* ======================
   PAGE
====================== */
export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState("");
  const [shippingStatus, setShippingStatus] = useState("");
  const [tracking, setTracking] = useState("");

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
      const res = await fetch(`${API}/api/orders/admin/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setOrder(data);

      setPaymentStatus(data.status);
      setShippingStatus(data.shipping_status || "created");
      setTracking(data.tracking_number || "");
    } catch {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  /* ======================
     SAVE UPDATES
  ====================== */
  async function saveUpdates() {
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/orders/admin/${id}/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: paymentStatus,
            shipping_status: shippingStatus,
            tracking_number: tracking,
          }),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Order updated successfully");
      await load();
    } catch {
      toast.error(
        "Failed to update order (backend may not be wired yet)"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return <p>Order not found</p>;

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 1000 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          {new Date(order.created_at).toLocaleString()}
        </p>
      </header>

      {/* USER */}
      <section className="card">
        <h3>User</h3>
        <p>{order.user_email}</p>
      </section>

      {/* ITEMS */}
      <section className="card">
        <h3>Items</h3>

        {order.items.map((i) => (
          <div
            key={i.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <img
              src={i.img}
              alt={i.title}
              style={{
                width: 56,
                height: 56,
                borderRadius: 10,
                objectFit: "cover",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{i.title}</div>
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

      {/* PAYMENT PROOF */}
      {order.payment_proof && (
        <section className="card">
          <h3>Payment Proof</h3>
          <a
            href={order.payment_proof}
            target="_blank"
            rel="noreferrer"
            className="btn btnGhost"
          >
            View Uploaded Proof
          </a>
        </section>
      )}

      {/* ADMIN CONTROLS */}
      <section className="card">
        <h3>Admin Controls</h3>

        {/* PAYMENT STATUS */}
        <label>
          Payment Status
          <select
            value={paymentStatus}
            onChange={(e) =>
              setPaymentStatus(e.target.value)
            }
          >
            <option value="on_hold">On hold</option>
            <option value="payment_submitted">
              Payment submitted
            </option>
            <option value="payment_received">
              Payment received
            </option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        {/* SHIPPING STATUS */}
        <label>
          Shipping Status
          <select
            value={shippingStatus}
            onChange={(e) =>
              setShippingStatus(e.target.value)
            }
          >
            <option value="created">Created</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
        </label>

        {/* TRACKING */}
        <label>
          Tracking Number
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Enter tracking number"
          />
        </label>

        <button
          className="btn btnTech"
          onClick={saveUpdates}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Updates"}
        </button>
      </section>
    </div>
  );
}
