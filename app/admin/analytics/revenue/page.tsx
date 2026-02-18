"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function RevenueAnalyticsPage() {
  const [revenue, setRevenue] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const rev = await adminApi.getRevenueAnalytics();
      const ov = await adminApi.getOverviewAnalytics();

      setRevenue(rev);
      setOverview(ov);
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
  if (!revenue) return <div>No revenue data</div>;

  return (
    <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 40 }}>

      <h1>Revenue Analytics</h1>

      {/* TOP METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))", gap: 20 }}>
        <MetricCard title="Total Revenue" value={fmt(revenue.total_revenue)} />
        <MetricCard title="This Month" value={fmt(revenue.revenue_this_month)} />
        <MetricCard title="Orders Count" value={overview?.total_orders || 0} />
        <MetricCard title="Conversion Rate" value={`${overview?.conversion_rate || 0}%`} />
      </div>

      {/* MONTHLY BREAKDOWN */}
      <div style={{ border: "1px solid #ddd", padding: 30 }}>
        <h3>Monthly Revenue Trend</h3>

        {revenue.timeline?.length === 0 && <div>No data</div>}

        {revenue.timeline?.map((point: any, i: number) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>{point.month}</span>
            <strong>{fmt(point.amount)}</strong>
          </div>
        ))}
      </div>

      {/* CHANNEL BREAKDOWN */}
      <div style={{ border: "1px solid #ddd", padding: 30 }}>
        <h3>Revenue Breakdown</h3>

        {revenue.breakdown?.map((b: any, i: number) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span>{b.source}</span>
            <strong>{fmt(b.amount)}</strong>
          </div>
        ))}
      </div>

    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: any }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 25,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 13, color: "#666" }}>{title}</span>
      <span style={{ fontSize: 24, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
