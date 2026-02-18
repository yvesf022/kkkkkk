"use client";

import Link from "next/link";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

/**
 * ENTERPRISE ADMIN DASHBOARD
 * - Clean
 * - Structured
 * - Operational
 * - No extra analytics noise
 * - Matches your backend structure
 */

export default function AdminDashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

      {/* HEADER */}
      <header>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 900,
            marginBottom: 8,
            letterSpacing: -0.5,
          }}
        >
          Admin Dashboard
        </h1>

        <p
          style={{
            opacity: 0.65,
            maxWidth: 700,
            lineHeight: 1.6,
          }}
        >
          Operational control center for orders, payments,
          products, reports and store configuration.
        </p>
      </header>

      {/* PAYMENT ANALYTICS */}
      <section
        style={{
          background: "#ffffff",
          padding: 28,
          borderRadius: 24,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 50px rgba(15,23,42,0.06)",
        }}
      >
        <AdminAnalytics />
      </section>

      {/* CORE OPERATIONS */}
      <SectionTitle title="Core Operations" />

      <div style={gridStyle}>
        <Card
          title="Orders"
          description="Review, update status and manage fulfillment."
          href="/admin/orders"
          tone="dark"
        />

        <Card
          title="Payments"
          description="Approve or reject uploaded payment proofs."
          href="/admin/payments"
          tone="warning"
        />

        <Card
          title="Products"
          description="Manage catalog, pricing, stock and visibility."
          href="/admin/products"
          tone="light"
        />
      </div>

      {/* MANAGEMENT TOOLS */}
      <SectionTitle title="Management Tools" />

      <div style={gridStyle}>
        <Card
          title="Bulk Upload"
          description="Upload multiple products using CSV."
          href="/admin/products/bulk-upload"
          tone="light"
        />

        <Card
          title="Reports"
          description="View sales summaries and operational insights."
          href="/admin/reports"
          tone="light"
        />

        <Card
          title="Bank Settings"
          description="Configure bank accounts and mobile money."
          href="/admin/settings/bank"
          tone="light"
        />
      </div>

    </div>
  );
}

/* ========================= */

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 24,
};

/* ========================= */

function SectionTitle({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: 22,
        fontWeight: 900,
        marginTop: 10,
      }}
    >
      {title}
    </h2>
  );
}

/* ========================= */

function Card({
  title,
  description,
  href,
  tone,
}: {
  title: string;
  description: string;
  href: string;
  tone: "dark" | "warning" | "light";
}) {

  const base: React.CSSProperties = {
    display: "block",
    padding: 26,
    borderRadius: 24,
    textDecoration: "none",
    transition: "all .25s ease",
  };

  const styles =
    tone === "dark"
      ? {
          background: "#0f172a",
          color: "#ffffff",
          boxShadow: "0 18px 50px rgba(15,23,42,0.2)",
        }
      : tone === "warning"
      ? {
          background: "linear-gradient(135deg,#fff7ed,#ffedd5)",
          color: "#9a3412",
          border: "1px solid #fed7aa",
        }
      : {
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
        };

  return (
    <Link
      href={href}
      style={{ ...base, ...styles }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow =
          "0 30px 80px rgba(15,23,42,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          tone === "dark"
            ? "0 18px 50px rgba(15,23,42,0.2)"
            : "0 10px 30px rgba(15,23,42,0.05)";
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 14,
          opacity: 0.85,
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
    </Link>
  );
}
