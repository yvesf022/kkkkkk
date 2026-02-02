"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getMyOrders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Order } from "@/lib/types";

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

  /* ---------------- AUTH REDIRECT ---------------- */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  /* ---------------- FETCH ORDERS ---------------- */
  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    setError(null);

    getMyOrders()
      .then((apiOrders: any[]) => {
        setOrders(
          apiOrders.map((o) => ({
            id: o.id,
            created_at: o.created_at,
            total_amount: o.total_amount,
            order_status: o.order_status ?? "created",
            shipping_status: o.shipping_status ?? null,
            payment_status: o.payment_status ?? null,
            tracking_number: o.tracking_number ?? null,
          }))
        );
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        setError("Failed to load your orders. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  /* ---------------- STATES ---------------- */
  if (authLoading) {
    return <p>Loading your account…</p>;
  }

  if (!user) return null;

  if (loading) {
    return <p>Loading your orders…</p>;
  }

  if (error) {
    return (
      <>
        <p style={{ color: "#991b1b" }}>{error}</p>
        <button onClick={() => router.refresh()}>Retry</button>
      </>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        <h1>Your Orders</h1>
        <p>You haven’t placed any orders yet.</p>
        <button onClick={() => router.push("/store")}>
          Start shopping
        </button>
      </>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Your Orders</h1>

      <div style={{ display: "grid", gap: 16 }}>
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() =>
              router.push(`/account/orders/${order.id}`)
            }
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 20,
              borderRadius: 16,
              background: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div>
              <strong>Order #{order.id.slice(0, 8)}</strong>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                {new Date(order.created_at).toLocaleDateString()}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <strong>{fmtM(order.total_amount)}</strong>
              <div style={{ fontSize: 13 }}>
                {order.payment_status ?? "Processing"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
