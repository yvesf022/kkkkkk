"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMyOrders, Order } from "@/lib/api";
import Link from "next/link";

/* ======================
   STATUS CHIP
====================== */
function Chip({
  label,
  bg,
  color = "#fff",
}: {
  label: string;
  bg: string;
  color?: string;
}) {
  return (
    <span
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

/* ======================
   PAGE
====================== */
export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
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

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>
          My Orders
        </h1>
        <p style={{ opacity: 0.65 }}>
          Track payment confirmation and shipping progress.
        </p>
      </header>

      {/* LOADING */}
      {loading && <p>Loading your orders…</p>}

      {/* EMPTY STATE */}
      {!loading && orders.length === 0 && (
        <section
          style={{
            padding: 32,
            borderRadius: 22,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ fontWeight: 900 }}>
            You haven’t placed any orders yet
          </h3>
          <p style={{ marginTop: 6, opacity: 0.7 }}>
            Once you place an order, payment and shipping
            updates will appear here.
          </p>
        </section>
      )}

      {/* ORDERS */}
      <div style={{ display: "grid", gap: 18 }}>
        {orders.map((o) => {
          const needsPayment =
            o.payment_status === "on_hold" ||
            o.payment_status === "rejected";

          return (
            <section
              key={o.id}
              style={{
                borderRadius: 24,
                padding: 22,
                background: "#ffffff",
                border: needsPayment
                  ? "2px solid #f59e0b"
                  : "1px solid #e5e7eb",
                display: "grid",
                gap: 14,
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  Order #{o.id.slice(0, 8)}
                </div>

                <Link
                  href={`/account/orders/${o.id}`}
                  className="btn btnGhost"
                >
                  View details
                </Link>
              </div>

              {/* META */}
              <div style={{ fontSize: 14 }}>
                <b>Date:</b>{" "}
                {new Date(o.created_at).toLocaleDateString()}
              </div>

              <div style={{ fontSize: 15 }}>
                <b>Total:</b>{" "}
                <strong>
                  M{o.total_amount.toLocaleString()}
                </strong>
              </div>

              {/* STATUS */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {o.payment_status === "on_hold" && (
                  <Chip
                    label="Awaiting payment"
                    bg="#f59e0b"
                  />
                )}
                {o.payment_status === "payment_submitted" && (
                  <Chip
                    label="Payment under review"
                    bg="#3b82f6"
                  />
                )}
                {o.payment_status === "payment_received" && (
                  <Chip
                    label="Payment confirmed"
                    bg="#22c55e"
                  />
                )}
                {o.payment_status === "rejected" && (
                  <Chip
                    label="Payment rejected"
                    bg="#ef4444"
                  />
                )}

                {o.shipping_status && (
                  <Chip
                    label={`Shipping: ${o.shipping_status.replace(
                      "_",
                      " "
                    )}`}
                    bg="#0ea5e9"
                  />
                )}
              </div>

              {/* GUIDANCE */}
              {needsPayment && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#b45309",
                  }}
                >
                  Action required: complete payment and
                  upload proof to continue processing
                  this order.
                </div>
              )}

              {o.shipping_status === "shipped" && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#1d4ed8",
                  }}
                >
                  Your order has been shipped. Tracking
                  details are available in the order view.
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
