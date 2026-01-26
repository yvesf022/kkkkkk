"use client";

import { useEffect, useMemo, useState } from "react";
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

  // ---------- Dashboard calculations ----------
  const totalOrders = orders.length;

  const totalSpent = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.total_amount, 0);
  }, [orders]);

  const lastOrder = orders[0];

  return (
    <RequireAuth role="user">
      <div style={{ padding: 40, maxWidth: 1100 }}>
        {/* HEADER */}
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>
          My Account
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Welcome back. Here’s a quick overview of your account.
        </p>

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
            marginTop: 28,
          }}
        >
          <StatCard
            label="Total Orders"
            value={totalOrders}
          />
          <StatCard
            label="Total Spent"
            value={`₹${totalSpent}`}
          />
          <StatCard
            label="Last Order"
            value={
              lastOrder
                ? `#${lastOrder.id.slice(0, 8)}`
                : "—"
            }
          />
        </div>

        {/* RECENT ORDERS */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>
            Recent Orders
          </h2>

          {loading && <p>Loading orders…</p>}

          {!loading && orders.length === 0 && (
            <p style={{ opacity: 0.6, marginTop: 12 }}>
              You haven’t placed any orders yet.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gap: 16,
              marginTop: 16,
            }}
          >
            {orders.slice(0, 5).map((o) => (
              <div
                key={o.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  padding: 18,
                  background: "#fff",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  Order #{o.id.slice(0, 8)}
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <span>Total: ₹{o.total_amount}</span>
                  <span>
                    Status:{" "}
                    <b>{o.shipping_status}</b>
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.6,
                  }}
                >
                  {new Date(o.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

/* ---------------- UI helpers ---------------- */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 20,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 13,
          opacity: 0.6,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}
