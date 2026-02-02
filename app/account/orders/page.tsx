"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ordersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Order } from "@/lib/types";

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ======================
     REDIRECT IF LOGGED OUT
  ====================== */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  /* ======================
     FETCH MY ORDERS
  ====================== */
  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    setError(null);

    ordersApi
      .myOrders()
      .then((apiOrders) => {
        // 🔥 MAP API → DOMAIN MODEL
        const mapped: Order[] = apiOrders.map((o: any) => ({
          id: o.id,
          created_at: o.created_at,
          total_amount: o.total_amount,

          // REQUIRED DOMAIN FIELDS
          order_status: o.order_status ?? "created",
          payment_status: o.payment_status ?? null,
          shipping_status: o.shipping_status ?? null,
          tracking_number: o.tracking_number ?? null,
        }));

        setOrders(mapped);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        setError("Failed to load your orders. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  /* ======================
     AUTH LOADING
  ====================== */
  if (authLoading) {
    return (
      <div style={{ maxWidth: 900 }}>
        <h1 style={title}>Your Orders</h1>
        <p style={{ opacity: 0.6 }}>Loading your account…</p>
      </div>
    );
  }

  if (!user) return null;

  /* ======================
     DATA LOADING
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
        <p style={{ color: "#991b1b", marginBottom: 20 }}>
          {error}
        </p>

        <button
          onClick={() => router.refresh()}
          className="btn btnPrimary"
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
          className="btn btnPrimary"
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

/* ======================
   STYLES
====================== */

const title: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 24,
};

const orderCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
  borderRadius: 16,
  background: "#ffffff",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
};
