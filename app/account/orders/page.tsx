"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getMyOrders, type Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function OrdersPage() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ======================
     REDIRECT AFTER HYDRATION
  ====================== */
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  /* ======================
     FETCH ORDERS
  ====================== */
  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    setError(null);

    getMyOrders()
      .then(setOrders)
      .catch(() =>
        setError("Failed to load your orders. Please try again.")
      )
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  /* ======================
     LOADING (AUTH)
  ====================== */
  if (authLoading) {
    return (
      <div style={{ maxWidth: 900 }}>
        <h1 style={title}>Your Orders</h1>
        <p style={{ opacity: 0.6 }}>Loading your account…</p>
      </div>
    );
  }

  /* ======================
     BLOCK RENDER AFTER REDIRECT
  ====================== */
  if (!user) return null;

  /* ======================
     LOADING (DATA)
  ====================== */
  if (loading) {
    return (
      <div style={{ maxWidth: 900 }}>
        <h1 style={title}>Your Orders</h1>
        <p style={{ opacity: 0.6 }}>Loading your orders…</p>
      </div>
    );
  }

  /* ======================
     ERROR
  ====================== */
  if (error) {
    return (
      <div style={{ maxWidth: 640 }}>
        <h1 style={title}>Your Orders</h1>
        <p style={{ color: "#991b1b" }}>{error}</p>

        <button
          onClick={() => router.refresh()}
          style={primary}
        >
          Retry
        </button>
      </div>
    );
  }

  /* ======================
     EMPTY STATE
  ====================== */
  if (orders.length === 0) {
    return (
      <div style={{ maxWidth: 640 }}>
        <h1 style={title}>Your Orders</h1>

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

  /* ======================
     ORDERS LIST
  ====================== */
  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={title}>Your Orders</h1>

      <div style={{ display: "grid", gap: 16 }}>
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() =>
              router.push(`/account/orders/${order.id}`)
            }
            style={orderCard}
          >
            <div>
              <div style={{ fontWeight: 900 }}>
                Order #{order.id.slice(0, 8)}
              </div>

              <div
                style={{
                  fontSize: 13,
                  opacity: 0.6,
                  marginTop: 4,
                }}
              >
                Placed on{" "}
                {new Date(order.created_at).toLocaleDateString()}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900 }}>
                {fmtM(order.total_amount)}
              </div>

              <div
                style={{
                  fontSize: 13,
                  marginTop: 4,
                  color:
                    order.payment_status === "paid"
                      ? "green"
                      : "orange",
                }}
              >
                {order.payment_status || "Processing"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------ styles ------------------ */

const title: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 24,
};

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
  borderRadius: 16,
  background: "#fff",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
};
