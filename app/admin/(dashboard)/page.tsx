"use client";

import Link from "next/link";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

/**
 * ADMIN DASHBOARD — OPERATIONAL CONTROL CENTER
 *
 * RULES:
 * - No new API calls here
 * - No analytics noise
 * - Only operational shortcuts
 * - Fully aligned with backend routes
 */

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-10">

      {/* HEADER */}
      <header>
        <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
        <p className="opacity-60 mt-2 max-w-2xl">
          Operational overview of orders, payments, products, and store configuration.
        </p>
      </header>

      {/* PAYMENT OVERVIEW (SAFE + REAL DATA) */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border">
        <AdminAnalytics />
      </section>

      {/* OPERATIONS */}
      <SectionTitle title="Core Operations" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        <Card
          title="Orders"
          desc="Review, manage and fulfill customer orders."
          href="/admin/orders"
        />

        <Card
          title="Payments"
          desc="Review payment proofs and manage verifications."
          href="/admin/payments"
        />

        <Card
          title="Products"
          desc="Manage catalog, pricing, stock and status."
          href="/admin/products"
        />

      </div>

      {/* PRODUCT TOOLS */}
      <SectionTitle title="Product Management Tools" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        <Card
          title="Bulk Upload"
          desc="Upload products in bulk via CSV."
          href="/admin/products/bulk-upload"
        />

        <Card
          title="Reports"
          desc="View store performance and sales reports."
          href="/admin/reports"
        />

        <Card
          title="Bank Settings"
          desc="Configure bank and mobile money payment details."
          href="/admin/settings/bank"
        />

      </div>

    </div>
  );
}

/* ===================== */

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-xl font-bold mt-6">
      {title}
    </h2>
  );
}

/* ===================== */

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
    >
      <div className="text-lg font-bold">{title}</div>
      <div className="text-sm opacity-60 mt-2">{desc}</div>
    </Link>
  );
}
