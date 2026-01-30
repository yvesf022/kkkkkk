"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Payment = {
  id: string;
  amount: number;
  status: "initiated" | "proof_submitted" | "approved" | "rejected";
};

export default function AdminAnalytics() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/payments/admin`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
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
    (p) => p.status === "proof_submitted"
  );

  const approvedPayments = payments.filter(
    (p) => p.status === "approved"
  );

  const revenue = approvedPayments.reduce(
    (sum, p) => sum + p.amount,
    0
  );

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 18,
      }}
    >
      <Stat
        label="Total Payments"
        value={totalPayments}
      />

      <Stat
        label="Pending Reviews"
        value={pendingPayments.length}
        highlight
      />

      <Stat
        label="Approved Revenue"
        value={`₹${revenue}`}
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
  value: any;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight ? "#0f172a" : "#ffffff",
        color: highlight ? "#ffffff" : "#0f172a",
        borderRadius: 18,
        padding: 20,
        border: highlight
          ? "none"
          : "1px solid #e5e7eb",
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
