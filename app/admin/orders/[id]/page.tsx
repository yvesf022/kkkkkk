"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ordersApi, adminOrdersAdvancedApi, paymentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, Payment, OrderNote, OrderStatus, ShippingStatus } from "@/lib/types";

/* ─── Design tokens ─── */
const FF = "'Syne', 'DM Sans', -apple-system, sans-serif";
const FFBody = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";
const ACCENT2 = "#7C3AED";
const BORDER = "#E2E8F0";
const SURFACE = "#F8FAFF";
const SUCCESS = "#10B981";
const WARN = "#F59E0B";
const DANGER = "#EF4444";

/* ─── Status config ─── */
const ORDER_STATUS_META: Record<string, { color: string; bg: string; label: string; dot: string; border: string }> = {
  pending:   { color: "#92400E", bg: "#FFFBEB", label: "Pending",   dot: "#F59E0B", border: "#FDE68A" },
  paid:      { color: "#065F46", bg: "#ECFDF5", label: "Paid",      dot: "#10B981", border: "#A7F3D0" },
  shipped:   { color: "#1E40AF", bg: "#EFF6FF", label: "Shipped",   dot: "#3B82F6", border: "#BFDBFE" },
  completed: { color: "#166534", bg: "#F0FDF4", label: "Delivered", dot: "#22C55E", border: "#86EFAC" },
  cancelled: { color: "#9F1239", bg: "#FFF1F2", label: "Cancelled", dot: "#F43F5E", border: "#FECDD3" },
};
const PAYMENT_META: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  pending:  { color: "#92400E", bg: "#FFFBEB", label: "Pending",  dot: "#F59E0B" },
  on_hold:  { color: "#9A3412", bg: "#FFF7ED", label: "On Hold",  dot: "#F97316" },
  paid:     { color: "#065F46", bg: "#ECFDF5", label: "Paid",     dot: "#10B981" },
  rejected: { color: "#9F1239", bg: "#FFF1F2", label: "Rejected", dot: "#F43F5E" },
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
const CARRIERS = ["DHL", "FedEx", "UPS", "USPS", "Aramex", "PostNet", "Lesotho Post", "Other"];

/* ─── Timeline events builder ─── */
function buildTimeline(order: Order) {
  const events: { label: string; ts: string | null; icon: string; color: string }[] = [];
  if (order.created_at) events.push({ label: "Order placed", ts: order.created_at, icon: "📋", color: "#64748B" });
  const firstPaid = (order.payments ?? []).find(p => p.status === "paid");
  if (firstPaid) events.push({ label: "Payment confirmed", ts: firstPaid.updated_at ?? firstPaid.created_at, icon: "✅", color: SUCCESS });
  if ((order as any).shipped_at) events.push({ label: "Order shipped", ts: (order as any).shipped_at, icon: "🚚", color: ACCENT });
  if ((order as any).delivered_at) events.push({ label: "Delivered", ts: (order as any).delivered_at, icon: "📦", color: SUCCESS });
  if ((order as any).cancelled_at) events.push({ label: "Cancelled", ts: (order as any).cancelled_at, icon: "✕", color: DANGER });
  if (order.return_status && order.return_status !== "none") events.push({ label: `Return ${order.return_status}`, ts: null, icon: "↩", color: WARN });
  if (order.refund_status && order.refund_status !== "none") events.push({ label: `Refund ${order.refund_status}`, ts: null, icon: "💰", color: "#7C3AED" });
  return events.sort((a, b) => {
    if (!a.ts) return 1;
    if (!b.ts) return -1;
    return new Date(a.ts).getTime() - new Date(b.ts).getTime();
  });
}

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
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtShort(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ─── Section card ─── */
function Card({ title, children, action, accent }: { title: string; children: React.ReactNode; action?: React.ReactNode; accent?: string }) {
  return (
    <div style={{ ...S.card, ...(accent ? { borderLeft: `3px solid ${accent}` } : {}) }}>
      <div style={S.cardHeader}>
        <h3 style={S.cardTitle}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Badge ─── */
function Badge({ color, bg, dot, label, border }: { color: string; bg: string; dot: string; label: string; border?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, color, background: bg, fontFamily: FF, border: `1px solid ${border ?? "transparent"}` }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

/* ─── Row ─── */
function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "8px 0", borderBottom: `1px solid #F8FAFC` }}>
      <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: FFBody, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: BRAND, fontFamily: mono ? "monospace" : FFBody, textAlign: "right", wordBreak: "break-all", fontWeight: 600 }}>{value}</span>
    </div>
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

  /* Tracking */
  const [showTracking, setShowTracking] = useState(false);
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [trackingEta, setTrackingEta] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  /* Return management */
  const [showReturnMgmt, setShowReturnMgmt] = useState(false);
  const [returnAction, setReturnAction] = useState<"approve" | "reject" | "complete" | "">("");
  const [returnNote, setReturnNote] = useState("");
  const [processingReturn, setProcessingReturn] = useState(false);

  /* Refund */
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  /* Refund status */
  const [refundStatusUpdate, setRefundStatusUpdate] = useState("");
  const [updatingRefundStatus, setUpdatingRefundStatus] = useState(false);

  /* Payment review */
  const [reviewingPayment, setReviewingPayment] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  /* Hard delete / cancel / restore */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [restoring, setRestoring] = useState(false);

  /* Copy helper */
  const [copiedField, setCopiedField] = useState<string | null>(null);
  function copyText(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }

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
      if (orderData.status === "fulfilled") {
        const o = orderData.value;
        setOrder(o);
        // Pre-fill tracking if exists
        const t = (o as any).tracking;
        if (t) {
          setTrackingCarrier(t.carrier ?? "");
          setTrackingNumber(t.tracking_number ?? "");
          setTrackingUrl(t.tracking_url ?? "");
          setTrackingEta(t.estimated_delivery ? t.estimated_delivery.split("T")[0] : "");
        }
      }
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
    } finally { setOverriding(false); }
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
    } finally { setUpdatingShip(false); }
  }

  async function handleSaveTracking() {
    if (!trackingNumber.trim()) { showToast("Tracking number required", "warn"); return; }
    setSavingTracking(true);
    try {
      await adminOrdersAdvancedApi.saveTracking(orderId, {
        carrier: trackingCarrier,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        estimated_delivery: trackingEta || null,
      });
      showToast("Tracking info saved — customer notified");
      setShowTracking(false);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed to save tracking", "err");
    } finally { setSavingTracking(false); }
  }

  async function handleReturnAction() {
    if (!returnAction) return;
    setProcessingReturn(true);
    try {
      await adminOrdersAdvancedApi.manageReturn(orderId, { action: returnAction, note: returnNote });
      showToast(`Return ${returnAction}d`);
      setShowReturnMgmt(false);
      setReturnAction(""); setReturnNote("");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally { setProcessingReturn(false); }
  }

  async function handleUpdateRefundStatus() {
    if (!refundStatusUpdate) return;
    setUpdatingRefundStatus(true);
    try {
      await adminOrdersAdvancedApi.updateRefundStatus(orderId, { status: refundStatusUpdate });
      showToast("Refund status updated");
      setRefundStatusUpdate("");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally { setUpdatingRefundStatus(false); }
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
    } finally { setRefunding(false); }
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
    } finally { setReviewingPayment(null); }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await adminOrdersAdvancedApi.addNote(orderId, { content: noteText, is_internal: noteInternal });
      showToast(noteInternal ? "Internal note added" : "Customer note added — customer notified");
      setNoteText("");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally { setAddingNote(false); }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      await adminOrdersAdvancedApi.deleteNote(orderId, noteId);
      showToast("Note deleted");
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e: any) { showToast(e?.message ?? "Failed", "err"); }
  }

  async function handleHardDelete() {
    setDeleting(true);
    try {
      await adminOrdersAdvancedApi.hardDelete(orderId);
      showToast("Order permanently deleted");
      setTimeout(() => router.push("/admin/orders"), 1200);
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally { setDeleting(false); }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await adminOrdersAdvancedApi.forceStatus(orderId, { status: "cancelled", reason: "Cancelled by admin" });
      showToast("Order cancelled");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally { setCancelling(false); }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      await adminOrdersAdvancedApi.restore(orderId);
      showToast("Order restored");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    } finally { setRestoring(false); }
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
  const toastBg = toast?.type === "ok" ? SUCCESS : toast?.type === "warn" ? WARN : DANGER;
  const timeline = buildTimeline(order);
  const addr = order.shipping_address as any;
  const tracking = (order as any).tracking;
  const hasReturn = order.return_status && order.return_status !== "none";
  const hasRefund = order.refund_status && order.refund_status !== "none";

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        * { box-sizing: border-box; }
        .btn-h:hover { opacity: .85; transform: translateY(-1px); }
        .gh:hover { background: #F1F5F9 !important; }
        .note-row:hover .del-note { opacity: 1 !important; }
        textarea, input, select { font-family: ${FFBody}; }
        input[type="date"] { color-scheme: light; }
        .copy-btn { opacity: 0.5; transition: opacity .15s; cursor: pointer; }
        .copy-btn:hover { opacity: 1; }
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toastBg }}>
          {toast.type === "ok" ? "✓" : toast.type === "warn" ? "⚠" : "✗"} {toast.msg}
        </div>
      )}

      {/* ── Breadcrumb ── */}
      <div style={S.breadcrumb}>
        <Link href="/admin/orders" style={S.backLink}>← Orders</Link>
        <span style={{ color: "#CBD5E1", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 13, color: "#64748B", fontFamily: FFBody }}>#{orderId.slice(0, 8).toUpperCase()}</span>
      </div>

      {/* ── Header ── */}
      <div style={S.pageHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
            <h1 style={S.title}>Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <Badge {...orderMeta} />
            {hasReturn && <Badge color="#92400E" bg="#FFFBEB" dot="#F59E0B" label={`Return: ${order.return_status}`} />}
            {hasRefund && <Badge color="#7C3AED" bg="#F5F3FF" dot="#7C3AED" label={`Refund: ${order.refund_status}`} />}
          </div>
          <p style={S.sub}>
            Created {fmtDate(order.created_at)}
            {(order as any).user?.email && (
              <> · <span style={{ color: ACCENT }}>{(order as any).user.email}</span></>
            )}
          </p>
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
          <button onClick={() => setShowDeleteConfirm(true)} style={{ ...S.dangerOutline, color: DANGER, borderColor: "#FECACA" }} className="btn-h">
            Hard Delete
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={S.grid}>

        {/* ══ LEFT COLUMN ══ */}
        <div style={S.leftCol}>

          {/* Order items */}
          <Card title="Order Items">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(order.items ?? []).map((item) => (
                <div key={item.id} style={S.itemRow}>
                  <div style={S.itemThumb}>
                    {item.product?.main_image ? (
                      <img src={item.product.main_image} alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : <span style={{ fontSize: 22 }}>📦</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 2px", fontFamily: FF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </p>
                    {item.product?.brand && (
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 2px", fontFamily: FFBody }}>{item.product.brand}</p>
                    )}
                    {item.variant && (
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>
                        {Object.entries(item.variant.attributes ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                    )}
                    {item.product?.sku && (
                      <p style={{ fontSize: 11, color: "#CBD5E1", margin: "2px 0 0", fontFamily: "monospace" }}>SKU: {item.product.sku}</p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: BRAND, margin: "0 0 2px", fontFamily: FF }}>{formatCurrency(item.subtotal)}</p>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>{formatCurrency(item.price)} × {item.quantity}</p>
                  </div>
                </div>
              ))}
              <div style={{ padding: "14px 16px 0", borderTop: `1px solid ${BORDER}`, marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#64748B", fontFamily: FFBody }}>Subtotal ({order.items?.length ?? 0} items)</span>
                  <span style={{ fontSize: 13, color: "#64748B", fontFamily: FFBody }}>{formatCurrency(order.total_amount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: BRAND, fontFamily: FF }}>Total</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: BRAND, fontFamily: FF }}>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Shipping Address (PROMINENT) ── */}
          {addr && (
            <Card title="Shipping Address" accent={ACCENT}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontFamily: FF }}>Deliver To</p>
                  <div style={{ background: "#F8FAFC", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px" }}>
                    {addr.full_name && <strong style={{ display: "block", color: BRAND, fontFamily: FF, fontSize: 15, marginBottom: 6 }}>{addr.full_name}</strong>}
                    <div style={{ fontSize: 13, color: "#475569", fontFamily: FFBody, lineHeight: 1.85 }}>
                      {addr.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span>📞</span>
                          <a href={`tel:${addr.phone}`} style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>{addr.phone}</a>
                        </div>
                      )}
                      {addr.address_line1 && <div>📍 {addr.address_line1}</div>}
                      {addr.address_line2 && <div style={{ paddingLeft: 20 }}>{addr.address_line2}</div>}
                      {(addr.city || addr.district) && (
                        <div>{[addr.city, addr.district].filter(Boolean).join(", ")}</div>
                      )}
                      {addr.country && <div>{addr.country}{addr.postal_code ? ` · ${addr.postal_code}` : ""}</div>}
                    </div>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontFamily: FF }}>Quick Actions</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {addr.phone && (
                      <a href={`https://wa.me/${addr.phone.replace(/\D/g, "")}?text=Hi ${encodeURIComponent(addr.full_name ?? "")}, regarding your order %23${order.id.slice(0,8).toUpperCase()}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 9, background: "#F0FFF4", border: "1px solid #A7F3D0", color: "#065F46", textDecoration: "none", fontSize: 13, fontWeight: 600, fontFamily: FFBody }}>
                        <span>💬</span> WhatsApp Customer
                      </a>
                    )}
                    <button
                      onClick={() => copyText(`${addr.full_name ?? ""}\n${addr.phone ?? ""}\n${addr.address_line1 ?? ""}\n${[addr.city, addr.district, addr.country].filter(Boolean).join(", ")}`, "addr")}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 9, background: "#F8FAFC", border: `1px solid ${BORDER}`, color: "#64748B", fontSize: 13, fontWeight: 600, fontFamily: FFBody, cursor: "pointer" }}>
                      <span>{copiedField === "addr" ? "✓" : "📋"}</span>
                      {copiedField === "addr" ? "Copied!" : "Copy Address"}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}

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
                            <code style={{ fontSize: 12, fontWeight: 700, color: BRAND }}>{pmt.id.slice(0, 8).toUpperCase()}</code>
                            <Badge color={pm.color} bg={pm.bg} dot={pm.dot} label={pm.label} />
                          </div>
                          <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 2px", fontFamily: FFBody, textTransform: "capitalize" }}>
                            {pmt.method.replace(/_/g, " ")}
                          </p>
                          <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>{fmtDate(pmt.created_at)}</p>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 18, color: BRAND, fontFamily: FF }}>{formatCurrency(pmt.amount)}</span>
                      </div>

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

                      {(pmt.status === "pending" || pmt.status === "on_hold") && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                          <input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Admin notes (optional)" style={{ ...S.inputSm, width: "100%", marginBottom: 8 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handlePaymentReview(pmt.id, "paid")} disabled={reviewingPayment === pmt.id} style={S.approveBtn} className="btn-h">
                              {reviewingPayment === pmt.id ? <Spinner size={13} /> : "✓ Approve"}
                            </button>
                            <button onClick={() => handlePaymentReview(pmt.id, "rejected")} disabled={reviewingPayment === pmt.id} style={S.rejectBtn} className="btn-h">
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

          {/* Refund Management */}
          <Card
            title="Refund Management"
            accent={hasRefund ? "#7C3AED" : undefined}
            action={
              <button onClick={() => setShowRefund((v) => !v)} style={S.ghostSm} className="gh">
                {showRefund ? "Hide" : "Process Refund"}
              </button>
            }
          >
            {/* Current refund status */}
            {hasRefund && (
              <div style={{ padding: "12px 14px", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", margin: "0 0 2px", fontFamily: FF }}>
                      Refund {order.refund_status?.replace(/_/g, " ")}
                    </p>
                    {order.refund_reason && <p style={{ fontSize: 12, color: "#6D28D9", margin: 0, fontFamily: FFBody }}>{order.refund_reason}</p>}
                  </div>
                  {order.refund_amount && (
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#7C3AED", fontFamily: FF }}>{formatCurrency(order.refund_amount)}</span>
                  )}
                </div>
                {/* Update refund status */}
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <select value={refundStatusUpdate} onChange={(e) => setRefundStatusUpdate(e.target.value)}
                    style={{ ...S.selectSm, flex: 1 }}>
                    <option value="">Update status…</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button onClick={handleUpdateRefundStatus} disabled={!refundStatusUpdate || updatingRefundStatus} style={S.primarySm} className="btn-h">
                    {updatingRefundStatus ? <Spinner size={13} /> : "Update"}
                  </button>
                </div>
              </div>
            )}

            {showRefund && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Partial amount (max ${formatCurrency(order.total_amount)})`}
                  type="number" style={S.inputSm} />
                <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason" style={S.inputSm} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleRefund(true)} disabled={refunding || !refundAmount}
                    style={{ ...S.primarySm, flex: 1 }} className="btn-h">
                    {refunding ? <Spinner size={13} /> : "Partial Refund"}
                  </button>
                  <button onClick={() => handleRefund(false)} disabled={refunding}
                    style={{ ...S.ghostSm, flex: 1 }} className="gh">
                    Full ({formatCurrency(order.total_amount)})
                  </button>
                </div>
              </div>
            )}

            {!showRefund && !hasRefund && (
              <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FFBody }}>No refunds processed.</p>
            )}
          </Card>

          {/* Return Management */}
          {hasReturn && (
            <Card title="Return Request" accent={WARN}>
              <div style={{ padding: "12px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E", margin: "0 0 2px", fontFamily: FF }}>
                      Status: {order.return_status?.replace(/_/g, " ")}
                    </p>
                    {order.return_reason && <p style={{ fontSize: 12, color: "#92400E", margin: 0, fontFamily: FFBody }}>{order.return_reason}</p>}
                  </div>
                  <button onClick={() => setShowReturnMgmt((v) => !v)} style={S.ghostSm} className="gh">
                    {showReturnMgmt ? "Hide" : "Manage"}
                  </button>
                </div>
              </div>

              {showReturnMgmt && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(["approve", "reject", "complete"] as const).map((action) => (
                      <button key={action}
                        onClick={() => setReturnAction(action)}
                        style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${returnAction === action ? ACCENT : BORDER}`, background: returnAction === action ? ACCENT : "#fff", color: returnAction === action ? "#fff" : "#475569", fontSize: 13, fontWeight: 600, fontFamily: FFBody, cursor: "pointer", textTransform: "capitalize" }}>
                        {action}
                      </button>
                    ))}
                  </div>
                  {returnAction && (
                    <>
                      <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)}
                        placeholder={`Note for ${returnAction}ing return…`} rows={2}
                        style={{ ...S.inputSm, resize: "vertical" }} />
                      <button onClick={handleReturnAction} disabled={processingReturn}
                        style={{ ...S.primarySm, width: "100%" }} className="btn-h">
                        {processingReturn ? <Spinner size={13} /> : `Confirm ${returnAction}`}
                      </button>
                    </>
                  )}
                </div>
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
                <div key={note.id} className="note-row"
                  style={{ padding: "10px 14px", borderRadius: 10, background: note.is_internal ? "#FFFBEB" : SURFACE, border: `1px solid ${note.is_internal ? "#FDE68A" : BORDER}`, position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: BRAND, margin: "0 0 4px", fontFamily: FFBody, lineHeight: 1.5 }}>{note.content}</p>
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>
                        {note.is_internal ? "🔒 Internal" : "👤 Visible to customer"} · {fmtShort(note.created_at)}
                      </p>
                    </div>
                    <button className="del-note" onClick={() => handleDeleteNote(note.id)}
                      style={{ opacity: 0, background: "none", border: "none", cursor: "pointer", color: DANGER, fontSize: 14, padding: "0 0 0 8px", transition: "opacity .15s", flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…" rows={3}
                style={{ ...S.inputSm, resize: "vertical", minHeight: 80 }} />
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

        {/* ══ RIGHT COLUMN ══ */}
        <div style={S.rightCol}>

          {/* Order Status */}
          <Card title="Order Status">
            <div style={{ marginBottom: 16 }}>
              <Badge {...orderMeta} />
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {order.created_at && <InfoRow label="Created" value={fmtShort(order.created_at)} />}
                {(order as any).shipped_at && <InfoRow label="Shipped" value={fmtShort((order as any).shipped_at)} />}
                {(order as any).delivered_at && <InfoRow label="Delivered" value={fmtShort((order as any).delivered_at)} />}
                {(order as any).cancelled_at && <InfoRow label="Cancelled" value={fmtShort((order as any).cancelled_at)} />}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)} style={S.selectSm}>
                <option value="">Force status to…</option>
                {ORDER_STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              {overrideStatus && (
                <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Reason (optional)" style={S.inputSm} />
              )}
              <button onClick={handleForceStatus} disabled={!overrideStatus || overriding} style={S.primarySm} className="btn-h">
                {overriding ? <Spinner size={13} /> : "Apply Status"}
              </button>
            </div>
          </Card>

          {/* Shipping & Tracking */}
          <Card title="Shipping & Tracking" accent={tracking ? SUCCESS : undefined}>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px", fontFamily: FF }}>Shipping Status</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: 0, fontFamily: FF, textTransform: "capitalize" }}>{order.shipping_status?.replace(/_/g, " ") ?? "Pending"}</p>
            </div>

            {/* Tracking summary */}
            {tracking && (
              <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 10, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    {tracking.carrier && <p style={{ fontSize: 12, fontWeight: 700, color: "#065F46", margin: "0 0 2px", fontFamily: FF }}>{tracking.carrier}</p>}
                    <p style={{ fontSize: 13, color: BRAND, margin: "0 0 2px", fontFamily: "monospace", fontWeight: 700 }}>{tracking.tracking_number}</p>
                    {tracking.estimated_delivery && <p style={{ fontSize: 12, color: "#64748B", margin: 0, fontFamily: FFBody }}>ETA: {fmtShort(tracking.estimated_delivery)}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {tracking.tracking_url && (
                      <a href={tracking.tracking_url} target="_blank" rel="noreferrer"
                        style={{ padding: "5px 10px", background: "#065F46", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        Track →
                      </a>
                    )}
                    <button className="copy-btn"
                      onClick={() => copyText(tracking.tracking_number, "tracking")}
                      style={{ padding: "5px 10px", background: "none", border: `1px solid #A7F3D0`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#065F46", cursor: "pointer" }}>
                      {copiedField === "tracking" ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Shipping status update */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <select value={shipStatus} onChange={(e) => setShipStatus(e.target.value as ShippingStatus)} style={S.selectSm}>
                <option value="">Update shipping status…</option>
                {SHIP_STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <button onClick={handleShippingUpdate} disabled={!shipStatus || updatingShip} style={S.primarySm} className="btn-h">
                {updatingShip ? <Spinner size={13} /> : "Update Shipping"}
              </button>
            </div>

            {/* Tracking form toggle */}
            <button onClick={() => setShowTracking((v) => !v)}
              style={{ width: "100%", padding: "9px 14px", background: showTracking ? "#EFF6FF" : "transparent", border: `1px dashed ${ACCENT}`, borderRadius: 9, color: ACCENT, fontSize: 13, fontWeight: 600, fontFamily: FFBody, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              🚚 {tracking ? "Edit Tracking Info" : "Add Tracking Info"}
            </button>

            {showTracking && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, padding: "14px", background: "#F8FAFF", borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <select value={trackingCarrier} onChange={(e) => setTrackingCarrier(e.target.value)} style={S.selectSm}>
                  <option value="">Select carrier…</option>
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Tracking number *" style={S.inputSm} />
                <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="Tracking URL (optional)" style={S.inputSm} />
                <input value={trackingEta} onChange={(e) => setTrackingEta(e.target.value)}
                  type="date" placeholder="Estimated delivery" style={S.inputSm} />
                <button onClick={handleSaveTracking} disabled={savingTracking || !trackingNumber.trim()} style={{ ...S.primarySm, width: "100%" }} className="btn-h">
                  {savingTracking ? <Spinner size={13} /> : "Save & Notify Customer"}
                </button>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: 0, fontFamily: FF }}>{(order as any).user.full_name ?? "—"}</p>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, fontFamily: FFBody, overflow: "hidden", textOverflow: "ellipsis" }}>{(order as any).user.email}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Link href={`/admin/users/${(order as any).user.id}`}
                    style={{ fontSize: 13, color: ACCENT, fontFamily: FFBody, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    View customer profile →
                  </Link>
                  {(order as any).user?.phone && (
                    <a href={`https://wa.me/${((order as any).user.phone).replace(/\D/g, "")}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, color: "#065F46", fontFamily: FFBody, textDecoration: "none" }}>
                      💬 WhatsApp {(order as any).user.phone}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FFBody }}>Guest order</p>
            )}
          </Card>

          {/* Order Details */}
          <Card title="Order Details">
            <InfoRow label="Order ID"
              value={
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <code style={{ fontSize: 11 }}>{order.id.slice(0, 12)}…</code>
                  <button className="copy-btn" onClick={() => copyText(order.id, "id")}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: copiedField === "id" ? SUCCESS : "#94A3B8", padding: 0 }}>
                    {copiedField === "id" ? "✓" : "copy"}
                  </button>
                </div>
              } />
            <InfoRow label="Created" value={fmtDate(order.created_at)} />
            <InfoRow label="Updated" value={fmtDate(order.updated_at)} />
            <InfoRow label="Order Notes" value={order.notes ?? "—"} />
            {order.return_status && order.return_status !== "none" && (
              <InfoRow label="Return Status" value={order.return_status.replace(/_/g, " ")} />
            )}
            {order.refund_status && order.refund_status !== "none" && (
              <InfoRow label="Refund Status" value={order.refund_status.replace(/_/g, " ")} />
            )}
          </Card>

          {/* Order Timeline */}
          <Card title="Order Timeline">
            {timeline.length === 0 ? (
              <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FFBody }}>No events yet.</p>
            ) : (
              <div style={{ position: "relative", paddingLeft: 28 }}>
                {/* Vertical line */}
                <div style={{ position: "absolute", left: 10, top: 10, bottom: 10, width: 2, background: `linear-gradient(to bottom, ${ACCENT}, ${BORDER})`, borderRadius: 2 }} />
                {timeline.map((event, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: i < timeline.length - 1 ? 18 : 0 }}>
                    {/* Dot */}
                    <div style={{ position: "absolute", left: -24, top: 2, width: 14, height: 14, borderRadius: "50%", background: event.color, border: "2px solid #fff", boxShadow: `0 0 0 2px ${event.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7 }}>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: "0 0 1px", fontFamily: FFBody }}>{event.label}</p>
                    {event.ts && (
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>{fmtDate(event.ts)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
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
              This action cannot be undone. The order and all associated data will be permanently removed.
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
  grid: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20, alignItems: "start" },
  leftCol: { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },
  rightCol: { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },
  card: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px", animation: "fadeUp .25s ease" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 800, color: BRAND, margin: 0, fontFamily: FF, textTransform: "uppercase", letterSpacing: "0.05em" },
  itemRow: { display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid #F8FAFC` },
  itemThumb: { width: 56, height: 56, borderRadius: 12, background: "#F1F5F9", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  inputSm: { padding: "9px 13px", border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13, outline: "none", background: "#fff", color: BRAND, width: "100%", transition: "border-color .15s" },
  selectSm: { padding: "9px 13px", border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13, outline: "none", background: "#fff", color: BRAND, cursor: "pointer", width: "100%" },
  primarySm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer", transition: "all .15s" },
  ghostSm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: `1px solid ${BORDER}`, background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FFBody, cursor: "pointer", transition: "background .12s", whiteSpace: "nowrap" },
  approveBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 16px", borderRadius: 9, background: SUCCESS, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer", flex: 1 },
  rejectBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 16px", borderRadius: 9, background: "#FEF2F2", color: DANGER, border: "1px solid #FECACA", fontWeight: 700, fontSize: 13, fontFamily: FFBody, cursor: "pointer" },
  dangerOutline: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid #FECACA", background: "#FEF2F2", color: DANGER, fontWeight: 700, fontSize: 12, fontFamily: FFBody, cursor: "pointer", transition: "all .15s" },
  dangerFull: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", borderRadius: 10, border: "none", background: DANGER, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer" },
  backdrop: { position: "fixed", inset: 0, background: "rgba(10,15,30,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" },
  modal: { background: "#fff", borderRadius: 20, padding: "32px", width: "100%", maxWidth: 440, animation: "fadeUp .2s ease", boxShadow: "0 24px 64px rgba(0,0,0,.2)" },
};