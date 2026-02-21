"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ordersApi, adminOrdersAdvancedApi, paymentsApi, adminPaymentsAdvancedApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, Payment, OrderNote, OrderStatus, ShippingStatus, PaymentStatus } from "@/lib/types";

/* ─── Design tokens ─── */
const FF = "'Syne', 'DM Sans', -apple-system, sans-serif";
const FFBody = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";
const ACCENT2 = "#7C3AED";
const BORDER = "#E2E8F0";
const SURFACE = "#F8FAFF";

/* ─── Status config ─── */
const ORDER_STATUS_META: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  pending:   { color: "#92400E", bg: "#FFFBEB", label: "Pending",   dot: "#F59E0B" },
  paid:      { color: "#065F46", bg: "#ECFDF5", label: "Paid",      dot: "#10B981" },
  shipped:   { color: "#1E40AF", bg: "#EFF6FF", label: "Shipped",   dot: "#3B82F6" },
  completed: { color: "#166534", bg: "#F0FDF4", label: "Completed", dot: "#22C55E" },
  cancelled: { color: "#9F1239", bg: "#FFF1F2", label: "Cancelled", dot: "#F43F5E" },
};
const PAYMENT_META: Record<string, { color: string; bg: string; label: string }> = {
  pending:  { color: "#92400E", bg: "#FFFBEB", label: "Pending" },
  on_hold:  { color: "#9A3412", bg: "#FFF7ED", label: "On Hold" },
  paid:     { color: "#065F46", bg: "#ECFDF5", label: "Paid" },
  rejected: { color: "#9F1239", bg: "#FFF1F2", label: "Rejected" },
};
const SHIP_STATUS_OPTIONS: { value: ShippingStatus; label: string }[] = [
  { value: "pending",    label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped",    label: "Shipped" },
  { value: "delivered",  label: "Delivered" },
  { value: "returned",   label: "Returned" },
];
const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending",   label: "Pending" },
  { value: "paid",      label: "Paid" },
  { value: "shipped",   label: "Shipped" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/* ─── Icons ─── */
const Spinner = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".12" />
    <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ─── Helpers ─── */
function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtShort(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ─── Section card ─── */
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <h3 style={S.cardTitle}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Badge ─── */
function Badge({ color, bg, dot, label }: { color: string; bg: string; dot: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, color, background: bg, fontFamily: FF }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" | "warn" } | null>(null);

  /* Status override */
  const [overrideStatus, setOverrideStatus] = useState<OrderStatus | "">("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  /* Shipping update */
  const [shipStatus, setShipStatus] = useState<ShippingStatus | "">("");
  const [updatingShip, setUpdatingShip] = useState(false);

  /* Refund */
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  /* Payment review */
  const [reviewingPayment, setReviewingPayment] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  /* Hard delete / cancel / restore */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" | "warn" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderData, notesData] = await Promise.allSettled([
        ordersApi.getAdminById(orderId),
        adminOrdersAdvancedApi.getNotes(orderId),
      ]);
      if (orderData.status === "fulfilled") setOrder(orderData.value);
      if (notesData.status === "fulfilled") setNotes(Array.isArray(notesData.value) ? notesData.value : []);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load order", "err");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { if (orderId) load(); }, [load, orderId]);

  /* ─── Actions ─── */
  async function handleForceStatus() {
    if (!overrideStatus) return;
    setOverriding(true);
    try {
      await adminOrdersAdvancedApi.forceStatus(orderId, { status: overrideStatus, reason: overrideReason || `Status changed to ${overrideStatus}` });
      showToast(`Order status updated to ${overrideStatus}`);
      setOverrideStatus(""); setOverrideReason("");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally {
      setOverriding(false);
    }
  }

  async function handleShippingUpdate() {
    if (!shipStatus) return;
    setUpdatingShip(true);
    try {
      await ordersApi.updateShipping(orderId, { status: shipStatus });
      showToast("Shipping status updated");
      setShipStatus("");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally {
      setUpdatingShip(false);
    }
  }

  async function handleRefund(partial: boolean) {
    setRefunding(true);
    try {
      if (partial) {
        await adminOrdersAdvancedApi.processPartialRefund(orderId, { amount: parseFloat(refundAmount), reason: refundReason });
        showToast("Partial refund processed");
      } else {
        await adminOrdersAdvancedApi.processRefund(orderId, { amount: order!.total_amount, reason: refundReason });
        showToast("Full refund processed");
      }
      setRefundAmount(""); setRefundReason(""); setShowRefund(false);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Refund failed", "err");
    } finally {
      setRefunding(false);
    }
  }

  async function handlePaymentReview(paymentId: string, status: "paid" | "rejected") {
    setReviewingPayment(paymentId);
    try {
      await paymentsApi.review(paymentId, status, reviewNotes);
      showToast(`Payment ${status}`);
      setReviewNotes("");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally {
      setReviewingPayment(null);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await adminOrdersAdvancedApi.addNote(orderId, { content: noteText, is_internal: noteInternal });
      showToast("Note added");
      setNoteText("");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      await adminOrdersAdvancedApi.deleteNote(orderId, noteId);
      showToast("Note deleted");
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    }
  }

  async function handleHardDelete() {
    setDeleting(true);
    try {
      await adminOrdersAdvancedApi.hardDelete(orderId);
      showToast("Order permanently deleted");
      setTimeout(() => router.push("/admin/orders"), 1200);
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await adminOrdersAdvancedApi.forceStatus(orderId, { status: "cancelled", reason: "Cancelled by admin" });
      showToast("Order cancelled");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally {
      setCancelling(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      await adminOrdersAdvancedApi.restore(orderId);
      showToast("Order restored");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally {
      setRestoring(false);
    }
  }

  /* ─── Render ─── */
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 14, fontFamily: FF }}>
        <div style={{ color: ACCENT }}><Spinner size={32} /></div>
        <p style={{ color: "#94A3B8", fontSize: 14 }}>Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12, fontFamily: FF }}>
        <div style={{ fontSize: 48 }}>📭</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND }}>Order not found</h2>
        <Link href="/admin/orders" style={{ color: ACCENT, fontSize: 14 }}>← Back to Orders</Link>
      </div>
    );
  }

  const orderMeta = ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.pending;
  const toastBg = toast?.type === "ok" ? "#10B981" : toast?.type === "warn" ? "#F59E0B" : "#EF4444";

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        .btn-h:hover { opacity: .85; transform: translateY(-1px); }
        .gh:hover { background: #F1F5F9 !important; }
        .note-row:hover .del-note { opacity: 1 !important; }
        textarea, input, select { font-family: ${FFBody}; }
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toastBg }}>
          {toast.type === "ok" ? "✓" : toast.type === "warn" ? "⚠" : "✗"} {toast.msg}
        </div>
      )}

      {/* Back + header */}
      <div style={S.breadcrumb}>
        <Link href="/admin/orders" style={S.backLink}>
          ← Orders
        </Link>
        <span style={{ color: "#CBD5E1", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 13, color: "#64748B", fontFamily: FFBody }}>#{orderId.slice(0, 8).toUpperCase()}</span>
      </div>

      <div style={S.pageHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={S.title}>Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <Badge {...orderMeta} />
          </div>
          <p style={S.sub}>Created {fmtDate(order.created_at)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {order.status !== "cancelled" && (
            <button onClick={handleCancel} disabled={cancelling} style={S.dangerOutline} className="btn-h">
              {cancelling ? <Spinner size={13} /> : "Cancel Order"}
            </button>
          )}
          {order.status === "cancelled" && (
            <button onClick={handleRestore} disabled={restoring} style={S.ghostSm} className="gh">
              {restoring ? <Spinner size={13} /> : "Restore Order"}
            </button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)} style={{ ...S.dangerOutline, color: "#DC2626", borderColor: "#FECACA" }} className="btn-h">
            Hard Delete
          </button>
        </div>
      </div>

      <div style={S.grid}>
        {/* Left column */}
        <div style={S.leftCol}>

          {/* Order items */}
          <Card title="Order Items">
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(order.items ?? []).map((item) => (
                <div key={item.id} style={S.itemRow}>
                  {/* Product image */}
                  <div style={S.itemThumb}>
                    {item.product?.main_image ? (
                      <img src={item.product.main_image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span style={{ fontSize: 22 }}>📦</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 2px", fontFamily: FF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </p>
                    {item.product?.brand && (
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 2px", fontFamily: FFBody }}>{item.product.brand}</p>
                    )}
                    {item.product?.sku && (
                      <p style={{ fontSize: 11, color: "#CBD5E1", margin: 0, fontFamily: "monospace" }}>SKU: {item.product.sku}</p>
                    )}
                    {item.variant && (
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>
                        {Object.entries(item.variant.attributes ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Qty + price */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: BRAND, margin: "0 0 2px", fontFamily: FF }}>{formatCurrency(item.subtotal)}</p>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div style={{ padding: "14px 16px 0", borderTop: `1px solid ${BORDER}`, marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#64748B", fontFamily: FFBody }}>Subtotal ({order.items?.length ?? 0} items)</span>
                  <span style={{ fontSize: 13, color: "#64748B", fontFamily: FFBody }}>{formatCurrency(order.total_amount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: BRAND, fontFamily: FF }}>Total</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: BRAND, fontFamily: FF }}>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Payments */}
          <Card title="Payments">
            {(order.payments ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FFBody, padding: "8px 0" }}>No payments recorded</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(order.payments ?? []).map((pmt) => {
                  const pm = PAYMENT_META[pmt.status] ?? PAYMENT_META.pending;
                  return (
                    <div key={pmt.id} style={{ padding: "14px 16px", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: BRAND }}>#{pmt.id.slice(0, 8).toUpperCase()}</span>
                            <Badge color={pm.color} bg={pm.bg} dot={pm.color} label={pm.label} />
                          </div>
                          <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 2px", fontFamily: FFBody, textTransform: "capitalize" }}>
                            Method: {pmt.method.replace(/_/g, " ")}
                          </p>
                          <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>{fmtDate(pmt.created_at)}</p>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 18, color: BRAND, fontFamily: FF }}>{formatCurrency(pmt.amount)}</span>
                      </div>

                      {/* Proof image */}
                      {pmt.proof?.file_url && (
                        <div style={{ marginTop: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: FF }}>Payment Proof</p>
                          <a href={pmt.proof.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={pmt.proof.file_url} alt="Proof" style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, border: `1px solid ${BORDER}` }} />
                          </a>
                        </div>
                      )}

                      {pmt.admin_notes && (
                        <p style={{ fontSize: 12, color: "#64748B", fontFamily: FFBody, marginTop: 8, fontStyle: "italic" }}>
                          Admin note: {pmt.admin_notes}
                        </p>
                      )}

                      {/* Review actions for pending payments */}
                      {(pmt.status === "pending" || pmt.status === "on_hold") && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                          <input
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Admin notes (optional)"
                            style={{ ...S.inputSm, width: "100%", marginBottom: 8 }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handlePaymentReview(pmt.id, "paid")}
                              disabled={reviewingPayment === pmt.id}
                              style={S.approveBtn}
                              className="btn-h"
                            >
                              {reviewingPayment === pmt.id ? <Spinner size={13} /> : "✓ Approve Payment"}
                            </button>
                            <button
                              onClick={() => handlePaymentReview(pmt.id, "rejected")}
                              disabled={reviewingPayment === pmt.id}
                              style={S.rejectBtn}
                              className="btn-h"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Refund */}
          {order.status !== "cancelled" && (
            <Card
              title="Refunds"
              action={
                <button onClick={() => setShowRefund((v) => !v)} style={S.ghostSm} className="gh">
                  {showRefund ? "Hide" : "Process Refund"}
                </button>
              }
            >
              {order.refund_status && order.refund_status !== "none" && (
                <div style={{ padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E", margin: 0, fontFamily: FF }}>Refund Request: {order.refund_status}</p>
                  {order.refund_reason && <p style={{ fontSize: 12, color: "#92400E", margin: "4px 0 0", fontFamily: FFBody }}>{order.refund_reason}</p>}
                  {order.refund_amount && <p style={{ fontSize: 13, fontWeight: 700, color: BRAND, margin: "4px 0 0", fontFamily: FF }}>Amount: {formatCurrency(order.refund_amount)}</p>}
                </div>
              )}
              {showRefund && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
                  <input
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder={`Amount (max ${formatCurrency(order.total_amount)})`}
                    type="number"
                    style={S.inputSm}
                  />
                  <input
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Reason"
                    style={S.inputSm}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleRefund(true)}
                      disabled={refunding || !refundAmount}
                      style={{ ...S.primarySm, flex: 1 }}
                      className="btn-h"
                    >
                      {refunding ? <Spinner size={13} /> : "Partial Refund"}
                    </button>
                    <button
                      onClick={() => handleRefund(false)}
                      disabled={refunding}
                      style={{ ...S.ghostSm, flex: 1 }}
                      className="gh"
                    >
                      Full Refund ({formatCurrency(order.total_amount)})
                    </button>
                  </div>
                </div>
              )}
              {!showRefund && (!order.refund_status || order.refund_status === "none") && (
                <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FFBody }}>No refunds processed.</p>
              )}
            </Card>
          )}

          {/* Notes */}
          <Card title={`Order Notes (${notes.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {notes.length === 0 && (
                <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FFBody }}>No notes yet.</p>
              )}
              {notes.map((note) => (
                <div key={note.id} className="note-row" style={{ padding: "10px 14px", borderRadius: 10, background: note.is_internal ? "#FFFBEB" : SURFACE, border: `1px solid ${note.is_internal ? "#FDE68A" : BORDER}`, position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: BRAND, margin: "0 0 4px", fontFamily: FFBody, lineHeight: 1.5 }}>{note.content}</p>
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>
                        {note.is_internal ? "🔒 Internal" : "👤 Customer visible"} · {fmtShort(note.created_at)}
                      </p>
                    </div>
                    <button
                      className="del-note"
                      onClick={() => handleDeleteNote(note.id)}
                      style={{ opacity: 0, background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14, padding: "0 0 0 8px", transition: "opacity .15s", flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                rows={3}
                style={{ ...S.inputSm, resize: "vertical", minHeight: 80 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748B", fontFamily: FFBody, cursor: "pointer" }}>
                  <input type="checkbox" checked={noteInternal} onChange={(e) => setNoteInternal(e.target.checked)} style={{ accentColor: ACCENT }} />
                  Internal note
                </label>
                <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} style={S.primarySm} className="btn-h">
                  {addingNote ? <Spinner size={13} /> : "Add Note"}
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div style={S.rightCol}>

          {/* Status management */}
          <Card title="Order Status">
            <div style={{ marginBottom: 16 }}>
              <Badge {...orderMeta} />
              {order.cancelled_at && (
                <p style={{ fontSize: 12, color: "#94A3B8", margin: "8px 0 0", fontFamily: FFBody }}>Cancelled: {fmtShort(order.cancelled_at)}</p>
              )}
              {order.shipped_at && (
                <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0", fontFamily: FFBody }}>Shipped: {fmtShort(order.shipped_at)}</p>
              )}
              {order.delivered_at && (
                <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0", fontFamily: FFBody }}>Delivered: {fmtShort(order.delivered_at)}</p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)} style={S.selectSm}>
                <option value="">Force status to…</option>
                {ORDER_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {overrideStatus && (
                <input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Reason (optional)"
                  style={S.inputSm}
                />
              )}
              <button onClick={handleForceStatus} disabled={!overrideStatus || overriding} style={S.primarySm} className="btn-h">
                {overriding ? <Spinner size={13} /> : "Apply Status"}
              </button>
            </div>
          </Card>

          {/* Shipping */}
          <Card title="Shipping">
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px", fontFamily: FF }}>Current Status</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: 0, fontFamily: FF, textTransform: "capitalize" }}>{order.shipping_status.replace(/_/g, " ")}</p>
              {order.tracking_number && (
                <p style={{ fontSize: 13, color: ACCENT, margin: "6px 0 0", fontFamily: FFBody }}>🚚 {order.tracking_number}</p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select value={shipStatus} onChange={(e) => setShipStatus(e.target.value as ShippingStatus)} style={S.selectSm}>
                <option value="">Update shipping to…</option>
                {SHIP_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button onClick={handleShippingUpdate} disabled={!shipStatus || updatingShip} style={S.primarySm} className="btn-h">
                {updatingShip ? <Spinner size={13} /> : "Update Shipping"}
              </button>
            </div>

            {/* Shipping address */}
            {order.shipping_address && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: FF }}>Deliver To</p>
                <p style={{ fontSize: 13, color: "#475569", fontFamily: FFBody, lineHeight: 1.7, margin: 0 }}>
                  <strong style={{ color: BRAND }}>{order.shipping_address.full_name}</strong><br />
                  {order.shipping_address.phone && <>{order.shipping_address.phone}<br /></>}
                  {order.shipping_address.address_line1}<br />
                  {order.shipping_address.address_line2 && <>{order.shipping_address.address_line2}<br /></>}
                  {order.shipping_address.city}{order.shipping_address.district ? `, ${order.shipping_address.district}` : ""}<br />
                  {order.shipping_address.country}
                  {order.shipping_address.postal_code && <> · {order.shipping_address.postal_code}</>}
                </p>
              </div>
            )}
          </Card>

          {/* Customer */}
          <Card title="Customer">
            {(order as any).user ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: FF, flexShrink: 0 }}>
                    {((order as any).user?.full_name ?? (order as any).user?.email ?? "G")[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: 0, fontFamily: FF }}>{(order as any).user.full_name ?? "—"}</p>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>{(order as any).user.email}</p>
                  </div>
                </div>
                <Link href={`/admin/users/${(order as any).user.id}`} style={{ fontSize: 13, color: ACCENT, fontFamily: FFBody, textDecoration: "none" }}>
                  View customer profile →
                </Link>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FFBody }}>Guest order</p>
            )}
          </Card>

          {/* Order meta */}
          <Card title="Order Details">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Order ID", value: order.id, mono: true },
                { label: "Created", value: fmtDate(order.created_at) },
                { label: "Updated", value: fmtDate(order.updated_at) },
                { label: "Notes", value: order.notes ?? "—" },
                order.return_status && order.return_status !== "none" ? { label: "Return", value: order.return_status } : null,
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: FFBody, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 12, color: BRAND, fontFamily: row.mono ? "monospace" : FFBody, textAlign: "right", wordBreak: "break-all" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Hard delete confirm */}
      {showDeleteConfirm && (
        <div style={S.backdrop} onClick={() => setShowDeleteConfirm(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, textAlign: "center", fontFamily: FF, marginBottom: 8 }}>
              Permanently Delete Order?
            </h3>
            <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", fontFamily: FFBody, marginBottom: 24 }}>
              This action cannot be undone. The order and all associated data will be removed.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleHardDelete} disabled={deleting} style={{ ...S.dangerFull, flex: 1 }} className="btn-h">
                {deleting ? <Spinner size={14} /> : "Yes, Delete Permanently"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} style={S.ghostSm} className="gh">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1200, margin: "0 auto", padding: "24px 20px 60px", fontFamily: FF },
  toast: { position: "fixed", bottom: 24, right: 24, padding: "12px 22px", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: FF, zIndex: 9999, animation: "fadeUp .3s ease", boxShadow: "0 8px 32px rgba(0,0,0,.25)" },
  breadcrumb: { display: "flex", alignItems: "center", gap: 8, marginBottom: 20 },
  backLink: { fontSize: 13, color: "#64748B", textDecoration: "none", fontFamily: FFBody, transition: "color .15s" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 800, color: BRAND, letterSpacing: "-0.04em", margin: "0 0 4px", fontFamily: FF },
  sub: { fontSize: 13, color: "#94A3B8", margin: 0, fontFamily: FFBody },
  grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" },
  leftCol: { display: "flex", flexDirection: "column", gap: 16 },
  rightCol: { display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px", animation: "fadeUp .25s ease" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 800, color: BRAND, margin: 0, fontFamily: FF, textTransform: "uppercase", letterSpacing: "0.04em" },
  itemRow: { display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid #F8FAFC` },
  itemThumb: { width: 56, height: 56, borderRadius: 12, background: "#F1F5F9", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  inputSm: { padding: "9px 13px", border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13, outline: "none", background: "#fff", color: BRAND, width: "100%", transition: "border-color .15s" },
  selectSm: { padding: "9px 13px", border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13, outline: "none", background: "#fff", color: BRAND, cursor: "pointer", width: "100%" },
  primarySm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer", transition: "all .15s" },
  ghostSm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: `1px solid ${BORDER}`, background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FFBody, cursor: "pointer", transition: "background .12s", whiteSpace: "nowrap" },
  approveBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 16px", borderRadius: 9, background: "#10B981", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer", transition: "all .15s", flex: 1 },
  rejectBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 16px", borderRadius: 9, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", fontWeight: 700, fontSize: 13, fontFamily: FFBody, cursor: "pointer", transition: "all .15s" },
  dangerOutline: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 12, fontFamily: FFBody, cursor: "pointer", transition: "all .15s" },
  dangerFull: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", borderRadius: 10, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer", transition: "all .15s" },
  backdrop: { position: "fixed", inset: 0, background: "rgba(10,15,30,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" },
  modal: { background: "#fff", borderRadius: 20, padding: "32px", width: "100%", maxWidth: 440, animation: "fadeUp .2s ease", boxShadow: "0 24px 64px rgba(0,0,0,.2)" },
};