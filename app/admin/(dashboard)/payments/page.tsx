"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { paymentsApi } from "@/lib/api";

/* ======================
   TYPES (BACKEND-ALIGNED)
====================== */

type Payment = {
  id: string;
  order_id: string;
  amount: number;
  status: "pending" | "on_hold" | "paid" | "rejected";
  created_at: string;
};

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  /* ======================
     LOAD PAYMENTS (ONCE)
  ====================== */
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
    if (loadedOnce) return;
    load();
    setLoadedOnce(true);
  }, [loadedOnce]);

  /* ======================
     REVIEW PAYMENT
  ====================== */
  async function reviewPayment(
    id: string,
    action: "approve" | "reject"
  ) {
    setUpdating(true);
    try {
      // 🔑 TRANSLATION LAYER (UI → BACKEND)
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
        <div className="card">No payments found.</div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {payments.map((p) => {
          const needsReview =
            p.status === "pending" || p.status === "on_hold";

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
                <strong>{fmtM(p.amount)}</strong>
              </div>

              {/* META */}
              <div style={{ fontSize: 13, opacity: 0.75 }}>
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
                Status: <b>{p.status}</b>
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
                      reviewPayment(p.id, "approve")
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="btn btnGhost"
                    disabled={updating}
                    onClick={() =>
                      reviewPayment(p.id, "reject")
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
