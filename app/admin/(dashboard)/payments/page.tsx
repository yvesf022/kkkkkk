"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { paymentsApi } from "@/lib/api";

/* ======================
   TYPES
====================== */

type Payment = {
  id: string;
  order_id: string;
  amount: number;
  status: "pending" | "on_hold" | "paid" | "rejected";
  created_at: string;
  proof?: {
    file_url: string;
  } | null;
};

/* ======================
   MALOTI FORMAT
====================== */

const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

/* ======================
   PAGE
====================== */

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await paymentsApi.adminList();
      setPayments(data as Payment[]);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function reviewPayment(
    id: string,
    action: "approve" | "reject"
  ) {
    setUpdatingId(id);

    try {
      const status =
        action === "approve" ? "paid" : "rejected";

      await paymentsApi.review(id, status);

      toast.success(
        status === "paid"
          ? "Payment approved"
          : "Payment rejected"
      );

      await load();
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <p>Loading payments…</p>;

  return (
    <div style={{ display: "grid", gap: 32 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>
          Payments Review
        </h1>
        <p style={{ opacity: 0.6 }}>
          Approve or reject uploaded payment proofs
        </p>
      </header>

      {payments.length === 0 && (
        <div className="card">No payments found.</div>
      )}

      <div style={{ display: "grid", gap: 18 }}>
        {payments.map((p) => {
          const needsReview = p.status === "on_hold";

          return (
            <div
              key={p.id}
              style={{
                padding: 22,
                borderRadius: 18,
                background: "#ffffff",
                border: needsReview
                  ? "2px solid #f59e0b"
                  : "1px solid rgba(0,0,0,0.08)",
                boxShadow:
                  "0 12px 30px rgba(15,23,42,0.08)",
                display: "grid",
                gap: 14,
              }}
            >
              {/* TOP ROW */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>
                    Payment #{p.id.slice(0, 8)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.6,
                      marginTop: 2,
                    }}
                  >
                    {new Date(
                      p.created_at
                    ).toLocaleString()}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  {fmtM(p.amount)}
                </div>
              </div>

              {/* ORDER LINK */}
              <div style={{ fontSize: 14 }}>
                Order{" "}
                <Link
                  href={`/admin/orders/${p.order_id}`}
                  style={{
                    fontWeight: 800,
                    textDecoration: "underline",
                  }}
                >
                  #{p.order_id.slice(0, 8)}
                </Link>
              </div>

              {/* STATUS BADGE */}
              <StatusBadge status={p.status} />

              {/* PROOF */}
              {p.proof?.file_url && (
                <a
                  href={p.proof.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#2563eb",
                    textDecoration: "underline",
                  }}
                >
                  View Payment Proof
                </a>
              )}

              {/* ACTIONS */}
              {needsReview && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                  }}
                >
                  <button
                    disabled={updatingId === p.id}
                    onClick={() =>
                      reviewPayment(p.id, "approve")
                    }
                    style={approveBtn}
                  >
                    {updatingId === p.id
                      ? "Processing..."
                      : "Approve"}
                  </button>

                  <button
                    disabled={updatingId === p.id}
                    onClick={() =>
                      reviewPayment(p.id, "reject")
                    }
                    style={rejectBtn}
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
   STATUS BADGE
====================== */

function StatusBadge({
  status,
}: {
  status: "pending" | "on_hold" | "paid" | "rejected";
}) {
  let bg = "#f3f4f6";
  let text = "#374151";
  let label = status;

  if (status === "pending") {
    bg = "#fef3c7";
    text = "#92400e";
    label = "Pending";
  }

  if (status === "on_hold") {
    bg = "#ffedd5";
    text = "#c2410c";
    label = "Awaiting Review";
  }

  if (status === "paid") {
    bg = "#dcfce7";
    text = "#166534";
    label = "Approved";
  }

  if (status === "rejected") {
    bg = "#fee2e2";
    text = "#991b1b";
    label = "Rejected";
  }

  return (
    <span
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: bg,
        color: text,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

/* ======================
   BUTTONS
====================== */

const approveBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const rejectBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
