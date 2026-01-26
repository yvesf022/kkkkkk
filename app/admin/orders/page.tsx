"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { getAdminOrders, Order } from "@/lib/api";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  /* ======================
     LOAD ORDERS
  ====================== */
  async function loadOrders() {
    setLoading(true);
    try {
      const data = await getAdminOrders();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  /* ======================
     UPDATE SHIPPING STATUS
  ====================== */
  async function updateShippingStatus(
    orderId: string,
    shipping_status: string
  ) {
    setUpdating(orderId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/admin/${orderId}/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
          body: JSON.stringify({ shipping_status }),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Shipping status updated");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, shipping_status }
            : o
        )
      );
    } catch {
      toast.error("Failed to update shipping status");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 26 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Orders
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Review payments and manage shipping
        </p>
      </header>

      {loading && <p>Loading orders…</p>}

      {/* ORDERS */}
      <div style={{ display: "grid", gap: 16 }}>
        {orders.map((o) => (
          <section
            key={o.id}
            style={{
              borderRadius: 18,
              padding: 18,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900 }}>
              Order #{o.id.slice(0, 8)}
            </div>

            <div>
              <b>User:</b>{" "}
              {o.user_email ?? "—"}
            </div>

            <div>
              <b>Total:</b> ₹{o.total_amount}
            </div>

            <div>
              <b>Payment status:</b>{" "}
              {o.payment_status}
            </div>

            <div>
              <b>Shipping status:</b>{" "}
              {o.shipping_status || "created"}
            </div>

            {/* ACTIONS */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 6,
              }}
            >
              <Link
                href={`/admin/orders/${o.id}`}
                className="btn btnGhost"
              >
                View Order
              </Link>

              <select
                disabled={updating === o.id}
                value={o.shipping_status || "created"}
                onChange={(e) =>
                  updateShippingStatus(
                    o.id,
                    e.target.value
                  )
                }
              >
                <option value="created">
                  Created
                </option>
                <option value="processing">
                  Processing
                </option>
                <option value="shipped">
                  Shipped
                </option>
                <option value="delivered">
                  Delivered
                </option>
              </select>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
