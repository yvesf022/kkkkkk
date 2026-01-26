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

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

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

      setOrder(await res.json());
    } catch {
      toast.error("Failed to load order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  /* ======================
     UPDATE ORDER
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
        throw new Error(data?.detail || "Failed to update order. Please try again.");
      }

      toast.success("Order updated successfully!");
      load();
    } catch (err: any) {
      toast.error(err.message || "Unable to update. Please try again.");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return <p>No orders found. Please check back later.</p>;

  const canReviewPayment =
    order.payment_status === "payment_submitted";

  const canShip =
    order.payment_status === "payment_received";

  // Utility function to determine badge class
  const getStatusBadge = (status: string, type: string) => {
    let badgeClass = "badge";

    if (status === "payment_submitted" && type === "payment") {
      badgeClass += " badge-warning"; // Urgency for payment review
    } else if (status === "payment_received" && type === "payment") {
      badgeClass += " badge-success"; // Payment received
    } else if (status === "rejected" && type === "payment") {
      badgeClass += " badge-danger"; // Payment rejected
    }

    if (status === "created" && type === "shipping") {
      badgeClass += " badge-info"; // Shipping created
    } else if (status === "processing" && type === "shipping") {
      badgeClass += " badge-primary"; // Processing shipping
    } else if (status === "shipped" && type === "shipping") {
      badgeClass += " badge-secondary"; // Shipped
    } else if (status === "delivered" && type === "shipping") {
      badgeClass += " badge-dark"; // Delivered
    }

    return badgeClass;
  };

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
        <div>
          <b>User:</b> {order.user_email}
        </div>
        <div>
          <b>Total:</b> M{order.total_amount.toLocaleString()}
        </div>
        <div>
          <b>Payment status:</b>
          <span className={getStatusBadge(order.payment_status, "payment")}>
            {order.payment_status}
          </span>
        </div>
        <div>
          <b>Shipping status:</b>
          <span className={getStatusBadge(order.shipping_status, "shipping")}>
            {order.shipping_status}
          </span>
        </div>
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
            View Payment Proof
          </a>
        </section>
      )}

      {/* PAYMENT REVIEW */}
      {canReviewPayment && (
        <section className="card">
          <h2 style={{ fontWeight: 900 }}>
            Review Payment
          </h2>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 10,
            }}
          >
            <button
              className="btn btnTech"
              disabled={updating}
              onClick={() =>
                update({
                  status: "payment_received",
                })
              }
              title={!canReviewPayment ? "You cannot approve payment until it is submitted." : ""}
            >
              Approve Payment
            </button>

            <button
              className="btn btnGhost"
              disabled={updating}
              onClick={() =>
                update({ status: "rejected" })
              }
              title="You can reject the payment if necessary."
            >
              Reject Payment
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
            update({
              shipping_status: e.target.value,
            })
          }
          title={!canShip ? "You cannot ship until payment is received." : ""}
        >
          <option value="created">Created</option>
          <option value="processing">
            Processing
          </option>
          <option value="shipped">Shipped</option>
          <option value="delivered">
            Delivered
          </option>
        </select>

        <input
          type="text"
          placeholder="Tracking number (optional)"
          value={order.tracking_number || ""}
          disabled={!canShip || updating}
          onChange={(e) =>
            update({
              tracking_number: e.target.value,
            })
          }
          style={{ marginTop: 10 }}
          title={!canShip ? "Please approve payment before updating shipping." : ""}
        />
      </section>

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
              M{(
                (i.price || 0) * i.quantity
              ).toLocaleString()}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
