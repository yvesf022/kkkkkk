"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import RequireAuth from "@/components/auth/RequireAuth";
import { getMyOrders } from "@/lib/api";

type Order = {
  id: string;
  total_amount: number;
  shipping_status: string;
  created_at: string;
};

export default function AccountPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch {
      toast.error("Failed to load your orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <RequireAuth role="user">
      <div style={{ padding: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          My Orders
        </h1>

        {loading && <p>Loading orders…</p>}

        {!loading && orders.length === 0 && (
          <p style={{ opacity: 0.6 }}>No orders yet.</p>
        )}

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
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 900 }}>
                Order #{o.id.slice(0, 8)}
              </div>
              <div>Total: ₹{o.total_amount}</div>
              <div>
                Shipping: <b>{o.shipping_status}</b>
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {new Date(o.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
}
