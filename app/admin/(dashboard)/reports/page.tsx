"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Order = {
  id: string;
  total_amount: number;
  payment_status: string;
  shipping_status: string;
  created_at: string;
};

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/orders/admin`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setOrders)
      .catch(() =>
        toast.error("Failed to load reports")
      )
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.payment_status === "payment_received")
      .reduce((sum, o) => sum + o.total_amount, 0);

    const pendingPayments = orders.filter(
      (o) => o.payment_status === "payment_submitted"
    ).length;

    const shipped = orders.filter(
      (o) => o.shipping_status === "shipped"
    ).length;

    return {
      totalOrders: orders.length,
      totalRevenue,
      pendingPayments,
      shipped,
    };
  }, [orders]);

  if (loading) return <p>Loading reports…</p>;

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Reports & Insights
        </h1>
        <p style={{ opacity: 0.6 }}>
          Business performance overview
        </p>
      </header>

      {/* KPIs */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
          gap: 18,
        }}
      >
        <Stat
          label="Total Orders"
          value={stats.totalOrders}
        />
        <Stat
          label="Revenue"
          value={`M${stats.totalRevenue.toLocaleString()}`}
        />
        <Stat
          label="Pending Payments"
          value={stats.pendingPayments}
        />
        <Stat
          label="Orders Shipped"
          value={stats.shipped}
        />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          opacity: 0.6,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 26,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}
