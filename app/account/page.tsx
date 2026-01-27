"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { getMyOrders } from "@/lib/api";

/* ======================
   TYPES
====================== */

type PaymentStatus = "pending" | "on_hold" | "paid" | "rejected";
type ShippingStatus = "awaiting_shipping" | "shipped" | null;

type UIOrder = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_status: PaymentStatus;
  shipping_status: ShippingStatus;
};

/* ======================
   PAGE
====================== */

export default function AccountPage() {
  const [orders, setOrders] = useState<UIOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      const data = await getMyOrders();

      // 🔐 Normalize backend → UI-safe
      const normalized: UIOrder[] = data.map((o: any) => ({
        id: o.id,
        created_at: o.created_at,
        total_amount: o.total_amount,
        payment_status: o.payment_status ?? "pending",
        shipping_status: o.shipping_status ?? null,
      }));

      setOrders(normalized);
    } catch {
      toast.error("Failed to load your account data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const latestOrder = orders[0];

  return (
    <div style={{ maxWidth: 1200, display: "grid", gap: 28 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          My Account
        </h1>
        <p style={{ marginTop: 6, opacity: 0.65 }}>
          Overview of your recent orders and delivery status.
        </p>
      </header>

      {/* LOADING */}
      {loading && <p>Loading your account…</p>}

      {/* EMPTY */}
      {!loading && orders.length === 0 && (
        <section
          style={{
            padding: 32,
            borderRadius: 24,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ fontWeight: 900 }}>
            You haven’t placed any orders yet
          </h3>
          <p style={{ marginTop: 6, opacity: 0.7 }}>
            Once you place an order, payment and shipping updates
            will appear here.
          </p>

          <Link
            href="/"
            className="btn btnPrimary"
            style={{ marginTop: 16, display: "inline-block" }}
          >
            Continue shopping
          </Link>
        </section>
      )}

      {/* LATEST ORDER */}
      {!loading && latestOrder && (
        <section
          style={{
            borderRadius: 24,
            padding: 28,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            display: "grid",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ fontWeight: 900 }}>
              Latest order
            </h2>

            <Link
              href="/account/orders"
              className="btn btnGhost"
            >
              View all orders
            </Link>
          </div>

          <div style={{ fontSize: 14, opacity: 0.7 }}>
            Order #{latestOrder.id.slice(0, 8)} ·{" "}
            {new Date(latestOrder.created_at).toLocaleDateString()}
          </div>

          <div style={{ fontWeight: 800 }}>
            Total: M
            {latestOrder.total_amount.toLocaleString()}
          </div>

          <StatusRow
            label="Payment"
            status={paymentLabel(latestOrder.payment_status)}
            highlight={
              latestOrder.payment_status === "on_hold" ||
              latestOrder.payment_status === "rejected"
            }
          />

          <StatusRow
            label="Shipping"
            status={shippingLabel(latestOrder.shipping_status)}
          />

          {(latestOrder.payment_status === "on_hold" ||
            latestOrder.payment_status === "rejected") && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "#b45309",
              }}
            >
              Action required: complete payment and upload proof
              to continue processing this order.
            </div>
          )}

          <Link
            href={`/account/orders/${latestOrder.id}`}
            className="btn btnPrimary"
            style={{ marginTop: 10, width: "fit-content" }}
          >
            View order details
          </Link>
        </section>
      )}
    </div>
  );
}

/* ======================
   HELPERS
====================== */

function StatusRow({
  label,
  status,
  highlight,
}: {
  label: string;
  status: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        fontWeight: 700,
        color: highlight ? "#b45309" : "#0f172a",
      }}
    >
      <span style={{ width: 80 }}>{label}</span>
      <span>{status}</span>
    </div>
  );
}

function paymentLabel(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return "Order placed";
    case "on_hold":
      return "Awaiting payment";
    case "paid":
      return "Payment confirmed";
    case "rejected":
      return "Payment rejected";
  }
}

function shippingLabel(status: ShippingStatus) {
  if (!status) return "Not shipped yet";
  if (status === "awaiting_shipping") return "Preparing shipment";
  if (status === "shipped") return "Shipped";
  return "—";
}
