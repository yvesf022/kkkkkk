"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { paymentsApi, adminPaymentsAdvancedApi } from "@/lib/api";
import type { Payment, PaymentStatus } from "@/lib/types";

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
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");

  // Advanced features
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showOverride, setShowOverride] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<PaymentStatus>("paid");
  const [overrideReason, setOverrideReason] = useState("");

  async function load() {
    try {
      setLoading(true);
      const filter = statusFilter === "all" ? undefined : statusFilter;
      const data = await paymentsApi.adminList(filter);
      setPayments(data as Payment[]);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  /* ======================
     REVIEW PAYMENT
  ====================== */

  async function reviewPayment(
    id: string,
    action: "approve" | "reject"
  ) {
    setUpdatingId(id);

    try {
      const status = action === "approve" ? "paid" : "rejected";
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

  /* ======================
     FORCE STATUS OVERRIDE
  ====================== */

  async function handleStatusOverride(paymentId: string) {
    if (!confirm(`Force payment status to ${overrideStatus}?`)) return;

    setUpdatingId(paymentId);

    try {
      await adminPaymentsAdvancedApi.forceStatus(paymentId, {
        status: overrideStatus,
        reason: overrideReason,
      });

      toast.success("Payment status overridden");
      setShowOverride(null);
      setOverrideReason("");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to override status");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ======================
     HARD DELETE PAYMENT
  ====================== */

  async function handleHardDelete(paymentId: string) {
    if (!confirm("Permanently delete this payment? This cannot be undone!")) return;

    setUpdatingId(paymentId);

    try {
      await adminPaymentsAdvancedApi.hardDelete(paymentId);
      toast.success("Payment deleted permanently");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete payment");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ======================
     LOAD PAYMENT HISTORY
  ====================== */

  async function loadHistory(paymentId: string) {
    try {
      const data = await adminPaymentsAdvancedApi.getHistory(paymentId);
      setHistory(data as any[]);
      setShowHistory(paymentId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load history");
    }
  }

  if (loading) return <p>Loading payments…</p>;

  return (
    <div style={{ display: "grid", gap: 32 }}>
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900 }}>
            Payments Management
          </h1>
          <p style={{ opacity: 0.6 }}>
            Review, override, and manage payment proofs
          </p>
        </div>

        {/* FILTER */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "2px solid #e5e7eb",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <option value="all">All Payments</option>
          <option value="pending">Pending</option>
          <option value="on_hold">Awaiting Review</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </header>

      {payments.length === 0 && (
        <div className="card">No payments found.</div>
      )}

      <div style={{ display: "grid", gap: 18 }}>
        {payments.map((p) => {
          const needsReview = p.status === "on_hold";
          const isExpanded = showHistory === p.id || showOverride === p.id;

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
                boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
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
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ fontSize: 18, fontWeight: 900 }}>
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

              {/* ADMIN NOTES */}
              {p.admin_notes && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "#fef3c7",
                    fontSize: 13,
                  }}
                >
                  <strong>Admin Notes:</strong> {p.admin_notes}
                </div>
              )}

              {/* REVIEWED INFO */}
              {p.reviewed_by && (
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  Reviewed by {p.reviewed_by} on{" "}
                  {new Date(p.reviewed_at!).toLocaleString()}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {/* APPROVE/REJECT */}
                {needsReview && (
                  <>
                    <button
                      disabled={updatingId === p.id}
                      onClick={() => reviewPayment(p.id, "approve")}
                      style={approveBtn}
                    >
                      {updatingId === p.id ? "Processing..." : "Approve"}
                    </button>

                    <button
                      disabled={updatingId === p.id}
                      onClick={() => reviewPayment(p.id, "reject")}
                      style={rejectBtn}
                    >
                      Reject
                    </button>
                  </>
                )}

                {/* ADVANCED ACTIONS */}
                <button
                  onClick={() => loadHistory(p.id)}
                  style={actionBtn}
                >
                  📊 History
                </button>

                <button
                  onClick={() => setShowOverride(p.id)}
                  style={actionBtn}
                >
                  ⚡ Override
                </button>

                <button
                  onClick={() => handleHardDelete(p.id)}
                  disabled={updatingId === p.id}
                  style={{ ...actionBtn, background: "#991b1b" }}
                >
                  🗑️ Delete
                </button>
              </div>

              {/* PAYMENT HISTORY */}
              {showHistory === p.id && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <h4 style={{ fontWeight: 900 }}>Status History</h4>
                    <button
                      onClick={() => setShowHistory(null)}
                      style={{ fontSize: 20, border: "none", background: "none", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>

                  {history.length === 0 ? (
                    <p style={{ opacity: 0.6 }}>No history available</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {history.map((h: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            background: "#ffffff",
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            Status: <StatusBadge status={h.status} />
                          </div>
                          {h.reason && (
                            <div style={{ opacity: 0.7, marginTop: 4 }}>
                              Reason: {h.reason}
                            </div>
                          )}
                          <div style={{ opacity: 0.6, fontSize: 11, marginTop: 4 }}>
                            {new Date(h.created_at).toLocaleString()}
                            {h.changed_by && ` • by ${h.changed_by}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STATUS OVERRIDE */}
              {showOverride === p.id && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "#fef3c7",
                    border: "2px solid #f59e0b",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <h4 style={{ fontWeight: 900 }}>Force Status Override</h4>
                    <button
                      onClick={() => setShowOverride(null)}
                      style={{ fontSize: 20, border: "none", background: "none", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <select
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value as PaymentStatus)}
                      style={{ padding: 10, borderRadius: 8 }}
                    >
                      <option value="pending">Pending</option>
                      <option value="on_hold">On Hold</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    <input
                      placeholder="Reason for override..."
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      style={{ padding: 10, borderRadius: 8 }}
                    />

                    <button
                      onClick={() => handleStatusOverride(p.id)}
                      disabled={updatingId === p.id}
                      style={{ ...approveBtn, background: "#ef4444" }}
                    >
                      {updatingId === p.id ? "Processing..." : "Force Override"}
                    </button>
                  </div>
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
  status: PaymentStatus;
}) {
  let bg = "#f3f4f6";
  let text = "#374151";
  let label: string = status;

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
   BUTTON STYLES
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

const actionBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#3b82f6",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
