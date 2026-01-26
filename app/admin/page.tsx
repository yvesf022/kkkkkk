"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import RequireAuth from "@/components/auth/RequireAuth";
import { getAdminOrders } from "@/lib/api";

type Order = {
  id: string;
  user_email: string;
  total_amount: number;
  status: string;
  shipping_status?: string;
  created_at: string;
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  /* ======================
     FETCH ORDERS
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
     UPDATE SHIPPING
  ====================== */
  async function updateShipping(orderId: string, shipping_status: string) {
    setUpdating(orderId);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/admin/${orderId}/shipping`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ shipping_status }),
        }
      );

      toast.success("Shipping updated");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, shipping_status } : o
        )
      );
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <RequireAuth role="admin">
      <div style={{ padding: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Orders & Shipping
        </h1>

        {loading && <p>Loading orders…</p>}

        <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
          {orders.map((o) => (
            <div
              key={o.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 18,
                background: "#fff",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900 }}>
                Order #{o.id.slice(0, 8)}
              </div>
              <div>Email: {o.user_email}</div>
              <div>Total: ₹{o.total_amount}</div>
              <div>Payment: {o.status}</div>
              <div>
                Shipping: <b>{o.shipping_status || "created"}</b>
              </div>

              <select
                disabled={updating === o.id}
                value={o.shipping_status || "created"}
                onChange={(e) =>
                  updateShipping(o.id, e.target.value)
                }
              >
                <option value="created">Created</option>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
}
