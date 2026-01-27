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

export default function OrdersPage() {
  const [orders, setOrders] = useState<UIOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      const data = await getMyOrders();

      // 🔐 Normalize backend data → UI-safe data
      const normalized: UIOrder[] = data.map((o: any) => ({
        id: o.id,
        created_at: o.created_at,
        total_amount: o.total_amount,
        payment_status: o.payment_status ?? "pending",
        shipping_status: o.shipping_status ?? null,
      }));

      setOrders(normalized);
    } catch {
      toast.error("Failed to load your orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return <p>Loading your orders…</p>;
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>
        Orders
      </h1>
      <p style={{ marginTop: 6, opacity: 0.6 }}>
        View and manage your orders
      </p>

      <section style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {orders.length === 0 ? (
          <div
            style={{
              padding: 24,
              borderRadius: 18,
              background: "#f8fafc",
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            You have not placed any orders yet.
          </div>
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              style={{
                padding: 20,
                borderRadius: 18,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                Order #{o.id.slice(0, 8)}
              </div>

              <div style={{ fontSize: 13, opacity: 0.6 }}>
                {new Date(o.created_at).toLocaleDateString()}
              </div>

              <div style={{ marginTop: 6, fontWeight: 800 }}>
                Total: M{o.total_amount.toLocaleString()}
              </div>

              <div style={{ marginTop: 10, fontSize: 14 }}>
                <strong>Payment:</strong>{" "}
                {paymentLabel(o.payment_status)}
              </div>

              <div style={{ fontSize: 14 }}>
                <strong>Shipping:</strong>{" "}
                {shippingLabel(o.shipping_status)}
              </div>

              <Link
                href={`/account/orders/${o.id}`}
                className="btn btnPrimary"
                style={{ marginTop: 12, width: "fit-content" }}
              >
                View details
              </Link>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/* ======================
   HELPERS
====================== */

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
