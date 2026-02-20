"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { paymentsApi, adminPaymentsAdvancedApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Payment } from "@/lib/types";

const FF = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0F172A";
const ACCENT = "#2563EB";

const PMT_STATUS_META: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  pending:  { color: "#92400E", bg: "#FFFBEB", dot: "#F59E0B", label: "Pending" },
  on_hold:  { color: "#7C3D0A", bg: "#FFF7ED", dot: "#F97316", label: "Under Review" },
  paid:     { color: "#065F46", bg: "#F0FDF4", dot: "#10B981", label: "Paid" },
  rejected: { color: "#9F1239", bg: "#FFF1F2", dot: "#F43F5E", label: "Rejected" },
};

const TABS = [
  { key: "", label: "All" },
  { key: "on_hold", label: "Needs Review" },
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
] as const;

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".15"/>
    <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const Trash2 = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <polyline points="3 6 5 6 17 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2M15 6v10a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CheckCircle = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M6.5 10.5l2.5 2.5 4-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const XCircle = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);
const Eye = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
    <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.7"/>
    <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.7"/>
  </svg>
);

interface ReviewState { paymentId: string; notes: string; submitting: boolean; }

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [forceStatus, setForceStatus] = useState<{ id: string; status: string; reason: string } | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"selected" | "all-rejected" | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" | "warn" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" | "warn" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await paymentsApi.adminList(tab as any || undefined);
      setPayments(Array.isArray(data) ? data : (data as any)?.results ?? []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = payments; // already filtered by API

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(p => p.id)));
  const clearSelection = () => setSelected(new Set());

  /* ─── Review ─── */
  async function handleReview(paymentId: string, status: "paid" | "rejected") {
    const notes = reviewState?.notes ?? "";
    setReviewState(prev => prev ? { ...prev, submitting: true } : { paymentId, notes, submitting: true });
    try {
      await paymentsApi.review(paymentId, status, notes || undefined);
      showToast(`Payment ${status === "paid" ? "approved" : "rejected"}`);
      setReviewState(null);
      load();
    } catch (e: any) {
      showToast(e.message ?? "Review failed", "err");
      setReviewState(prev => prev ? { ...prev, submitting: false } : null);
    }
  }

  /* ─── Force Status ─── */
  async function handleForceStatus() {
    if (!forceStatus) return;
    try {
      await adminPaymentsAdvancedApi.forceStatus(forceStatus.id, { status: forceStatus.status, reason: forceStatus.reason || "Manual override" });
      showToast("Payment status forced");
      setForceStatus(null);
      load();
    } catch (e: any) {
      showToast(e.message ?? "Failed", "err");
    }
  }

  /* ─── Delete single ─── */
  async function handleDeleteSingle(paymentId: string) {
    setDeletingIds(prev => new Set([...prev, paymentId]));
    try {
      await adminPaymentsAdvancedApi.hardDelete(paymentId);
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      showToast("Payment deleted");
    } catch (e: any) {
      showToast(e.message ?? "Delete failed", "err");
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(paymentId); return n; });
    }
  }

  /* ─── Bulk delete ─── */
  async function handleBulkDelete() {
    const ids = showDeleteConfirm === "selected"
      ? [...selected]
      : payments.filter(p => p.status === "rejected").map(p => p.id);
    setBulkDeleting(true);
    try {
      await Promise.all(ids.map(id => adminPaymentsAdvancedApi.hardDelete(id)));
      setPayments(prev => prev.filter(p => !ids.includes(p.id)));
      clearSelection();
      setShowDeleteConfirm(null);
      showToast(`${ids.length} payment(s) deleted`);
    } catch (e: any) {
      showToast(e.message ?? "Delete failed", "err");
    } finally {
      setBulkDeleting(false);
    }
  }

  const rejectedCount = payments.filter(p => p.status === "rejected").length;
  const reviewCount = payments.filter(p => p.status === "on_hold").length;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        .row-h:hover { background: #F8FAFF !important; }
        .btn-h:hover { opacity: .85; }
        .ghost-h:hover { background: #F1F5F9 !important; }
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toast.type === "ok" ? BRAND : toast.type === "err" ? "#DC2626" : "#D97706" }}>
          {toast.type === "ok" ? "✓" : toast.type === "warn" ? "⚠" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Payments</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            {reviewCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#FFF7ED", color: "#C2410C" }}>
                🔔 {reviewCount} need review
              </span>
            )}
            <span style={{ fontSize: 13, color: "#94A3B8" }}>{payments.length} total</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {rejectedCount > 0 && (
            <button onClick={() => setShowDeleteConfirm("all-rejected")} className="btn-h" style={S.dangerBtnSm}>
              <Trash2 /> Purge {rejectedCount} Rejected
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); clearSelection(); }}
            style={{ ...S.tab, color: tab === t.key ? ACCENT : "#64748B", borderBottom: tab === t.key ? `2px solid ${ACCENT}` : "2px solid transparent", fontWeight: tab === t.key ? 700 : 500 }}>
            {t.label}
            {t.key === "on_hold" && reviewCount > 0 && <span style={{ ...S.tabCount, background: "#FFF7ED", color: "#C2410C" }}>{reviewCount}</span>}
          </button>
        ))}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={S.bulkBar}>
          <span style={{ fontSize: 13, fontWeight: 600, color: BRAND }}>{selected.size} selected</span>
          <button onClick={() => setShowDeleteConfirm("selected")} className="btn-h" style={S.dangerBtnSm}><Trash2 /> Hard Delete</button>
          <button onClick={clearSelection} className="ghost-h" style={S.ghostBtnSm}>✕ Clear</button>
        </div>
      )}

      {/* Select all */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <button onClick={selected.size === filtered.length ? clearSelection : selectAll} style={S.selectAllBtn}>
            <input type="checkbox" readOnly checked={selected.size === filtered.length && filtered.length > 0} style={{ cursor: "pointer", accentColor: ACCENT }} />
            <span style={{ fontSize: 13, color: "#64748B" }}>Select all</span>
          </button>
        </div>
      )}

      {loading ? (
        <div style={S.loadCenter}><div style={{ color: ACCENT }}><Spinner /></div><p style={{ color: "#94A3B8", fontSize: 14 }}>Loading…</p></div>
      ) : filtered.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: 48 }}>💳</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND }}>No payments</h2>
          <p style={{ fontSize: 14, color: "#64748B" }}>No payments found for this filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(pmt => {
            const meta = PMT_STATUS_META[pmt.status] ?? PMT_STATUS_META.pending;
            const isSelected = selected.has(pmt.id);
            const isReviewing = reviewState?.paymentId === pmt.id;
            return (
              <div key={pmt.id} className="row-h" style={{
                ...S.payCard,
                border: isSelected ? `1px solid ${ACCENT}` : pmt.status === "on_hold" ? "1px solid #FED7AA" : "1px solid #E2E8F0",
                background: isSelected ? "#F0F7FF" : pmt.status === "on_hold" ? "#FFFBF5" : "#fff",
              }}>
                {/* Checkbox */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(pmt.id)} style={{ cursor: "pointer", accentColor: ACCENT, width: 15, height: 15 }} />
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: BRAND }}>{pmt.id.slice(0, 12)}…</span>
                    <span style={{ ...S.badge, color: meta.color, background: meta.bg }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot }}/>
                      {meta.label}
                    </span>
                    {pmt.status === "on_hold" && <span style={{ fontSize: 12, color: "#C2410C", fontWeight: 700 }}>⚡ NEEDS REVIEW</span>}
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#64748B" }}>
                    <span>Order: <Link href={`/admin/orders/${pmt.order_id}`} style={{ color: ACCENT, fontFamily: "monospace", fontWeight: 600, fontSize: 12 }}>#{pmt.order_id.slice(0, 8).toUpperCase()}</Link></span>
                    <span>Method: Bank Transfer</span>
                    <span>{new Date(pmt.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  {pmt.proof && (
                    <div style={{ marginTop: 6 }}>
                      <a href={pmt.proof.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: ACCENT, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Eye /> View Proof
                      </a>
                      <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 8 }}>
                        Uploaded {new Date(pmt.proof.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {pmt.admin_notes && (
                    <p style={{ fontSize: 12, color: "#DC2626", marginTop: 4, fontStyle: "italic" }}>Note: {pmt.admin_notes}</p>
                  )}
                </div>

                {/* Amount */}
                <div style={{ textAlign: "right" as const, flexShrink: 0, marginRight: 8 }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: BRAND, margin: 0 }}>{formatCurrency(pmt.amount)}</p>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  {pmt.status === "on_hold" && !isReviewing && (
                    <>
                      <button
                        onClick={() => handleReview(pmt.id, "paid")}
                        className="btn-h"
                        style={S.approveBtn}
                      >
                        <CheckCircle /> Approve
                      </button>
                      <button
                        onClick={() => setReviewState({ paymentId: pmt.id, notes: "", submitting: false })}
                        className="btn-h"
                        style={S.rejectBtn}
                      >
                        <XCircle /> Reject
                      </button>
                    </>
                  )}
                  {pmt.status !== "on_hold" && (
                    <button
                      onClick={() => setForceStatus({ id: pmt.id, status: "", reason: "" })}
                      className="ghost-h"
                      style={S.ghostBtnSm}
                    >
                      Override
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSingle(pmt.id)}
                    disabled={deletingIds.has(pmt.id)}
                    className="btn-h"
                    style={S.deleteBtnSm}
                  >
                    {deletingIds.has(pmt.id) ? <Spinner /> : <Trash2 />}
                  </button>
                </div>

                {/* Inline reject form */}
                {isReviewing && (
                  <div style={{ ...S.reviewForm }}>
                    <textarea
                      value={reviewState!.notes}
                      onChange={e => setReviewState(prev => prev ? { ...prev, notes: e.target.value } : null)}
                      placeholder="Rejection reason (optional)…"
                      style={S.textarea}
                      rows={2}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => handleReview(pmt.id, "rejected")} disabled={reviewState!.submitting} className="btn-h" style={{ ...S.rejectBtn, flex: 1 }}>
                        {reviewState!.submitting ? "…" : "Confirm Reject"}
                      </button>
                      <button onClick={() => setReviewState(null)} className="ghost-h" style={S.ghostBtnSm}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Force Status Modal */}
      {forceStatus && (
        <div style={S.modalBackdrop} onClick={() => setForceStatus(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, marginBottom: 16 }}>Force Payment Status</h3>
            <select value={forceStatus.status} onChange={e => setForceStatus(prev => prev ? { ...prev, status: e.target.value } : null)} style={{ ...S.select, marginBottom: 10, display: "block" }}>
              <option value="">Select status…</option>
              <option value="pending">Pending</option>
              <option value="on_hold">On Hold</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="text" value={forceStatus.reason} onChange={e => setForceStatus(prev => prev ? { ...prev, reason: e.target.value } : null)} placeholder="Reason…" style={{ ...S.input, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleForceStatus} disabled={!forceStatus.status} className="btn-h" style={{ ...S.primaryBtn, flex: 1 }}>Apply</button>
              <button onClick={() => setForceStatus(null)} className="ghost-h" style={S.ghostBtnSm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={S.modalBackdrop} onClick={() => setShowDeleteConfirm(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: "center" as const, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, textAlign: "center" as const, marginBottom: 8 }}>
              {showDeleteConfirm === "all-rejected" ? `Purge ${rejectedCount} Rejected Payments?` : `Delete ${selected.size} Payments?`}
            </h3>
            <p style={{ fontSize: 14, color: "#64748B", textAlign: "center" as const, marginBottom: 24 }}>
              This will permanently delete payment records. Cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleBulkDelete} disabled={bulkDeleting} className="btn-h" style={{ ...S.dangerBtnFull, flex: 1 }}>
                {bulkDeleting ? "Deleting…" : "Yes, Delete Permanently"}
              </button>
              <button onClick={() => setShowDeleteConfirm(null)} className="ghost-h" style={S.ghostBtnSm}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "20px 20px 48px", fontFamily: FF },
  toast: { position: "fixed" as const, bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: FF, zIndex: 9999, animation: "fadeUp .3s ease", boxShadow: "0 4px 20px rgba(0,0,0,.25)" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" as const, gap: 12 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", margin: 0 },
  tabBar: { display: "flex", borderBottom: "1px solid #E2E8F0", marginBottom: 16, overflowX: "auto" as const },
  tab: { padding: "8px 16px", border: "none", background: "transparent", fontFamily: FF, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" as const, display: "flex", alignItems: "center", gap: 5 },
  tabCount: { fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 10 },
  bulkBar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#EFF6FF", borderRadius: 10, marginBottom: 12, flexWrap: "wrap" as const },
  selectAllBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: FF, padding: "4px 0" },
  loadCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "64px 0" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 0", textAlign: "center" as const, gap: 10 },
  payCard: { display: "flex", gap: 14, padding: "16px 18px", borderRadius: 14, transition: "all .15s", animation: "fadeUp .2s ease", flexWrap: "wrap" as const, position: "relative" as const },
  badge: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  approveBtn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "none", background: "#F0FDF4", color: "#16A34A", fontWeight: 700, fontSize: 12, fontFamily: FF, cursor: "pointer" },
  rejectBtn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "none", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 12, fontFamily: FF, cursor: "pointer" },
  deleteBtnSm: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 8px", borderRadius: 6, border: "none", background: "#FEF2F2", color: "#DC2626", cursor: "pointer" },
  reviewForm: { width: "100%", borderTop: "1px solid #E2E8F0", paddingTop: 12, marginTop: 4 },
  textarea: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, resize: "vertical" as const, outline: "none" },
  select: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, outline: "none", background: "#fff" },
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, outline: "none" },
  primaryBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 18px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  dangerBtnSm: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  dangerBtnFull: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 16px", borderRadius: 10, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  ghostBtnSm: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "7px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 12, fontFamily: FF, cursor: "pointer" },
  modalBackdrop: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "28px", width: "100%", maxWidth: 420, animation: "fadeUp .2s ease" },
};