"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi, adminAuthApi, ordersApi, paymentsApi } from "@/lib/api";

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
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [dashData, ordersData, paymentsData, lowStockData] = await Promise.allSettled([
          adminApi.getDashboard(),
          ordersApi.getAdmin(),
          paymentsApi.adminList("pending"),
          adminApi.getLowStock(),
        ]);

        if (dashData.status === "fulfilled") setStats(dashData.value as DashboardStats);
        if (ordersData.status === "fulfilled") setRecentOrders((ordersData.value as any[]).slice(0, 5));
        if (paymentsData.status === "fulfilled") setPendingPayments((paymentsData.value as any[]).slice(0, 5));
        if (lowStockData.status === "fulfilled") setLowStock((lowStockData.value as any[]).slice(0, 5));
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await adminAuthApi.logout();
    } finally {
      router.replace("/admin/login");
    }
  }

  if (loading) return <div style={{ padding: 32, color: "#64748b" }}>Loading dashboard...</div>;
  if (error || !stats) return <div style={{ padding: 32, color: "#ef4444" }}>{error ?? "Unable to load dashboard."}</div>;

  return (
    <div style={{ maxWidth: 1200 }}>

      {/* HEADER */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Overview of your store performance</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            padding: "9px 20px",
            borderRadius: 8,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#dc2626",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard title="Total Revenue" value={`R ${fmt(stats.total_revenue)}`} link="/admin/analytics" color="#0f172a" />
        <StatCard title="This Month" value={`R ${fmt(stats.revenue_this_month)}`} link="/admin/analytics/revenue" color="#0033a0" />
        <StatCard title="Total Orders" value={fmt(stats.total_orders)} link="/admin/orders" color="#0f172a" />
        <StatCard title="Pending Payments" value={fmt(stats.pending_payments)} link="/admin/payments" color="#dc2626" alert={stats.pending_payments > 0} />
        <StatCard title="Active Products" value={fmt(stats.active_products)} link="/admin/products" color="#166534" />
        <StatCard title="Low Stock" value={fmt(stats.low_stock_products)} link="/admin/inventory" color="#92400e" alert={stats.low_stock_products > 0} />
      </div>

      {/* QUICK ACTIONS */}
      <div style={card}>
        <h3 style={sectionTitle}>Quick Actions</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "+ Add Product", href: "/admin/products/new" },
            { label: "Bulk Upload CSV", href: "/admin/products/bulk-upload" },
            { label: "Review Payments", href: "/admin/payments" },
            { label: "View Orders", href: "/admin/orders" },
            { label: "Inventory", href: "/admin/inventory" },
            { label: "Analytics", href: "/admin/analytics" },
            { label: "Users", href: "/admin/users" },
            { label: "Store Settings", href: "/admin/settings" },
          ].map((a) => (
            <Link key={a.href} href={a.href} style={actionBtn}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* BOTTOM GRID: Recent Orders + Pending Payments + Low Stock */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 16 }}>

        {/* RECENT ORDERS */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={sectionTitle}>Recent Orders</h3>
            <Link href="/admin/orders" style={viewAll}>View all</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p style={empty}>No orders yet.</p>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o: any) => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={td}>
                      <Link href={`/admin/orders/${o.id}`} style={{ color: "#3b82f6", fontSize: 12 }}>
                        #{o.id?.slice(0, 8)}
                      </Link>
                    </td>
                    <td style={td}>R {fmt(o.total_amount)}</td>
                    <td style={td}>
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PENDING PAYMENTS */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={sectionTitle}>Pending Payments</h3>
            <Link href="/admin/payments" style={viewAll}>View all</Link>
          </div>
          {pendingPayments.length === 0 ? (
            <p style={empty}>No pending payments.</p>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...td, fontSize: 12 }}>#{p.id?.slice(0, 8)}</td>
                    <td style={td}>R {fmt(p.amount)}</td>
                    <td style={td}>
                      <Link href={`/admin/payments/${p.id}`} style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* LOW STOCK */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={sectionTitle}>Low Stock Alert</h3>
            <Link href="/admin/inventory" style={viewAll}>View all</Link>
          </div>
          {lowStock.length === 0 ? (
            <p style={empty}>All products are well stocked.</p>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Product</th>
                  <th style={th}>Stock</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...td, fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title}
                    </td>
                    <td style={td}>
                      <span style={{ color: "#dc2626", fontWeight: 700 }}>{p.stock}</span>
                    </td>
                    <td style={td}>
                      <Link href={`/admin/products/${p.id}`} style={{ color: "#3b82f6", fontSize: 12 }}>
                        Restock
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, link, color, alert }: {
  title: string; value: string; link: string; color: string; alert?: boolean;
}) {
  return (
    <Link href={link} style={{
      textDecoration: "none",
      background: alert ? "#fef2f2" : "#ffffff",
      border: `1px solid ${alert ? "#fecaca" : "#e2e8f0"}`,
      borderRadius: 12,
      padding: 20,
      display: "block",
      transition: "all 0.15s ease",
    }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>
        {value}
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    pending:   { bg: "#fef9c3", color: "#854d0e" },
    paid:      { bg: "#dcfce7", color: "#166534" },
    shipped:   { bg: "#dbeafe", color: "#1e40af" },
    completed: { bg: "#f0fdf4", color: "#166534" },
    cancelled: { bg: "#fee2e2", color: "#991b1b" },
  };
  const c = colors[status] ?? { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#0f172a",
  margin: 0,
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const viewAll: React.CSSProperties = {
  fontSize: 13,
  color: "#3b82f6",
  textDecoration: "none",
};

const actionBtn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
  display: "inline-block",
};

const empty: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  textAlign: "center",
  padding: "20px 0",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const th: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0",
};

const td: React.CSSProperties = {
  padding: "8px 8px",
  fontSize: 13,
};