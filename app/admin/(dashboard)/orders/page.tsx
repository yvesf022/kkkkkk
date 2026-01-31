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
  payment_status: string;
  shipping_status: string;
  created_at: string;
};

type Filter =
  | "all"
  | "needs_review"
  | "paid"
  | "shipped";

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  /* ======================
     LOAD ORDERS (ADMIN)
  ====================== */
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/orders/admin`,
        { credentials: "include" } // 🔐 ADMIN COOKIE AUTH
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
        (o) => o.payment_status === "payment_submitted"
      );
    }
    if (filter === "paid") {
      return orders.filter(
        (o) =>
          o.payment_status === "payment_received" &&
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
    <div style={{ display: "grid", gap: 28 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Orders
        </h1>
        <p style={{ opacity: 0.6 }}>
          Review payments and manage fulfillment
        </p>
      </header>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10 }}>
        <FilterBtn
          label="All"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterBtn
          label="Needs payment review"
          active={filter === "needs_review"}
          onClick={() => setFilter("needs_review")}
        />
        <FilterBtn
          label="Paid (awaiting shipment)"
          active={filter === "paid"}
          onClick={() => setFilter("paid")}
        />
        <FilterBtn
          label="Shipped"
          active={filter === "shipped"}
          onClick={() => setFilter("shipped")}
        />
      </div>

      {/* LIST */}
      {visibleOrders.length === 0 ? (
        <div className="card">No orders found.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {visibleOrders.map((o) => {
            const needsReview =
              o.payment_status === "payment_submitted";

            const paid =
              o.payment_status === "payment_received";

            return (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="card"
                style={{
                  display: "grid",
                  gap: 8,
                  textDecoration: "none",
                  border:
                    needsReview
                      ? "2px solid #fed7aa"
                      : "1px solid #e5e7eb",
                  background: needsReview
                    ? "#fff7ed"
                    : "#ffffff",
                }}
              >
                {/* TOP ROW */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <strong>
                    Order #{o.id.slice(0, 8)}
                  </strong>

                  <strong>
                    {fmtM(o.total_amount)}
                  </strong>
                </div>

                {/* META */}
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.75,
                  }}
                >
                  {o.user_email}
                </div>

                {/* STATUS */}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    fontSize: 13,
                  }}
                >
                  <span>
                    Payment:{" "}
                    <b>{paymentLabel(o.payment_status)}</b>
                  </span>

                  <span>
                    Shipping:{" "}
                    <b>{shippingLabel(o.shipping_status)}</b>
                  </span>
                </div>

                {/* PRIORITY FLAG */}
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

                {paid &&
                  o.shipping_status !== "shipped" && (
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
   HELPERS
====================== */

function paymentLabel(status: string) {
  switch (status) {
    case "payment_submitted":
      return "Payment submitted";
    case "payment_received":
      return "Payment approved";
    case "rejected":
      return "Payment rejected";
    default:
      return status;
  }
}

function shippingLabel(status: string) {
  if (!status) return "Not shipped";
  if (status === "shipped") return "Shipped";
  if (status === "delivered") return "Delivered";
  return status;
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
      className="btn"
      style={{
        fontWeight: 700,
        background: active
          ? "var(--primary)"
          : "#e5e7eb",
        color: active ? "#fff" : "#000",
      }}
    >
      {label}
    </button>
  );
}
