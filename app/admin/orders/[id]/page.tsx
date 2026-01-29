"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type OrderItem = {
  product_id?: string;
  title?: string;
  price?: number;
  quantity: number;
};

type Order = {
  id: string;
  user_email: string;
  items: OrderItem[];
  total_amount: number;
  payment_status: string;
  shipping_status: string;
  tracking_number?: string;
  payment_proof?: string | null;
  created_at: string;
};

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [tracking, setTracking] = useState("");

  // ✅ STANDARD TOKEN
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  /* ======================
     AUTH GUARD
  ====================== */
  useEffect(() => {
    if (!token) {
      router.replace("/admin/login");
    }
  }, [token, router]);

  /* ======================
     LOAD ORDER
  ====================== */
  async function load() {
    try {
      const res = await fetch(
        `${API}/api/orders/admin/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setOrder(data);
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
     UPDATE HELPERS
  ====================== */
  async function update(payload: Record<string, any>) {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API}/api/orders/admin/${id}/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.detail || "Update failed"
        );
      }

      toast.success("Order updated");
      load();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return <p>Order not found.</p>;

  const canReviewPayment =
    order.payment_status === "payment_submitted";

  const canShip =
    order.payment_status === "payment_received";

  return (
    <div style={{ display: "grid", gap: 26 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          {new Date(order.created_at).toLocaleString()}
        </p>
      </header>

      {/* META */}
      <section className="card">
        <div><b>User:</b> {order.user_email}</div>
        <div><b>Total:</b> M{order.total_amount.toLocaleString()}</div>
        <div><b>Payment:</b> {order.payment_status}</div>
        <div><b>Shipping:</b> {order.shipping_status}</div>
      </section>

      {/* PAYMENT PROOF */}
      {order.payment_proof && (
        <section className="card">
          <h2 style={{ fontWeight: 900 }}>
            Payment Proof
          </h2>
          <a
            href={order.payment_proof}
            target="_blank"
            rel="noreferrer"
            className="btn btnGhost"
            style={{ marginTop: 10 }}
          >
            View proof
          </a>
        </section>
      )}

      {/* PAYMENT REVIEW */}
      {canReviewPayment && (
        <section className="card">
          <h2 style={{ fontWeight: 900 }}>
            Review Payment
          </h2>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btnTech"
              disabled={updating}
              onClick={() =>
                update({ status: "payment_received" })
              }
            >
              Approve payment
            </button>

            <button
              className="btn btnGhost"
              disabled={updating}
              onClick={() =>
                update({ status: "rejected" })
              }
            >
              Reject payment
            </button>
          </div>
        </section>
      )}

      {/* SHIPPING */}
      <section className="card">
        <h2 style={{ fontWeight: 900 }}>
          Shipping
        </h2>

        <select
          disabled={!canShip || updating}
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
          type="text"
          placeholder="Tracking number (optional)"
          value={tracking}
          disabled={!canShip || updating}
          onChange={(e) => setTracking(e.target.value)}
          style={{ marginTop: 10 }}
        />

        <button
          className="btn btnPrimary"
          disabled={!canShip || updating}
          style={{ marginTop: 10 }}
          onClick={() =>
            update({ tracking_number: tracking })
          }
        >
          Save tracking
        </button>
      </section>

      {/* ITEMS */}
      <section className="card">
        <h2 style={{ fontWeight: 900 }}>
          Items
        </h2>

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
              M{((i.price || 0) * i.quantity).toLocaleString()}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
