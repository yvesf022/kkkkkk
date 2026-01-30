"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type OrderItem = {
  product_id: string;
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

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [tracking, setTracking] = useState("");

  /* ======================
     LOAD ORDER
  ====================== */
  useEffect(() => {
    fetch(`${API}/api/orders/${id}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setTracking(data.tracking_number || "");
      })
      .catch(() => {
        toast.error("Failed to load order");
        router.replace("/admin/orders");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  /* ======================
     ADMIN UPDATE
  ====================== */
  async function update(payload: any) {
    if (!order) return;

    setUpdating(true);
    try {
      const res = await fetch(
        `${API}/api/orders/admin/${order.id}/update`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Order updated");

      // refresh
      const refreshed = await fetch(
        `${API}/api/orders/${order.id}`,
        { credentials: "include" }
      ).then((r) => r.json());

      setOrder(refreshed);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return null;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 800 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          Created on {new Date(order.created_at).toLocaleString()}
        </p>
      </header>

      {/* SUMMARY */}
      <section className="card">
        <div><b>Total:</b> M{order.total_amount}</div>
        <div><b>Payment:</b> {order.payment_status}</div>
        <div><b>Shipping:</b> {order.shipping_status}</div>
      </section>

      {/* PAYMENT ACTIONS */}
      {order.payment_status === "payment_submitted" && (
        <section className="card">
          <h3>Payment Review</h3>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btnTech"
              disabled={updating}
              onClick={() =>
                update({ status: "payment_received" })
              }
            >
              Approve Payment
            </button>

            <button
              className="btn btnGhost"
              disabled={updating}
              onClick={() =>
                update({ status: "rejected" })
              }
            >
              Reject Payment
            </button>
          </div>
        </section>
      )}

      {/* SHIPPING */}
      {order.payment_status === "payment_received" && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <h3>Shipping</h3>

          <select
            value={order.shipping_status}
            onChange={(e) =>
              update({ shipping_status: e.target.value })
            }
          >
            <option value="created">Created</option>
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
            onClick={() =>
              update({ tracking_number: tracking })
            }
          >
            Save Tracking
          </button>
        </section>
      )}

      {/* ITEMS */}
      <section className="card">
        <h3>Items</h3>

        <ul style={{ marginTop: 8 }}>
          {order.items.map((i, idx) => (
            <li key={idx}>
              Product {i.product_id} × {i.quantity}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
