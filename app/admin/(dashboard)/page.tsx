"use client";

import Link from "next/link";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

/**
 * ADMIN DASHBOARD PAGE — AUTHORITATIVE (UPGRADED UI)
 *
 * RULES:
 * - Presentational only
 * - No auth logic
 * - No API calls
 */

export default function AdminDashboardPage() {
  return (
    <div style={{ display: "grid", gap: 40 }}>
      {/* HEADER */}
      <header>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: -0.5,
          }}
        >
          Admin Dashboard
        </h1>

        <p
          style={{
            marginTop: 8,
            opacity: 0.65,
            maxWidth: 720,
            lineHeight: 1.6,
          }}
        >
          Operational overview of orders, payments, inventory,
          and payment infrastructure.
        </p>
      </header>

      {/* ANALYTICS */}
      <section
        style={{
          padding: 24,
          borderRadius: 24,
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
          border: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        <AdminAnalytics />
      </section>

      {/* PRIORITY ACTIONS */}
      <section>
        <SectionTitle title="Priority Actions" />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          <ActionCard
            title="Orders"
            description="Review new orders, update statuses, and manage fulfillment workflows."
            href="/admin/orders"
            tone="dark"
          />

          <ActionCard
            title="Payments"
            description="Approve or reject uploaded payment proofs and manage verification."
            href="/admin/payments"
            tone="warning"
          />
        </div>
      </section>

      {/* MANAGEMENT */}
      <section>
        <SectionTitle title="Management" />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          <ActionCard
            title="Products"
            description="Manage catalog, pricing, stock levels, and bulk uploads."
            href="/admin/products"
            tone="light"
          />

          <ActionCard
            title="Bank Settings"
            description="Configure bank accounts, mobile money details, and QR codes for customer payments."
            href="/admin/settings/bank"
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
   SECTION TITLE
========================= */

function SectionTitle({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: 22,
        fontWeight: 900,
        marginBottom: 18,
      }}
    >
      {title}
    </h2>
  );
}

/* =========================
   ACTION CARD
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
  const base = {
    display: "block",
    padding: 26,
    borderRadius: 24,
    textDecoration: "none",
    boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
    transition: "all .2s ease",
  } as React.CSSProperties;

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
        ...base,
        ...styles,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow =
          "0 28px 70px rgba(15,23,42,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 18px 50px rgba(15,23,42,0.12)";
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
