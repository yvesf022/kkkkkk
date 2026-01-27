"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getMyOrders, Order } from "@/lib/api";

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

  const totalOrders = orders.length;

  const lastOrder = orders[0];

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* HEADER */}
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>
        My Account
      </h1>
      <p style={{ marginTop: 6, opacity: 0.65 }}>
        Track your orders, payments, and shipping status.
      </p>

      {/* EMPTY STATE */}
      {!loading && orders.length === 0 && (
        <div
          style={{
            marginTop: 32,
            padding: 32,
            borderRadius: 24,
            background: "#fff",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ fontWeight: 900 }}>
            You haven’t placed any orders yet
          </h3>
          <p style={{ marginTop: 6, opacity: 0.7 }}>
            Once you place an order, you’ll see payment
            and shipping updates here.
          </p>
        </div>
      )}

      {/* ORDERS */}
      <div
        style={{
          marginTop: 36,
          display: "grid",
          gap: 20,
        }}
      >
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}

/* ================== ORDER CARD ================== */

function OrderCard({ order }: { order: Order }) {
  const status = order.shipping_status ?? "created";

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 24,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          {new Date(order.created_at).toLocaleString()}
        </div>
      </div>

      <div style={{ fontWeight: 700 }}>
        Order total: {order.total_amount}
      </div>

      {/* STATUS TIMELINE */}
      <StatusTimeline status={status} />

      {/* ACTIONS */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {status === "on_hold" && (
          <span style={{ fontWeight: 700 }}>
            Awaiting payment confirmation
          </span>
        )}

        {status === "awaiting_shipping" && (
          <span style={{ fontWeight: 700 }}>
            Payment confirmed · Preparing shipment
          </span>
        )}

        {status === "shipped" && (
          <span style={{ fontWeight: 700 }}>
            Shipped · Tracking available
          </span>
        )}
      </div>
    </div>
  );
}

/* ================== STATUS ================== */

function StatusTimeline({ status }: { status: string }) {
  const steps = [
    "created",
    "on_hold",
    "payment_confirmed",
    "awaiting_shipping",
    "shipped",
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      {steps.map((s) => (
        <div
          key={s}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            background:
              steps.indexOf(s) <= steps.indexOf(status)
                ? "#dcfce7"
                : "#f1f5f9",
            color:
              steps.indexOf(s) <= steps.indexOf(status)
                ? "#14532d"
                : "#475569",
          }}
        >
          {s.replace("_", " ")}
        </div>
      ))}
    </div>
  );
}
