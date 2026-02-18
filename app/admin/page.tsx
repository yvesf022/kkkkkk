"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";

type DashboardStats = {
  total_products: number;
  active_products: number;
  total_orders: number;
  paid_orders: number;
  pending_payments: number;
  low_stock_products: number;
  total_revenue: number;
  revenue_this_month: number;
};

function fmt(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString();
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await adminApi.getDashboard();
        setStats(data as DashboardStats);
      } catch (err) {
        console.error("Failed to load dashboard", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32, color: "#64748b" }}>Loading dashboard...</div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ padding: 32, color: "#ef4444" }}>
        {error ?? "Unable to load dashboard."}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Dashboard
        </h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          Overview of your store performance
        </p>
      </div>

      {/* Stat Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 20,
        }}
      >
        <StatCard
          title="Total Revenue"
          value={`R ${fmt(stats.total_revenue)}`}
          link="/admin/analytics"
        />
        <StatCard
          title="Revenue This Month"
          value={`R ${fmt(stats.revenue_this_month)}`}
          link="/admin/analytics/revenue"
        />
        <StatCard
          title="Total Orders"
          value={fmt(stats.total_orders)}
          link="/admin/orders"
        />
        <StatCard
          title="Pending Payments"
          value={fmt(stats.pending_payments)}
          link="/admin/payments"
        />
        <StatCard
          title="Active Products"
          value={fmt(stats.active_products)}
          link="/admin/products"
        />
        <StatCard
          title="Low Stock"
          value={fmt(stats.low_stock_products)}
          link="/admin/inventory"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  link,
}: {
  title: string;
  value: string;
  link: string;
}) {
  return (
    <Link
      href={link}
      style={{
        textDecoration: "none",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 20,
        display: "block",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        {value}
      </div>
    </Link>
  );
}