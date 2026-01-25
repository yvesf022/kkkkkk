"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Order = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "Awaiting Payment", color: "#f59e0b" },
    payment_submitted: { label: "Under Review", color: "#3b82f6" },
    confirmed: { label: "Confirmed", color: "#22c55e" },
    rejected: { label: "Rejected", color: "#ef4444" },
  };

  const s = map[status] || {
    label: status,
    color: "#64748b",
  };

  return (
    <span
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        color: "#fff",
        background: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    fetch(`${API}/api/orders/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "grid", gap: 26 }}>
      {/* HEADER */}
      <section
        style={{
          borderRadius: 24,
          padding: 24,
          background:
            "linear-gradient(135deg,#f8fbff,#eef6ff)",
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>
          My Orders
        </h1>
        <p style={{ marginTop: 6, color: "rgba(15,23,42,0.6)" }}>
          Track the status of your purchases
        </p>
      </section>

      {/* CONTENT */}
      {loading && <p>Loading orders…</p>}

      {!loading && orders.length === 0 && (
        <section>
          <p>You have no orders yet.</p>
          <Link href="/store" className="btn btnTech">
            Start Shopping
          </Link>
        </section>
      )}

      {!loading &&
        orders.map((o) => (
          <section
            key={o.id}
            style={{
              borderRadius: 22,
              padding: 20,
              background:
                "linear-gradient(135deg,#ffffff,#f8fbff)",
              boxShadow:
                "0 18px 50px rgba(15,23,42,0.14)",
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>
                  Order #{o.id.slice(0, 8)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(15,23,42,0.6)",
                  }}
                >
                  {new Date(o.created_at).toLocaleString()}
                </div>
              </div>

              <StatusBadge status={o.status} />
            </div>

            <div style={{ fontWeight: 800 }}>
              Total: M {o.total_amount.toLocaleString("en-ZA")}
            </div>

            {o.status === "rejected" && (
              <Link
                href={`/checkout?order=${o.id}`}
                className="btn btnTech"
              >
                Re-submit Payment
              </Link>
            )}
          </section>
        ))}
    </div>
  );
}
