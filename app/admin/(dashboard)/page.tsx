"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

export default function AdminDashboardPage() {
  const [core, setCore] = useState<any>(null);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [deadStock, setDeadStock] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboard(),
      adminApi.getRevenueAnalytics(),
      adminApi.getTopProducts(),
      adminApi.getDeadStock(),
      adminApi.getLowStock(),
    ])
      .then(([coreData, revenueData, topData, deadData, lowData]) => {
        setCore(coreData);
        setRevenue(revenueData as any[]);
        setTopProducts(topData as any[]);
        setDeadStock(deadData as any[]);
        setLowStock(lowData as any[]);
      })
      .catch(() => {
        toast.error("Failed to load enterprise analytics");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading Elite Analyticsâ€¦</p>;
  if (!core) return <p>Analytics unavailable.</p>;

  return (
    <div style={{ display: "grid", gap: 40 }}>

      {/* ================= EXECUTIVE SUMMARY ================= */}
      <Section title="Executive Summary">
        <StatsGrid>
          <Stat label="Total Revenue" value={formatCurrency(core.total_revenue)} />
          <Stat label="Revenue This Month" value={formatCurrency(core.revenue_this_month)} />
          <Stat label="Total Orders" value={core.total_orders} />
          <Stat label="Paid Orders" value={core.paid_orders} />
          <Stat label="Active Products" value={core.active_products} />
          <Stat label="Low Stock Products" value={core.low_stock_products} highlight />
        </StatsGrid>
      </Section>

      {/* ================= REVENUE ================= */}
      <Section title="Revenue Trend">
        <DataList
          items={revenue}
          render={(item: any) => (
            <Row
              title={item.date}
              value={formatCurrency(item.revenue)}
              sub={`Orders: ${item.orders}`}
            />
          )}
        />
      </Section>

      {/* ================= TOP PRODUCTS ================= */}
      <Section title="Top Performing Products">
        <DataList
          items={topProducts}
          render={(p: any) => (
            <Row
              title={p.title}
              value={formatCurrency(p.revenue)}
              sub={`Sales: ${p.sales}`}
            />
          )}
        />
      </Section>

      {/* ================= DEAD STOCK ================= */}
      <Section title="Dead Stock">
        <DataList
          items={deadStock}
          render={(p: any) => (
            <Row
              title={p.title}
              value={`Stock: ${p.stock}`}
              danger
            />
          )}
        />
      </Section>

      {/* ================= LOW STOCK ================= */}
      <Section title="Low Stock Alert">
        <DataList
          items={lowStock}
          render={(p: any) => (
            <Row
              title={p.title}
              value={`Stock: ${p.stock}`}
              warning
            />
          )}
        />
      </Section>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Section({ title, children }: any) {
  return (
    <section>
      <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatsGrid({ children }: any) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 20,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, highlight }: any) {
  return (
    <div
      style={{
        background: highlight ? "#0f172a" : "#ffffff",
        color: highlight ? "#ffffff" : "#0f172a",
        padding: 24,
        borderRadius: 20,
        border: highlight ? "none" : "1px solid #e5e7eb",
      }}
    >
      <div style={{ opacity: 0.6, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function DataList({ items, render }: any) {
  if (!items?.length) return <p>No data available.</p>;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((item: any, i: number) => (
        <div key={i}>{render(item)}</div>
      ))}
    </div>
  );
}

function Row({ title, value, sub, danger, warning }: any) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        background: danger
          ? "#fef2f2"
          : warning
          ? "#fff7ed"
          : "#ffffff",
      }}
    >
      <div>
        <div style={{ fontWeight: 800 }}>{title}</div>
        {sub && <div style={{ opacity: 0.6 }}>{sub}</div>}
      </div>
      <div style={{ fontWeight: 800 }}>{value}</div>
    </div>
  );
}

