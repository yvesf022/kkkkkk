"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getMyOrders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Order } from "@/lib/types";

/** Currency formatter */
const fmt = (v: number) => `R ${Math.round(v).toLocaleString()}`;

export default function OrdersPage() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ============ AUTH REDIRECT ============ */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  /* ============ FETCH ORDERS ============ */
  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    setError(null);

    getMyOrders()
      .then((apiOrders: any[]) => {
        // ✅ FIX: Map backend response correctly
        setOrders(
          apiOrders.map((o) => ({
            id: o.id,
            created_at: o.created_at,
            total_amount: o.total_amount,
            status: o.status, // ✅ FIXED: backend uses 'status' not 'order_status'
            shipping_status: o.shipping_status,
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

  /* ============ RENDER STATES ============ */
  if (authLoading) {
    return (
      <div className="pageContentWrap">
        <p style={{ opacity: 0.6 }}>Loading your account…</p>
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="pageContentWrap">
        <p style={{ opacity: 0.6 }}>Loading your orders…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pageContentWrap">
        <p style={{ color: "#991b1b", marginBottom: 16 }}>{error}</p>
        <button className="btn btnPrimary" onClick={() => router.refresh()}>
          Retry
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="pageContentWrap" style={{ maxWidth: 720 }}>
        <div
          style={{
            padding: 48,
            borderRadius: 22,
            background: "linear-gradient(135deg, #ffffff, #f8fbff)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.14)",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
            No orders yet
          </h1>
          <p style={{ opacity: 0.65, marginBottom: 24 }}>
            You haven't placed any orders yet. Start shopping to see your orders here.
          </p>
          <button
            className="btn btnPrimary"
            onClick={() => router.push("/store")}
          >
            Start shopping
          </button>
        </div>
      </div>
    );
  }

  /* ============ RENDER ORDERS ============ */
  return (
    <div className="pageContentWrap" style={{ maxWidth: 1100 }}>
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
          Account › Orders
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
          Your Orders
        </h1>
        <p style={{ fontSize: 15, opacity: 0.65 }}>
          Track and manage your orders
        </p>
      </header>

      {/* ORDERS GRID */}
      <div style={{ display: "grid", gap: 18 }}>
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => router.push(`/account/orders/${order.id}`)}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 24,
              padding: 24,
              borderRadius: 20,
              background: "linear-gradient(135deg, #ffffff, #f8fbff)",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow =
                "0 24px 60px rgba(15,23,42,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 18px 50px rgba(15,23,42,0.12)";
            }}
          >
            {/* LEFT: Order Info */}
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
                Order #{String(order.id).slice(0, 8)}
              </div>

              <div
                style={{
                  fontSize: 14,
                  opacity: 0.6,
                  marginBottom: 12,
                }}
              >
                Placed on {new Date(order.created_at).toLocaleDateString()}
              </div>

              {/* Status Pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: getStatusColor(order.status).bg,
                    color: getStatusColor(order.status).text,
                  }}
                >
                  {formatStatus(order.status)}
                </span>

                {order.shipping_status && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: getShippingColor(order.shipping_status).bg,
                      color: getShippingColor(order.shipping_status).text,
                    }}
                  >
                    {formatStatus(order.shipping_status)}
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT: Amount */}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  marginBottom: 4,
                }}
              >
                {fmt(order.total_amount)}
              </div>
              <div style={{ fontSize: 13, opacity: 0.5 }}>Total</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============ HELPERS ============ */

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "pending":
      return { bg: "#fef3c7", text: "#92400e" };
    case "paid":
      return { bg: "#dcfce7", text: "#166534" };
    case "cancelled":
      return { bg: "#fee2e2", text: "#991b1b" };
    case "shipped":
      return { bg: "#dbeafe", text: "#1e40af" };
    case "completed":
      return { bg: "#dcfce7", text: "#166534" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
}

function getShippingColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "pending":
      return { bg: "#fef3c7", text: "#92400e" };
    case "processing":
      return { bg: "#dbeafe", text: "#1e40af" };
    case "shipped":
      return { bg: "#e0e7ff", text: "#3730a3" };
    case "delivered":
      return { bg: "#dcfce7", text: "#166534" };
    case "returned":
      return { bg: "#fee2e2", text: "#991b1b" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
}
