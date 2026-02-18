"use client";

import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

export default function OrdersAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [conversion, setConversion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [a, r, c] = await Promise.all([
        fetch(`${API_BASE}/api/admin/orders/analytics`, { credentials: "include" }).then(res => res.json()),
        fetch(`${API_BASE}/api/admin/orders/revenue`, { credentials: "include" }).then(res => res.json()),
        fetch(`${API_BASE}/api/admin/orders/conversion`, { credentials: "include" }).then(res => res.json()),
      ]);

      setAnalytics(a);
      setRevenue(r);
      setConversion(c);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  if (loading) return <div>Loading...</div>;
  if (!analytics) return <div>No analytics data</div>;

  return (
    <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 40 }}>

      <h1>Orders Analytics</h1>

      {/* METRICS GRID */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
        gap: 20
      }}>
        <MetricCard title="Total Orders" value={analytics.total_orders} />
        <MetricCard title="Completed Orders" value={analytics.completed_orders} />
        <MetricCard title="Cancelled Orders" value={analytics.cancelled_orders} />
        <MetricCard title="Average Order Value" value={fmt(analytics.avg_order_value)} />
      </div>

      {/* REVENUE BY STATUS */}
      <div style={{ border: "1px solid #ddd", padding: 30 }}>
        <h3>Revenue by Status</h3>

        {revenue?.by_status?.map((s: any, i: number) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "6px 0",
            borderBottom: "1px solid #eee"
          }}>
            <span>{s.status}</span>
            <strong>{fmt(s.amount)}</strong>
          </div>
        ))}
      </div>

      {/* CONVERSION FUNNEL */}
      <div style={{ border: "1px solid #ddd", padding: 30 }}>
        <h3>Conversion Funnel</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <FunnelRow label="Visitors" value={conversion?.visitors} />
          <FunnelRow label="Add To Cart" value={conversion?.add_to_cart} />
          <FunnelRow label="Checkout" value={conversion?.checkout_started} />
          <FunnelRow label="Paid Orders" value={conversion?.paid_orders} />
        </div>

        <div style={{ marginTop: 15 }}>
          <strong>Conversion Rate:</strong> {conversion?.conversion_rate || 0}%
        </div>
      </div>

      {/* ORDER STATUS DISTRIBUTION */}
      <div style={{ border: "1px solid #ddd", padding: 30 }}>
        <h3>Order Status Distribution</h3>

        {analytics.status_distribution?.map((s: any, i: number) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8
          }}>
            <span>{s.status}</span>
            <strong>{s.count}</strong>
          </div>
        ))}
      </div>

    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: any }) {
  return (
    <div style={{
      border: "1px solid #ddd",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }}>
      <span style={{ fontSize: 13, color: "#666" }}>{title}</span>
      <span style={{ fontSize: 22, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function FunnelRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      borderBottom: "1px solid #eee",
      paddingBottom: 4
    }}>
      <span>{label}</span>
      <strong>{value || 0}</strong>
    </div>
  );
}
