"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import RequireAuth from "@/components/auth/RequireAuth";
import { getMyOrders, Order } from "@/lib/api";
import Link from "next/link";

/* ======================
   HELPERS
====================== */
function Badge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: color,
        color: "#fff",
      }}
    >
      {label}
    </span>
  );
}

function PaymentBadge(status: string) {
  const map: Record<string, any> = {
    on_hold: {
      label: "Awaiting Payment",
      color: "#f59e0b",
    },
    payment_submitted: {
      label: "Under Review",
      color: "#3b82f6",
    },
    payment_received: {
      label: "Paid",
      color: "#22c55e",
    },
    rejected: {
      label: "Payment Rejected",
      color: "#ef4444",
    },
  };

  return (
    <Badge
      {...(map[status] || {
        label: status,
        color: "#64748b",
      })}
    />
  );
}

function ShippingBadge(status: string) {
  const map: Record<string, any> = {
    created: {
      label: "Order Created",
      color: "#64748b",
    },
    processing: {
      label: "Processing",
      color: "#3b82f6",
    },
    shipped: {
      label: "Shipped",
      color: "#8b5cf6",
    },
    delivered: {
      label: "Delivered",
      color: "#22c55e",
    },
  };

  return (
    <Badge
      {...(map[status] || {
        label: status,
        color: "#9ca3af",
      })}
    />
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
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <RequireAuth>
      <div style={{ display: "grid", gap: 24 }}>
        {/* HEADER */}
        <header>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            My Orders
          </h1>
          <p style={{ opacity: 0.6, marginTop: 4 }}>
            Track payments, shipping, and delivery
          </p>
        </header>

        {loading && <p>Loading orders…</p>}

        {!loading && orders.length === 0 && (
          <section className="card">
            <p>You have not placed any orders yet.</p>
          </section>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {orders.map((o) => {
            const itemsCount = Array.isArray(o.items)
              ? o.items.length
              : 0;

            const needsAction =
              o.payment_status === "on_hold" ||
              o.payment_status === "rejected";

            return (
              <section
                key={o.id}
                style={{
                  borderRadius: 18,
                  padding: 18,
                  background: "#ffffff",
                  border: needsAction
                    ? "2px solid #f59e0b"
                    : "1px solid #e5e7eb",
                  display: "grid",
                  gap: 12,
                }}
              >
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
                    View
                  </Link>
                </div>

                <div>
                  <b>Date:</b>{" "}
                  {new Date(
                    o.created_at
                  ).toLocaleDateString()}
                </div>

                <div>
                  <b>Items:</b> {itemsCount}
                </div>

                <div>
                  <b>Total:</b>{" "}
                  <span style={{ fontWeight: 900 }}>
                    M{o.total_amount.toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <PaymentBadge
                    status={o.payment_status}
                  />
                  <ShippingBadge
                    status={o.shipping_status}
                  />
                </div>

                {needsAction && (
                  <div
                    style={{
                      marginTop: 6,
                      color: "#b45309",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    Action required: upload payment proof
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </RequireAuth>
  );
}
