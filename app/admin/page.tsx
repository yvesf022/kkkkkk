"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

export default function AdminDashboardPage() {
  return (
    <RequireAuth role="admin">
      <div style={{ display: "grid", gap: 32 }}>
        {/* HEADER */}
        <header>
          <h1 style={{ fontSize: 30, fontWeight: 900 }}>
            Admin Dashboard
          </h1>
          <p style={{ marginTop: 6, opacity: 0.6 }}>
            Overview of store activity
          </p>
        </header>

        {/* ANALYTICS */}
        <AdminAnalytics />

        {/* QUICK ACTIONS */}
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 22,
          }}
        >
          <h2 style={{ fontWeight: 900 }}>
            Quick Actions
          </h2>

          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <a href="/admin/orders" className="btn btnTech">
              Manage Orders
            </a>
            <a href="/admin/products" className="btn btnGhost">
              Manage Products
            </a>
            <a href="/admin/payment-settings" className="btn btnGhost">
              Payment Settings
            </a>
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}
