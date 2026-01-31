"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */

type Payment = {
  id: string;
  order_id: string;
  amount: number;
  status: "initiated" | "proof_submitted" | "approved" | "rejected";
  created_at: string;
};

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  /* ======================
     LOAD PAYMENTS
  ====================== */

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/payments/admin`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error();
      setPayments(await res.json());
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* ======================
     REVIEW PAYMENT
  ====================== */

  async function reviewPayment(
    id: string,
    status: "approved" | "rejected"
  ) {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API}/api/payments/admin/${id}/review`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      if (!res.ok) throw new Error();

      toast.success(
        status === "approved"
          ? "Payment approved"
          : "Payment rejected"
      );

      await load();
    } catch {
      toast.error("Failed to update payment");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading payments…</p>;

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Payments Review
        </h1>
        <p style={{ opacity: 0.6, marginTop: 4 }}>
          Review and approve customer payment proofs
        </p>
      </header>

      {payments.length === 0 && (
        <div className="card">
          No payments found.
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {payments.map((p) => {
          const needsReview =
            p.status === "proof_submitted";

          return (
            <div
              key={p.id}
              className="card"
              style={{
                display: "grid",
                gap: 10,
                border: needsReview
                  ? "2px solid #fed7aa"
                  : "1px solid #e5e7eb",
                background: needsReview
                  ? "#fff7ed"
                  : "#ffffff",
              }}
            >
              {/* TOP */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <strong>
                  Payment #{p.id.slice(0, 8)}
                </strong>
                <strong>
                  {fmtM(p.amount)}
                </strong>
              </div>

              {/* META */}
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.75,
                }}
              >
                Order{" "}
                <Link
                  href={`/admin/orders/${p.order_id}`}
                  style={{
                    fontWeight: 700,
                    textDecoration: "underline",
                  }}
                >
                  #{p.order_id.slice(0, 8)}
                </Link>
              </div>

              {/* STATUS */}
              <div style={{ fontSize: 13 }}>
                Status:{" "}
                <b>{paymentLabel(p.status)}</b>
              </div>

              {/* ACTIONS */}
              {needsReview && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  <button
                    className="btn btnTech"
                    disabled={updating}
                    onClick={() =>
                      reviewPayment(p.id, "approved")
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="btn btnGhost"
                    disabled={updating}
                    onClick={() =>
                      reviewPayment(p.id, "rejected")
                    }
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ======================
   LABEL HELPERS
====================== */

function paymentLabel(status: Payment["status"]) {
  switch (status) {
    case "initiated":
      return "Payment initiated";
    case "proof_submitted":
      return "Proof submitted (needs review)";
    case "approved":
      return "Payment approved";
    case "rejected":
      return "Payment rejected";
    default:
      return status;
  }
}
