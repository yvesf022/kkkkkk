"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */

type Order = {
  id: string;
  user_email: string;
  total_amount: number;
  payment_status: "pending" | "on_hold" | "paid" | "rejected";
  shipping_status: string | null;
  created_at: string;
};

type Filter =
  | "all"
  | "needs_review"
  | "paid"
  | "shipped";

/* ======================
   MALOTI FORMAT
====================== */

const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

/* ======================
   PAGE
====================== */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(
        `${API}/api/orders/admin`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error();
      setOrders(await res.json());
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* ======================
     FILTERING
  ====================== */

  const visibleOrders = useMemo(() => {
    if (filter === "needs_review") {
      return orders.filter(
        (o) => o.payment_status === "on_hold"
      );
    }

    if (filter === "paid") {
      return orders.filter(
        (o) =>
          o.payment_status === "paid" &&
          o.shipping_status !== "shipped"
      );
    }

    if (filter === "shipped") {
      return orders.filter(
        (o) => o.shipping_status === "shipped"
      );
    }

    return orders;
  }, [orders, filter]);

  if (loading) return <p>Loading orders…</p>;

  return (
    <div style={{ display: "grid", gap: 32 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>
          Orders
        </h1>
        <p style={{ opacity: 0.6 }}>
          Review payments and manage fulfillment
        </p>
      </header>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <FilterBtn label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterBtn label="Needs Review" active={filter === "needs_review"} onClick={() => setFilter("needs_review")} />
        <FilterBtn label="Paid" active={filter === "paid"} onClick={() => setFilter("paid")} />
        <FilterBtn label="Shipped" active={filter === "shipped"} onClick={() => setFilter("shipped")} />
      </div>

      {/* LIST */}
      {visibleOrders.length === 0 ? (
        <div className="card">No orders found.</div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {visibleOrders.map((o) => {
            const needsReview = o.payment_status === "on_hold";
            const paidAwaitingShipment =
              o.payment_status === "paid" &&
              o.shipping_status !== "shipped";

            return (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                style={{
                  padding: 22,
                  borderRadius: 18,
                  background: "#ffffff",
                  border: needsReview
                    ? "2px solid #f59e0b"
                    : "1px solid rgba(0,0,0,0.08)",
                  boxShadow:
                    "0 12px 30px rgba(15,23,42,0.08)",
                  textDecoration: "none",
                  display: "grid",
                  gap: 10,
                  transition: "transform .15s ease",
                }}
              >
                {/* TOP ROW */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      Order #{o.id.slice(0, 8)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.6,
                        marginTop: 2,
                      }}
                    >
                      {new Date(
                        o.created_at
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                    }}
                  >
                    {fmtM(o.total_amount)}
                  </div>
                </div>

                {/* EMAIL */}
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  {o.user_email}
                </div>

                {/* STATUS BADGES */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatusBadge
                    type="payment"
                    status={o.payment_status}
                  />

                  <StatusBadge
                    type="shipping"
                    status={o.shipping_status}
                  />
                </div>

                {/* PRIORITY FLAGS */}
                {needsReview && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#92400e",
                    }}
                  >
                    ⚠ Payment proof uploaded — review required
                  </div>
                )}

                {paidAwaitingShipment && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#065f46",
                    }}
                  >
                    ✔ Payment approved — ready to ship
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
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
  type: "payment" | "shipping";
  status: string | null;
}) {
  let bg = "#f3f4f6";
  let text = "#374151";
  let label = "Unknown";

  if (type === "payment") {
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
  }

  if (type === "shipping") {
    if (!status) {
      label = "Not Shipped";
    } else if (status === "processing") {
      bg = "#e0f2fe";
      text = "#075985";
      label = "Processing";
    } else if (status === "shipped") {
      bg = "#dbeafe";
      text = "#1e40af";
      label = "Shipped";
    } else if (status === "delivered") {
      bg = "#dcfce7";
      text = "#166534";
      label = "Delivered";
    } else {
      label = status;
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

/* ======================
   FILTER BUTTON
====================== */

function FilterBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 999,
        fontWeight: 800,
        border: "none",
        cursor: "pointer",
        background: active ? "#111827" : "#e5e7eb",
        color: active ? "#fff" : "#000",
      }}
    >
      {label}
    </button>
  );
}
