"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyOrders, type Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    getMyOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  if (loading) {
    return <p style={{ opacity: 0.6 }}>Loading your orders…</p>;
  }

  /* ---------------- EMPTY STATE ---------------- */

  if (orders.length === 0) {
    return (
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
          Your Orders
        </h1>

        <p style={{ opacity: 0.7, marginBottom: 28 }}>
          You haven’t placed any orders yet.
        </p>

        <button
          onClick={() => router.push("/store")}
          style={primary}
        >
          Start shopping
        </button>
      </div>
    );
  }

  /* ---------------- ORDERS LIST ---------------- */

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 24 }}>
        Your Orders
      </h1>

      <div style={{ display: "grid", gap: 16 }}>
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => router.push(`/account/orders/${order.id}`)}
            style={orderCard}
          >
            <div>
              <div style={{ fontWeight: 800 }}>
                Order #{order.id.slice(0, 8)}
              </div>

              <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>
                Placed on {new Date(order.created_at).toLocaleDateString()}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800 }}>
                M {order.total_amount.toFixed(2)}
              </div>

              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                {order.payment_status || "processing"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------ styles ------------------ */

const primary: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const orderCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
  borderRadius: 14,
  background: "#fff",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 10px 30px rgba(0,0,0,.08)",
};
