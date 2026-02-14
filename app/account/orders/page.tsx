"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyOrders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Order } from "@/lib/types";

/* ======================
   MALOTI FORMAT
====================== */

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
     AUTH REDIRECT
  ====================== */

  useEffect(() => {
    if (!authLoading && !user) {
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
      .then((apiOrders: any[]) => {
        setOrders(
          apiOrders.map((o) => ({
            id: o.id,
            created_at: o.created_at,
            total_amount: o.total_amount,
            status: o.status,
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

  /* ======================
     LOADING STATES
  ====================== */

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
        <button
          className="btn btnPrimary"
          onClick={() => router.refresh()}
        >
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
            background:
              "linear-gradient(135deg, #ffffff, #f8fbff)",
            boxShadow:
              "0 20px 60px rgba(15,23,42,0.14)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              marginBottom: 12,
            }}
          >
            No orders yet
          </h1>
          <p style={{ opacity: 0.65, marginBottom: 24 }}>
            You haven't placed any orders yet.
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

  /* ======================
     RENDER ORDERS
  ====================== */

  return (
    <div
      className="pageContentWrap"
      style={{ maxWidth: 1100 }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 13,
            opacity: 0.6,
            marginBottom: 8,
          }}
        >
          Account › Orders
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            marginBottom: 8,
          }}
        >
          Your Orders
        </h1>

        <p style={{ fontSize: 15, opacity: 0.65 }}>
          Track and manage your purchases
        </p>
      </header>

      <div style={{ display: "grid", gap: 18 }}>
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() =>
              router.push(
                `/account/orders/${order.id}`
              )
            }
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 24,
              padding: 24,
              borderRadius: 20,
              background:
                "linear-gradient(135deg, #ffffff, #f8fbff)",
              border:
                "1px solid rgba(15,23,42,0.08)",
              boxShadow:
                "0 18px 50px rgba(15,23,42,0.12)",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            {/* LEFT SIDE */}
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  marginBottom: 8,
                }}
              >
                Order #{String(order.id).slice(0, 8)}
              </div>

              <div
                style={{
                  fontSize: 14,
                  opacity: 0.6,
                  marginBottom: 12,
                }}
              >
                Placed on{" "}
                {new Date(
                  order.created_at
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              {/* STATUS BADGES */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <StatusBadge
                  type="order"
                  status={order.status}
                />

                {order.shipping_status && (
                  <StatusBadge
                    type="shipping"
                    status={order.shipping_status}
                  />
                )}
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  marginBottom: 4,
                }}
              >
                {fmtM(order.total_amount)}
              </div>

              <div
                style={{
                  fontSize: 13,
                  opacity: 0.5,
                }}
              >
                Total
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ======================
   STATUS BADGE
====================== */

function StatusBadge({
  type,
  status,
}: {
  type: "order" | "shipping";
  status: string;
}) {
  let bg = "#f3f4f6";
  let text = "#374151";
  let label = status;

  if (type === "order") {
    if (status === "pending") {
      bg = "#fef3c7";
      text = "#92400e";
      label = "Pending Payment";
    }

    if (status === "on_hold") {
      bg = "#ffedd5";
      text = "#c2410c";
      label = "Awaiting Review";
    }

    if (status === "paid") {
      bg = "#dcfce7";
      text = "#166534";
      label = "Payment Approved";
    }

    if (status === "rejected") {
      bg = "#fee2e2";
      text = "#991b1b";
      label = "Payment Rejected";
    }

    if (status === "cancelled") {
      bg = "#fee2e2";
      text = "#991b1b";
      label = "Cancelled";
    }
  }

  if (type === "shipping") {
    if (status === "processing") {
      bg = "#e0f2fe";
      text = "#075985";
      label = "Processing";
    }

    if (status === "shipped") {
      bg = "#dbeafe";
      text = "#1e40af";
      label = "Shipped";
    }

    if (status === "delivered") {
      bg = "#dcfce7";
      text = "#166534";
      label = "Delivered";
    }
  }

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        padding: "6px 12px",
        borderRadius: 999,
        background: bg,
        color: text,
      }}
    >
      {label}
    </span>
  );
}
