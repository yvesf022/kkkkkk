"use client";

import AdminAnalytics from "@/components/admin/AdminAnalytics";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          Dashboard Overview
        </h1>
        <p style={{ marginTop: 4, opacity: 0.6 }}>
          Monitor orders, payments, and inventory health
        </p>
      </header>

      {/* ANALYTICS */}
      <AdminAnalytics />

      {/* OPERATIONS GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
        }}
      >
        <ActionCard
          title="Orders"
          description="Review and fulfill customer orders"
          href="/admin/orders"
          primary
        />

        <ActionCard
          title="Payments"
          description="Approve or reject payment proofs"
          href="/admin/payments"
        />

        <ActionCard
          title="Products"
          description="Manage catalog, pricing, and stock"
          href="/admin/products"
        />

        <ActionCard
          title="Payment Settings"
          description="Configure bank and payment options"
          href="/admin/payment-settings"
        />
      </section>
    </div>
  );
}

/* =========================
   INTERNAL COMPONENT
========================= */

function ActionCard({
  title,
  description,
  href,
  primary,
}: {
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 22,
        borderRadius: 20,
        background: primary ? "#0f172a" : "#ffffff",
        color: primary ? "#ffffff" : "#0f172a",
        border: primary ? "none" : "1px solid #e5e7eb",
        textDecoration: "none",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900 }}>
        {title}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 14,
          opacity: primary ? 0.85 : 0.6,
        }}
      >
        {description}
      </div>
    </Link>
  );
}
