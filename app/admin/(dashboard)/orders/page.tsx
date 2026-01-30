"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

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

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  /* ======================
     AUTH GUARD
  ====================== */
  useEffect(() => {
    if (!token) {
      router.replace("/admin/login");
    }
  }, [token, router]);

  /* ======================
     LOAD ORDERS (ADMIN)
  ====================== */
  async function load() {
    try {
      const res = await fetch(`${API}/api/orders/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
        (o) => o.payment_status === "payment_received"
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
    <div style={{ display: "grid", gap: 24 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Orders
        </h1>
        <p style={{ opacity: 0.6 }}>
          Manage payments and shipping
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
          label="Needs review"
          active={filter === "needs_review"}
          onClick={() => setFilter("needs_review")}
        />
        <FilterBtn
          label="Paid"
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
          {visibleOrders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="card"
              style={{
                display: "grid",
                gap: 6,
                textDecoration: "none",
              }}
            >
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
                  M{o.total_amount.toLocaleString()}
                </strong>
              </div>

              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {o.user_email}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  fontSize: 13,
                }}
              >
                <span>
                  Payment: <b>{o.payment_status}</b>
                </span>
                <span>
                  Shipping: <b>{o.shipping_status}</b>
                </span>
              </div>

              {o.payment_status === "payment_submitted" && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#92400e",
                    fontWeight: 700,
                  }}
                >
                  ⚠ Needs payment review
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================
   UI
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
