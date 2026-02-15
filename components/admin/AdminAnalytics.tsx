"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/currency";
import { paymentsApi } from "@/lib/api";
import type { Payment } from "@/lib/types";

/**
 * ADMIN ANALYTICS — AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - GET /api/payments/admin
 * - PaymentStatus = "pending" | "paid" | "rejected"
 * - Proof upload does NOT change status
 *
 * FRONTEND RULE:
 * - Analytics only
 * - No auth logic
 * - Use shared API client
 */

export default function AdminAnalytics() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsApi
      .adminList()
      .then(setPayments)
      .catch(() => {
        toast.error("Failed to load admin analytics");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p>Loading analytics…</p>;
  }

  const totalPayments = payments.length;

  const pendingPayments = payments.filter(
    (p) => p.status === "pending",
  );

  const approvedPayments = payments.filter(
    (p) => p.status === "paid",
  );

  const revenue = approvedPayments.reduce(
    (sum, p) => sum + p.amount,
    0,
  );

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 18,
      }}
    >
      <Stat label="Total Payments" value={totalPayments} />

      <Stat
        label="Pending Reviews"
        value={pendingPayments.length}
        highlight
      />

      <Stat
        label="Approved Revenue"
        value={revenue.toLocaleDateString("en-ZA")}
      />

      <Stat
        label="Approved Payments"
        value={approvedPayments.length}
      />
    </section>
  );
}

/* =========================
   INTERNAL COMPONENT
========================= */

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight ? "#0f172a" : "#ffffff",
        color: highlight ? "#ffffff" : "#0f172a",
        borderRadius: 18,
        padding: 20,
        border: highlight ? "none" : "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 13,
          opacity: highlight ? 0.8 : 0.6,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 28,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}
