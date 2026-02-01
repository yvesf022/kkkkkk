"use client";

import Link from "next/link";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

/**
 * ADMIN DASHBOARD PAGE — AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - This page assumes ADMIN auth is already validated
 * - Auth is enforced by:
 *   - middleware.ts
 *   - app/admin/layout.tsx
 *   - app/admin/(dashboard)/layout.tsx
 *
 * FRONTEND RULE:
 * - This page is PRESENTATIONAL ONLY
 * - No auth logic
 * - No API calls
 */

export default function AdminDashboardPage() {
  return (
    <div style={{ display: "grid", gap: 32 }}>
      {/* HEADER */}
      <header>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: -0.5,
          }}
        >
          Admin Dashboard
        </h1>

        <p
          style={{
            marginTop: 6,
            opacity: 0.65,
            maxWidth: 720,
          }}
        >
          Operational overview of orders, payments, and inventory.
          Review pending actions and manage the store lifecycle.
        </p>
      </header>

      {/* ANALYTICS */}
      <section>
        <AdminAnalytics />
      </section>

      {/* PRIMARY OPERATIONS */}
      <section>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 900,
            marginBottom: 14,
          }}
        >
          Priority Actions
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          <ActionCard
            title="Orders"
            description="Review new orders, update statuses, and manage fulfillment."
            href="/admin/orders"
            tone="dark"
          />

          <ActionCard
            title="Payments"
            description="Approve or reject uploaded payment proofs."
            href="/admin/payments"
            tone="warning"
          />
        </div>
      </section>

      {/* MANAGEMENT */}
      <section>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 900,
            marginBottom: 14,
          }}
        >
          Management
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <ActionCard
            title="Products"
            description="Manage catalog, pricing, and stock levels."
            href="/admin/products"
            tone="light"
          />

          <ActionCard
            title="Reports"
            description="View sales summaries and operational insights."
            href="/admin/reports"
            tone="light"
          />
        </div>
      </section>
    </div>
  );
}

/* =========================
   ACTION CARD (PURE)
========================= */

function ActionCard({
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
  const styles =
    tone === "dark"
      ? {
          background: "#0f172a",
          color: "#ffffff",
          border: "none",
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
        };

  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 24,
        borderRadius: 22,
        textDecoration: "none",
        boxShadow: "0 12px 30px rgba(15,23,42,0.10)",
        transition: "transform .15s ease",
        ...styles,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900 }}>
        {title}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 14,
          opacity: 0.85,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </Link>
  );
}
