"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ordersApi,
  adminOrdersAdvancedApi,
  paymentsApi,
  adminPaymentsAdvancedApi,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, Payment, OrderNote, OrderItem } from "@/lib/types";

const FF = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0F172A";
const ACCENT = "#2563EB";

/* ─── Status helpers ─── */
const ORDER_STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: "#92400E", bg: "#FFFBEB", label: "Pending" },
  paid:      { color: "#065F46", bg: "#F0FDF4", label: "Paid" },
  shipped:   { color: "#1E40AF", bg: "#EFF6FF", label: "Shipped" },
  completed: { color: "#166534", bg: "#F0FDF4", label: "Completed" },
  cancelled: { color: "#9F1239", bg: "#FFF1F2", label: "Cancelled" },
};
const PAYMENT_STATUS_META: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  pending:  { color: "#92400E", bg: "#FFFBEB", dot: "#F59E0B", label: "Pending" },
  on_hold:  { color: "#7C3D0A", bg: "#FFF7ED", dot: "#F97316", label: "Under Review" },
  paid:     { color: "#065F46", bg: "#F0FDF4", dot: "#10B981", label: "Paid" },
  rejected: { color: "#9F1239", bg: "#FFF1F2", dot: "#F43F5E", label: "Rejected" },
};
const SHIP_STATUSES = ["pending", "processing", "shipped", "delivered", "returned"] as const;

/* ─── Icons ─── */
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Spinner = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin .7s linear infinite" }}>
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

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status override
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  // Shipping
  const [shippingStatus, setShippingStatus] = useState("");
  const [updatingShipping, setUpdatingShipping] = useState(false);

  // Payment review
  const [reviewStatus, setReviewStatus] = useState<"paid" | "rejected" | "">("");
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Payment force status
  const [forcePayStatus, setForcePayStatus] = useState("");
  const [forcePayReason, setForcePayReason] = useState("");
  const [forcingPayStatus, setForcingPayStatus] = useState(false);

  // Refund
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);

  // Note
  const [newNote, setNewNote] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);
  const [addingNote, setAddingNote] = useState(false);

  // Danger
  const [showHardDelete, setShowHardDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showHardDeletePayment, setShowHardDeletePayment] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" | "warn" } | null>(null);
  const showToast = (msg: string, type: "ok" | "err" | "warn" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [ord, notesData] = await Promise.all([
        ordersApi.getAdminById(id),
        adminOrdersAdvancedApi.getNotes(id).catch(() => []),
      ]);
      setOrder(ord);
      setNotes(Array.isArray(notesData) ? notesData : []);
      // Fetch payment
      const pmts = ord.payments ?? [];
      if (pmts.length > 0) {
        const pmt = await paymentsApi.adminGetById(pmts[pmts.length - 1].id).catch(() => null) as Payment | null;
        setPayment(pmt);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  /* ─── Actions ─── */
  async function handleStatusOverride() {
    if (!overrideStatus) return;
    setOverriding(true);
    try {
      await adminOrdersAdvancedApi.forceStatus(id, { status: overrideStatus, reason: overrideReason || "Manual override" });
      showToast("Status updated");
      setOverrideStatus(""); setOverrideReason("");
      load();
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); }
    finally { setOverriding(false); }
  }

  async function handleShippingUpdate() {
    if (!shippingStatus) return;
    setUpdatingShipping(true);
    try {
      await ordersApi.updateShipping(id, { status: shippingStatus });
      showToast("Shipping status updated");
      setShippingStatus("");
      load();
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); }
    finally { setUpdatingShipping(false); }
  }

  async function handlePaymentReview() {
    if (!payment || !reviewStatus) return;
    setReviewing(true);
    try {
      await paymentsApi.review(payment.id, reviewStatus, adminNotes || undefined);
      showToast(`Payment marked as ${reviewStatus}`);
      setReviewStatus(""); setAdminNotes("");
      load();
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); }
    finally { setReviewing(false); }
  }

  async function handleForcePayStatus() {
    if (!payment || !forcePayStatus) return;
    setForcingPayStatus(true);
    try {
      await adminPaymentsAdvancedApi.forceStatus(payment.id, { status: forcePayStatus, reason: forcePayReason || "Manual override" });
      showToast("Payment status overridden");
      setForcePayStatus(""); setForcePayReason("");
      load();
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); }
    finally { setForcingPayStatus(false); }
  }

  async function handleRefund() {
    if (!refundAmount || !refundReason) { showToast("Fill in amount and reason", "warn"); return; }
    setRefunding(true);
    try {
      const amt = parseFloat(refundAmount);
      await adminOrdersAdvancedApi.processRefund(id, { amount: amt, reason: refundReason });
      showToast("Refund processed");
      setRefundAmount(""); setRefundReason(""); setShowRefundForm(false);
      load();
    } catch (e: any) { showToast(e.message ?? "Refund failed", "err"); }
    finally { setRefunding(false); }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await adminOrdersAdvancedApi.addNote(id, { content: newNote, is_internal: noteInternal });
      showToast("Note added");
      setNewNote("");
      load();
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); }
    finally { setAddingNote(false); }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      await adminOrdersAdvancedApi.deleteNote(id, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      showToast("Note deleted");
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); }
  }

  async function handleHardDelete() {
    setDeleting(true);
    try {
      await adminOrdersAdvancedApi.hardDelete(id);
      showToast("Order permanently deleted");
      setTimeout(() => router.push("/admin/orders"), 1200);
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); setDeleting(false); }
  }

  async function handleHardDeletePayment() {
    if (!payment) return;
    setDeletingPayment(true);
    try {
      await adminPaymentsAdvancedApi.hardDelete(payment.id);
      showToast("Payment permanently deleted");
      setPayment(null);
      setShowHardDeletePayment(false);
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); }
    finally { setDeletingPayment(false); }
  }

  async function handleRestoreOrder() {
    try {
      await adminOrdersAdvancedApi.restore(id);
      showToast("Order restored");
      load();
    } catch (e: any) { showToast(e.message ?? "Failed", "err"); }
  }

  /* ─── Derived ─── */
  const orderMeta = order ? ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.pending : null;
  const payMeta = payment ? PAYMENT_STATUS_META[payment.status] ?? PAYMENT_STATUS_META.pending : null;

  if (loading) return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.loadCenter}><div style={{ color: ACCENT }}><Spinner /></div><p style={{ color: "#94A3B8", fontSize: 14 }}>Loading order…</p></div>
    </div>
  );
  if (error || !order) return (
    <div style={S.page}>
      <div style={S.errorCenter}>
        <div style={{ fontSize: 40 }}>❌</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND }}>Order not found</h2>
        <p style={{ color: "#64748B" }}>{error ?? "This order doesn't exist."}</p>
        <Link href="/admin/orders" style={S.primaryLink}>← Back to Orders</Link>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        select, textarea, input { font-family: ${FF}; }
        .act-btn:hover { opacity: .85; }
        .ghost-btn:hover { background: #F1F5F9 !important; }
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toast.type === "ok" ? BRAND : toast.type === "err" ? "#DC2626" : "#D97706" }}>
          {toast.type === "ok" ? "✓" : toast.type === "warn" ? "⚠" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <Link href="/admin/orders" style={S.backLink}><ChevronLeft /> Orders</Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {order.status === "cancelled" && (
            <button onClick={handleRestoreOrder} className="ghost-btn" style={S.ghostBtn}>↺ Restore</button>
          )}
          <button onClick={() => setShowHardDelete(true)} style={S.dangerBtnSm} className="act-btn">
            <Trash2 /> Hard Delete
          </button>
        </div>
      </div>

      <h1 style={S.pageTitle}>Order #{order.id.slice(0, 8).toUpperCase()}</h1>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
        {orderMeta && <span style={{ ...S.badge, color: orderMeta.color, background: orderMeta.bg }}>{orderMeta.label}</span>}
        <span style={{ fontSize: 12, color: "#94A3B8" }}>
          Created {new Date(order.created_at).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
        {(order as any).user?.email && (
          <Link href={`/admin/users/${order.user_id}`} style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>
            👤 {(order as any).user.email}
          </Link>
        )}
      </div>

      <div style={S.grid}>
        {/* LEFT */}
        <div style={S.col}>

          {/* Order Items */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>Items</h3>
            <div>
              {order.items?.map((item: OrderItem, idx: number) => (
                <div key={item.id} style={{ ...S.itemRow, borderBottom: idx < (order.items!.length - 1) ? "1px solid #F1F5F9" : "none" }}>
                  <div style={S.thumb}>
                    {item.product?.main_image
                      ? <img src={item.product.main_image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                      : <span style={{ fontSize: 18 }}>📦</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: BRAND, fontSize: 14, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                    {item.variant && <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{Object.entries(item.variant.attributes).map(([k,v]) => `${k}: ${v}`).join(" · ")}</p>}
                    <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>SKU: {item.product?.sku ?? "—"} · Qty: {item.quantity}</p>
                  </div>
                  <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: BRAND, margin: 0 }}>{formatCurrency(item.price * item.quantity)}</p>
                    <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{formatCurrency(item.price)} each</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={S.summary}>
              <div style={S.summaryRow}><span>Subtotal</span><span>{formatCurrency(order.total_amount)}</span></div>
              <div style={{ ...S.summaryRow, fontWeight: 800, fontSize: 15, color: BRAND, borderTop: "1px solid #E2E8F0", paddingTop: 10 }}>
                <span>Total</span><span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment panel */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ ...S.cardTitle, margin: 0 }}>Payment</h3>
              {payment && (
                <button onClick={() => setShowHardDeletePayment(true)} style={S.dangerBtnXs} className="act-btn">
                  <Trash2 /> Delete
                </button>
              )}
            </div>

            {!payment ? (
              <p style={{ fontSize: 14, color: "#94A3B8" }}>No payment record found.</p>
            ) : (
              <>
                {payMeta && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: payMeta.dot, flexShrink: 0 }}/>
                    <span style={{ ...S.badge, color: payMeta.color, background: payMeta.bg }}>{payMeta.label}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 800, color: BRAND }}>{formatCurrency(payment.amount)}</span>
                  </div>
                )}
                <div style={S.infoGrid}>
                  <div><span style={S.infoLabel}>Payment ID</span><span style={{ ...S.infoVal, fontFamily: "monospace", fontSize: 11 }}>{payment.id.slice(0, 16)}…</span></div>
                  <div><span style={S.infoLabel}>Method</span><span style={S.infoVal}>Bank Transfer</span></div>
                  {payment.proof && (
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={S.infoLabel}>Proof of Payment</span>
                      <a href={payment.proof.file_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ACCENT, fontWeight: 600, fontSize: 13 }}>
                        🖼 View Proof →
                      </a>
                    </div>
                  )}
                  {payment.admin_notes && (
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={S.infoLabel}>Admin Notes</span>
                      <p style={{ ...S.infoVal, color: "#64748B" }}>{payment.admin_notes}</p>
                    </div>
                  )}
                </div>

                {/* Review proof */}
                {payment.status === "on_hold" && (
                  <div style={{ ...S.section, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: "#92400E", marginBottom: 10 }}>⏳ Proof Under Review — Take Action</p>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Admin notes (optional)…"
                      style={S.textarea}
                      rows={2}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => { setReviewStatus("paid"); handlePaymentReview(); }}
                        disabled={reviewing}
                        className="act-btn"
                        style={{ ...S.successBtn, flex: 1 }}
                      >
                        {reviewing ? "…" : "✓ Approve Payment"}
                      </button>
                      <button
                        onClick={() => { setReviewStatus("rejected"); handlePaymentReview(); }}
                        disabled={reviewing}
                        className="act-btn"
                        style={{ ...S.dangerBtnFull, flex: 1 }}
                      >
                        {reviewing ? "…" : "✗ Reject"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Force payment status */}
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>Force Payment Status</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={forcePayStatus} onChange={e => setForcePayStatus(e.target.value)} style={S.select}>
                      <option value="">Select status…</option>
                      <option value="pending">Pending</option>
                      <option value="on_hold">On Hold</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button onClick={handleForcePayStatus} disabled={!forcePayStatus || forcingPayStatus} className="act-btn" style={S.actionBtn}>
                      {forcingPayStatus ? <Spinner /> : "Apply"}
                    </button>
                  </div>
                  {forcePayStatus && (
                    <input
                      type="text"
                      value={forcePayReason}
                      onChange={e => setForcePayReason(e.target.value)}
                      placeholder="Reason (optional)…"
                      style={{ ...S.input, marginTop: 8 }}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div style={S.card}>
            <h3 style={{ ...S.cardTitle, marginBottom: 16 }}>Internal Notes</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {notes.length === 0 && <p style={{ fontSize: 13, color: "#94A3B8" }}>No notes yet.</p>}
              {notes.map(note => (
                <div key={note.id} style={S.noteCard}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: BRAND, margin: "0 0 4px", lineHeight: 1.6 }}>{note.content}</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {note.is_internal && <span style={S.internalBadge}>Internal</span>}
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>{new Date(note.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteNote(note.id)} style={S.noteDeleteBtn} className="act-btn">
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note…"
              style={S.textarea}
              rows={3}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748B", cursor: "pointer" }}>
                <input type="checkbox" checked={noteInternal} onChange={e => setNoteInternal(e.target.checked)} style={{ accentColor: ACCENT }} />
                Internal only
              </label>
              <button onClick={handleAddNote} disabled={!newNote.trim() || addingNote} className="act-btn" style={{ ...S.primaryBtn, marginLeft: "auto" }}>
                {addingNote ? "Adding…" : "Add Note"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={S.col}>

          {/* Order Control */}
          <div style={S.card}>
            <h3 style={{ ...S.cardTitle, marginBottom: 16 }}>Order Controls</h3>

            {/* Status Override */}
            <div style={{ marginBottom: 20 }}>
              <p style={S.sectionLabel}>Override Order Status</p>
              <div style={{ display: "flex", gap: 8, marginBottom: overrideStatus ? 8 : 0 }}>
                <select value={overrideStatus} onChange={e => setOverrideStatus(e.target.value)} style={S.select}>
                  <option value="">Select status…</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button onClick={handleStatusOverride} disabled={!overrideStatus || overriding} className="act-btn" style={S.actionBtn}>
                  {overriding ? <Spinner /> : "Apply"}
                </button>
              </div>
              {overrideStatus && (
                <input type="text" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Reason…" style={S.input} />
              )}
            </div>

            {/* Shipping Status */}
            <div style={{ marginBottom: 20 }}>
              <p style={S.sectionLabel}>Update Shipping Status</p>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={shippingStatus} onChange={e => setShippingStatus(e.target.value)} style={S.select}>
                  <option value="">Select…</option>
                  {SHIP_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button onClick={handleShippingUpdate} disabled={!shippingStatus || updatingShipping} className="act-btn" style={S.actionBtn}>
                  {updatingShipping ? <Spinner /> : "Update"}
                </button>
              </div>
              {order.tracking_number && (
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>Current tracking: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{order.tracking_number}</span></p>
              )}
            </div>

            {/* Refund */}
            <div>
              <p style={S.sectionLabel}>Refund</p>
              {!showRefundForm ? (
                <button onClick={() => setShowRefundForm(true)} className="act-btn ghost-btn" style={S.ghostBtnFull}>💰 Issue Refund</button>
              ) : (
                <div style={{ padding: "14px", background: "#FFFBEB", borderRadius: 10, border: "1px solid #FDE68A" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="Amount…" style={{ ...S.input, flex: 1 }} />
                  </div>
                  <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Refund reason…" style={S.textarea} rows={2} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={handleRefund} disabled={refunding} className="act-btn" style={{ ...S.successBtn, flex: 1 }}>
                      {refunding ? "Processing…" : "Process Refund"}
                    </button>
                    <button onClick={() => setShowRefundForm(false)} className="act-btn ghost-btn" style={S.ghostBtn}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer & Address */}
          <div style={S.card}>
            <h3 style={{ ...S.cardTitle, marginBottom: 14 }}>Customer</h3>
            {(order as any).user ? (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: BRAND, margin: "0 0 2px" }}>{(order as any).user.full_name ?? "—"}</p>
                <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>{(order as any).user.email}</p>
                {(order as any).user.phone && <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>📞 {(order as any).user.phone}</p>}
                <Link href={`/admin/users/${order.user_id}`} style={{ fontSize: 13, color: ACCENT, fontWeight: 600, marginTop: 6, display: "inline-block" }}>View Profile →</Link>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#94A3B8" }}>No customer info</p>
            )}
            {order.shipping_address && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>Shipping Address</p>
                <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
                  <strong style={{ color: BRAND }}>{order.shipping_address.full_name}</strong><br/>
                  {order.shipping_address.address_line1}<br/>
                  {order.shipping_address.address_line2 && <>{order.shipping_address.address_line2}<br/></>}
                  {order.shipping_address.city}{order.shipping_address.district ? `, ${order.shipping_address.district}` : ""}<br/>
                  {order.shipping_address.country}
                  <br/>📞 {order.shipping_address.phone}
                </div>
              </>
            )}
          </div>

          {/* Timeline */}
          <div style={S.card}>
            <h3 style={{ ...S.cardTitle, marginBottom: 16 }}>Timeline</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Order created", time: order.created_at, always: true },
                { label: "Order paid", time: (order as any).paid_at ?? (order.status === "paid" ? order.updated_at : null), always: false },
                { label: "Order shipped", time: order.shipped_at, always: false },
                { label: "Order delivered", time: order.delivered_at, always: false },
                { label: "Order cancelled", time: order.cancelled_at, always: false },
              ].filter(e => e.always || e.time).map((event, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? ACCENT : "#10B981", flexShrink: 0, marginTop: 4 }}/>
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: "#E2E8F0", margin: "4px 0" }}/>}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: 0 }}>{event.label}</p>
                    {event.time && <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>{new Date(event.time).toLocaleString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order notes */}
          {order.notes && (
            <div style={S.card}>
              <h3 style={{ ...S.cardTitle, marginBottom: 8 }}>Customer Notes</h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, background: "#F8FAFC", borderRadius: 10, padding: "10px 14px" }}>{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Hard Delete Order Modal */}
      {showHardDelete && (
        <div style={S.modalBackdrop} onClick={() => setShowHardDelete(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: "center" as const, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, textAlign: "center" as const, marginBottom: 8 }}>Permanently Delete Order?</h3>
            <p style={{ fontSize: 14, color: "#64748B", textAlign: "center" as const, marginBottom: 24, lineHeight: 1.6 }}>
              This will <strong>permanently delete</strong> order #{id.slice(0, 8).toUpperCase()} and all related data. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleHardDelete} disabled={deleting} className="act-btn" style={{ ...S.dangerBtnFull, flex: 1 }}>
                {deleting ? "Deleting…" : "Yes, Delete Permanently"}
              </button>
              <button onClick={() => setShowHardDelete(false)} className="ghost-btn" style={S.ghostBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Payment Modal */}
      {showHardDeletePayment && payment && (
        <div style={S.modalBackdrop} onClick={() => setShowHardDeletePayment(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: "center" as const, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, textAlign: "center" as const, marginBottom: 8 }}>Delete Payment Record?</h3>
            <p style={{ fontSize: 14, color: "#64748B", textAlign: "center" as const, marginBottom: 24 }}>This will permanently delete payment {payment.id.slice(0, 12)}… This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleHardDeletePayment} disabled={deletingPayment} className="act-btn" style={{ ...S.dangerBtnFull, flex: 1 }}>
                {deletingPayment ? "Deleting…" : "Yes, Delete"}
              </button>
              <button onClick={() => setShowHardDeletePayment(false)} className="ghost-btn" style={S.ghostBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "20px 20px 48px", fontFamily: FF },
  loadCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "80px 0" },
  errorCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  backLink: { display: "inline-flex", alignItems: "center", gap: 6, color: "#64748B", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", margin: "0 0 4px" },
  badge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" },
  col: { display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 20px 18px", animation: "fadeUp .3s ease" },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 0 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8, marginTop: 0 },
  section: { padding: "14px 16px", marginTop: 16 },
  itemRow: { display: "flex", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 12 },
  thumb: { width: 48, height: 48, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  summary: { borderTop: "1px solid #F1F5F9", marginTop: 14, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  infoLabel: { display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 2 },
  infoVal: { display: "block", fontSize: 13, color: "#0F172A" },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, resize: "vertical" as const, outline: "none", color: "#0F172A", lineHeight: 1.6 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, outline: "none", color: "#0F172A" },
  select: { flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, outline: "none", color: "#0F172A", background: "#fff" },
  primaryBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 18px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  primaryLink: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "11px 20px", borderRadius: 10, background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 },
  actionBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 16px", borderRadius: 8, background: BRAND, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" as const },
  successBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 10, background: "#16A34A", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  ghostBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "9px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  ghostBtnFull: { display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "transparent", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer", width: "100%" },
  dangerBtnSm: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  dangerBtnXs: { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "none", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 12, fontFamily: FF, cursor: "pointer" },
  dangerBtnFull: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 16px", borderRadius: 10, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  noteCard: { display: "flex", gap: 10, padding: "12px 14px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #F1F5F9", alignItems: "flex-start" },
  noteDeleteBtn: { background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", flexShrink: 0 },
  internalBadge: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#EFF6FF", color: "#2563EB", textTransform: "uppercase" as const },
  toast: { position: "fixed" as const, bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: FF, zIndex: 9999, animation: "fadeUp .3s ease", boxShadow: "0 4px 20px rgba(0,0,0,.25)" },
  modalBackdrop: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "28px", width: "100%", maxWidth: 440, animation: "fadeUp .2s ease" },
};