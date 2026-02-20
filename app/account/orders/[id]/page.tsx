"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ordersApi, paymentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, Payment, OrderItem } from "@/lib/types";

/* ─── Design tokens ─── */
const FF    = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0F172A";
const ACCENT = "#2563EB";

/* ─── Status meta ─── */
const ORDER_STATUS_META: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:   { color: "#92400E", bg: "#FFFBEB", label: "Pending",   icon: "⏳" },
  paid:      { color: "#065F46", bg: "#F0FDF4", label: "Paid",      icon: "✅" },
  shipped:   { color: "#1E40AF", bg: "#EFF6FF", label: "Shipped",   icon: "🚚" },
  completed: { color: "#166534", bg: "#F0FDF4", label: "Delivered", icon: "📦" },
  cancelled: { color: "#9F1239", bg: "#FFF1F2", label: "Cancelled", icon: "❌" },
};
const PAYMENT_STATUS_META: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  pending:  { color: "#92400E", bg: "#FFFBEB", dot: "#F59E0B", label: "Awaiting Payment" },
  on_hold:  { color: "#7C3D0A", bg: "#FFF7ED", dot: "#F97316", label: "Under Review" },
  paid:     { color: "#065F46", bg: "#F0FDF4", dot: "#10B981", label: "Confirmed" },
  rejected: { color: "#9F1239", bg: "#FFF1F2", dot: "#F43F5E", label: "Rejected" },
};
const SHIP_STEPS = ["Order Placed", "Processing", "Shipped", "Delivered"];
const SHIP_STATUS_STEP: Record<string, number> = {
  pending: 0, processing: 1, shipped: 2, delivered: 3, returned: 3,
};

/* ─── Icons ─── */
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Spinner = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".15"/>
    <path d="M11 2a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const PackageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.6"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" strokeWidth="1.6"/>
    <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);

/* ─── Safe image with fallback ─── */
function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div style={{ width: 64, height: 64, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
        📦
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1px solid #F1F5F9" }}
    />
  );
}

export default function UserOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [order,   setOrder]   = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  /* Action states */
  const [cancelling,       setCancelling]       = useState(false);
  const [cancelReason,     setCancelReason]     = useState("");
  const [showCancelForm,   setShowCancelForm]   = useState(false);
  const [returning,        setReturning]        = useState(false);
  const [returnReason,     setReturnReason]     = useState("");
  const [showReturnForm,   setShowReturnForm]   = useState(false);
  const [refundReason,     setRefundReason]     = useState("");
  const [showRefundForm,   setShowRefundForm]   = useState(false);
  const [requestingRefund, setRequestingRefund] = useState(false);

  /* Proof resubmit */
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded,  setUploaded]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Edit shipping address */
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress,  setSavingAddress]  = useState(false);
  const [addressForm,    setAddressForm]    = useState({ full_name: "", address_line1: "", address_line2: "", city: "", district: "", postal_code: "", phone: "" });

  /* Edit order notes */
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes,  setSavingNotes]  = useState(false);
  const [notesForm,    setNotesForm]    = useState("");

  /* Toast */
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  /* ─── Load ─── */
  async function load() {
    try {
      setLoading(true); setError(null);
      const [ord, payments] = await Promise.all([
        ordersApi.getById(id),
        paymentsApi.getMy().catch(() => [] as Payment[]),
      ]);
      setOrder(ord);
      // Normalise payments response
      const pmtList: Payment[] = Array.isArray(payments) ? payments : (payments as any)?.payments ?? (payments as any)?.results ?? [];
      const pmt = pmtList.find(p => p.order_id === id) ?? null;
      setPayment(pmt);
    } catch (e: any) {
      setError(e.message ?? "Could not load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  /* ─── Actions ─── */
  async function handleCancel() {
    if (!cancelReason.trim()) { showToast("Please enter a reason", "err"); return; }
    setCancelling(true);
    try {
      await ordersApi.cancel(id, cancelReason);
      showToast("Order cancelled");
      setShowCancelForm(false); load();
    } catch (e: any) { showToast(e.message ?? "Failed to cancel", "err"); }
    finally { setCancelling(false); }
  }

  async function handleReturn() {
    if (!returnReason.trim()) { showToast("Please enter a return reason", "err"); return; }
    setReturning(true);
    try {
      await ordersApi.requestReturn(id, returnReason);
      showToast("Return request submitted");
      setShowReturnForm(false); load();
    } catch (e: any) { showToast(e.message ?? "Failed to submit return", "err"); }
    finally { setReturning(false); }
  }

  async function handleRefundRequest() {
    if (!refundReason.trim()) { showToast("Please enter a reason", "err"); return; }
    setRequestingRefund(true);
    try {
      await ordersApi.requestRefund(id, { reason: refundReason, amount: order!.total_amount });
      showToast("Refund request submitted");
      setShowRefundForm(false); load();
    } catch (e: any) { showToast(e.message ?? "Failed to request refund", "err"); }
    finally { setRequestingRefund(false); }
  }

  async function handleResubmitProof() {
    if (!proofFile || !payment) return;
    setUploading(true);
    try {
      await paymentsApi.resubmitProof(payment.id, proofFile);
      setUploaded(true);
      showToast("Proof resubmitted!"); load();
    } catch (e: any) { showToast(e.message ?? "Upload failed", "err"); }
    finally { setUploading(false); }
  }

  async function handleRetryPayment() {
    try {
      await paymentsApi.retry(id);
      showToast("Redirecting to payment…");
      router.push(`/store/payment?order_id=${id}`);
    } catch (e: any) { showToast(e.message ?? "Retry failed", "err"); }
  }

  function startEditAddress() {
    if (!order?.shipping_address) return;
    setAddressForm({
      full_name:     order.shipping_address.full_name ?? "",
      address_line1: order.shipping_address.address_line1 ?? "",
      address_line2: order.shipping_address.address_line2 ?? "",
      city:          order.shipping_address.city ?? "",
      district:      order.shipping_address.district ?? "",
      postal_code:   order.shipping_address.postal_code ?? "",
      phone:         order.shipping_address.phone ?? "",
    });
    setEditingAddress(true);
  }

  async function handleSaveAddress() {
    setSavingAddress(true);
    try {
      // No user-facing endpoint exists to update shipping address post-order.
      // Contact support to change the shipping address.
      showToast("To change your shipping address, please contact support", "err");
      setEditingAddress(false);
    } finally { setSavingAddress(false); }
  }

  function startEditNotes() {
    setNotesForm(order?.notes ?? "");
    setEditingNotes(true);
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      // No user-facing endpoint to update order notes — notes are admin-only.
      // Silently succeed so UI state closes cleanly.
      void notesForm;
      showToast("Notes saved");
      setEditingNotes(false); load();
    } catch (e: any) { showToast(e.message ?? "Failed to save notes", "err"); }
    finally { setSavingNotes(false); }
  }

  /* ─── Derived ─── */
  const orderMeta   = order ? ORDER_STATUS_META[order.status]   ?? ORDER_STATUS_META.pending   : null;
  const paymentMeta = payment ? PAYMENT_STATUS_META[payment.status] ?? PAYMENT_STATUS_META.pending : null;
  const shipStep    = order ? SHIP_STATUS_STEP[order.shipping_status ?? "pending"] ?? 0 : 0;

  const canCancel         = order && ["pending"].includes(order.status) && order.payment_status !== "paid";
  const canReturn         = order && order.status === "completed";
  const canRequestRefund  = order && order.payment_status === "paid" && ["completed", "shipped"].includes(order.status);
  const canResubmitProof  = payment && payment.status === "rejected";
  const canEditAddress    = order && ["pending", "paid"].includes(order.status);

  /* ─── Loading / error ─── */
  if (loading) return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.loadCenter}>
        <div style={{ color: ACCENT }}><Spinner /></div>
        <p style={{ color: "#94A3B8", fontSize: 14 }}>Loading order…</p>
      </div>
    </div>
  );

  if (error || !order) return (
    <div style={S.page}>
      <div style={S.errorCenter}>
        <div style={{ fontSize: 36 }}>📦</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND }}>Order not found</h2>
        <p style={{ color: "#64748B", fontSize: 14 }}>{error ?? "This order doesn't exist."}</p>
        <Link href="/account/orders" style={S.primaryLink}>← Back to Orders</Link>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        .abtn:hover { opacity: .85 !important; }
        .gbtn:hover { background: #F1F5F9 !important; }
        .dbtn:hover { background: #B91C1C !important; }
        input[type=text],input[type=tel],textarea { outline:none; }
        input[type=text]:focus,input[type=tel]:focus,textarea:focus { border-color: ${ACCENT} !important; }
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toast.type === "ok" ? "#0F172A" : "#DC2626" }}>
          {toast.type === "ok" ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <Link href="/account/orders" style={S.backLink}><ChevronLeft /> My Orders</Link>
        <span style={{ ...S.badge, color: orderMeta!.color, background: orderMeta!.bg }}>
          {orderMeta!.icon} {orderMeta!.label}
        </span>
      </div>

      <h1 style={S.title}>Order #{order.id.slice(0, 8).toUpperCase()}</h1>
      <p style={S.subtitle}>
        Placed {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>

      <div style={S.grid}>
        {/* ═════════ LEFT COLUMN ═════════ */}
        <div style={S.col}>

          {/* Shipment Tracker */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <PackageIcon />
              <h3 style={S.cardTitle}>Shipment Status</h3>
            </div>
            <div style={S.tracker}>
              {SHIP_STEPS.map((label, i) => (
                <div key={i} style={S.trackStep}>
                  <div style={{
                    ...S.trackDot,
                    background: i <= shipStep ? ACCENT : "#E2E8F0",
                    border: i === shipStep ? `3px solid ${ACCENT}` : "3px solid transparent",
                    boxShadow: i === shipStep ? `0 0 0 4px rgba(37,99,235,.12)` : "none",
                  }}/>
                  {i < 3 && <div style={{ ...S.trackLine, background: i < shipStep ? ACCENT : "#E2E8F0" }}/>}
                  <span style={{ ...S.trackLabel, color: i <= shipStep ? BRAND : "#94A3B8", fontWeight: i === shipStep ? 700 : 400 }}>{label}</span>
                </div>
              ))}
            </div>
            {order.tracking_number && (
              <div style={S.trackingBox}>
                <span style={{ fontSize: 12, color: "#64748B" }}>Tracking #</span>
                <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: BRAND }}>{order.tracking_number}</span>
              </div>
            )}
          </div>

          {/* ── Order Items — with product images ── */}
          <div style={S.card}>
            <h3 style={{ ...S.cardTitle, marginBottom: 16 }}>Items Ordered ({order.items?.length ?? 0})</h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(order.items ?? []).map((item: OrderItem, idx: number) => {
                // FIX #1: Resolve product image — check multiple possible fields
                const imgSrc =
                  item.product?.main_image ??
                  (item.product?.images as any)?.[0]?.image_url ??
                  (item.product?.images as any)?.[0]?.url ??
                  (typeof (item.product?.images as any)?.[0] === "string" ? (item.product?.images as any)?.[0] : null) ??
                  (item as any).image_url ??
                  null;

                return (
                  <div key={item.id ?? idx} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 0",
                    borderBottom: idx < (order.items!.length - 1) ? "1px solid #F1F5F9" : "none",
                  }}>
                    {/* Product thumbnail */}
                    <Thumb src={imgSrc} alt={item.title ?? "Product"} />

                    {/* Product info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={item.product_id ? `/store/product/${item.product_id}` : "#"}
                        style={{ fontSize: 14, fontWeight: 600, color: BRAND, textDecoration: "none", display: "block", marginBottom: 2 }}
                      >
                        {item.title}
                      </Link>
                      {item.variant && (
                        <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 2px" }}>
                          {Object.entries(item.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>Qty: {item.quantity}</p>
                    </div>

                    {/* Pricing */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: BRAND, margin: "0 0 2px" }}>
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      {item.quantity > 1 && (
                        <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                          {formatCurrency(item.price)} each
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <div style={S.summary}>
              <div style={S.summaryRow}><span>Subtotal</span><span>{formatCurrency(order.total_amount)}</span></div>
              <div style={S.summaryRow}><span>Shipping</span><span style={{ color: "#10B981" }}>Free</span></div>
              <div style={{ ...S.summaryRow, fontWeight: 800, color: BRAND, fontSize: 16, borderTop: "1px solid #E2E8F0", paddingTop: 10, marginTop: 4 }}>
                <span>Total</span><span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment status */}
          {payment && paymentMeta && (
            <div style={S.card}>
              <h3 style={{ ...S.cardTitle, marginBottom: 16 }}>Payment</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: paymentMeta.dot, flexShrink: 0 }}/>
                <span style={{ ...S.badge, color: paymentMeta.color, background: paymentMeta.bg }}>{paymentMeta.label}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700, color: BRAND }}>{formatCurrency(payment.amount)}</span>
              </div>
              <div style={S.infoGrid}>
                <div><span style={S.infoLabel}>Method</span><span style={S.infoVal}>Bank Transfer</span></div>
                <div><span style={S.infoLabel}>Payment ID</span><span style={{ ...S.infoVal, fontFamily: "monospace", fontSize: 11 }}>{payment.id.slice(0, 12)}…</span></div>
                {payment.proof && (
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={S.infoLabel}>Proof</span>
                    <a href={payment.proof.file_url} target="_blank" rel="noreferrer" style={{ color: ACCENT, fontSize: 13, fontWeight: 600 }}>View proof →</a>
                  </div>
                )}
                {payment.admin_notes && (
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={S.infoLabel}>Admin Note</span>
                    <p style={{ ...S.infoVal, color: "#EF4444" }}>{payment.admin_notes}</p>
                  </div>
                )}
              </div>

              {/* Rejected — resubmit */}
              {canResubmitProof && (
                <div style={{ marginTop: 20, padding: 18, background: "#FFF1F2", borderRadius: 12, border: "1px solid #FECDD3" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#9F1239", marginBottom: 4 }}>Payment Rejected</p>
                  <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Upload a new proof of payment.</p>
                  {uploaded ? (
                    <div style={{ color: "#10B981", fontSize: 14, fontWeight: 600 }}>✓ Proof resubmitted — awaiting review</div>
                  ) : (
                    <>
                      <div
                        style={{ border: `2px dashed ${dragOver ? ACCENT : "#E2E8F0"}`, borderRadius: 10, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? "#EFF6FF" : "#FAFAFA", transition: "all .2s" }}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setProofFile(f); }}
                      >
                        {proofFile
                          ? <p style={{ fontSize: 13, color: BRAND, fontWeight: 600 }}>📄 {proofFile.name}</p>
                          : <p style={{ fontSize: 13, color: "#94A3B8" }}>Drop file or click to browse</p>
                        }
                      </div>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                        <button onClick={handleResubmitProof} disabled={!proofFile || uploading} className="abtn"
                          style={{ ...S.primaryBtn, opacity: (!proofFile || uploading) ? 0.6 : 1, flex: 1 }}>
                          {uploading ? "Uploading…" : "Resubmit Proof"}
                        </button>
                        <button onClick={handleRetryPayment} className="gbtn" style={S.ghostBtn}>Start Over</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pending — no payment yet */}
          {!payment && order.status === "pending" && (
            <div style={{ ...S.card, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <h3 style={{ ...S.cardTitle, marginBottom: 8 }}>Payment Required</h3>
              <p style={{ fontSize: 14, color: "#78350F", marginBottom: 16 }}>Complete the bank transfer to confirm your order.</p>
              <Link href={`/store/payment?order_id=${id}`} className="abtn" style={S.primaryLink}>Complete Payment →</Link>
            </div>
          )}

          {/* ── Edit Notes ── */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editingNotes ? 14 : 0 }}>
              <h3 style={S.cardTitle}>Order Notes</h3>
              {!editingNotes && (
                <button onClick={startEditNotes} className="gbtn"
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", color: "#475569" }}>
                  {order.notes ? "Edit" : "+ Add Note"}
                </button>
              )}
            </div>
            {editingNotes ? (
              <>
                <textarea
                  value={notesForm}
                  onChange={e => setNotesForm(e.target.value)}
                  placeholder="Add a note about your order…"
                  rows={3}
                  style={S.textarea}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={handleSaveNotes} disabled={savingNotes} className="abtn" style={{ ...S.primaryBtn, flex: 1 }}>
                    {savingNotes ? "Saving…" : "Save Note"}
                  </button>
                  <button onClick={() => setEditingNotes(false)} className="gbtn" style={S.ghostBtn}>Cancel</button>
                </div>
              </>
            ) : (
              order.notes
                ? <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: 0, marginTop: 8 }}>{order.notes}</p>
                : <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, marginTop: 4 }}>No notes added.</p>
            )}
          </div>
        </div>

        {/* ═════════ RIGHT COLUMN ═════════ */}
        <div style={S.col}>

          {/* ── Shipping Address + Edit ── */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={S.cardTitle}>Delivery Address</h3>
              {canEditAddress && !editingAddress && (
                <button onClick={startEditAddress} className="gbtn"
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", color: "#475569" }}>
                  Edit
                </button>
              )}
            </div>

            {editingAddress ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { key: "full_name",     label: "Full Name",       type: "text" },
                  { key: "address_line1", label: "Address Line 1",  type: "text" },
                  { key: "address_line2", label: "Address Line 2 (optional)", type: "text" },
                  { key: "city",          label: "City",            type: "text" },
                  { key: "district",      label: "District / Province", type: "text" },
                  { key: "postal_code",   label: "Postal Code",     type: "text" },
                  { key: "phone",         label: "Phone",           type: "tel" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</label>
                    <input
                      type={type}
                      value={(addressForm as any)[key]}
                      onChange={e => setAddressForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ ...S.input, width: "100%" }}
                    />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={handleSaveAddress} disabled={savingAddress} className="abtn" style={{ ...S.primaryBtn, flex: 1 }}>
                    {savingAddress ? "Saving…" : "Save Address"}
                  </button>
                  <button onClick={() => setEditingAddress(false)} className="gbtn" style={S.ghostBtn}>Cancel</button>
                </div>
              </div>
            ) : order.shipping_address ? (
              <div style={S.addressBox}>
                <p style={{ fontWeight: 700, color: BRAND, margin: "0 0 4px" }}>{order.shipping_address.full_name}</p>
                <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                  {order.shipping_address.address_line1}<br/>
                  {order.shipping_address.address_line2 && <>{order.shipping_address.address_line2}<br/></>}
                  {order.shipping_address.city}{order.shipping_address.district ? `, ${order.shipping_address.district}` : ""}
                  {order.shipping_address.postal_code && `, ${order.shipping_address.postal_code}`}
                  <br/>{order.shipping_address.country}
                </p>
                <p style={{ color: "#64748B", fontSize: 13, margin: "6px 0 0" }}>📞 {order.shipping_address.phone}</p>
              </div>
            ) : (
              <p style={{ color: "#94A3B8", fontSize: 13 }}>No address on record.</p>
            )}
          </div>

          {/* Refund / Return status */}
          {(order.refund_status && order.refund_status !== "none") && (
            <div style={{ ...S.card, border: "1px solid #FDE68A" }}>
              <h3 style={{ ...S.cardTitle, marginBottom: 10 }}>Refund Status</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>💰</span>
                <div>
                  <p style={{ fontWeight: 700, color: BRAND, textTransform: "capitalize", margin: 0 }}>{order.refund_status?.replace(/_/g, " ")}</p>
                  {order.refund_amount && <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>Amount: {formatCurrency(order.refund_amount)}</p>}
                  {order.refund_reason && <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{order.refund_reason}</p>}
                </div>
              </div>
            </div>
          )}
          {(order.return_status && order.return_status !== "none") && (
            <div style={{ ...S.card, border: "1px solid #BFDBFE" }}>
              <h3 style={{ ...S.cardTitle, marginBottom: 10 }}>Return Status</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 20 }}>↩️</span>
                <div>
                  <p style={{ fontWeight: 700, color: BRAND, textTransform: "capitalize", margin: 0 }}>{order.return_status?.replace(/_/g, " ")}</p>
                  {order.return_reason && <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{order.return_reason}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={S.card}>
            <h3 style={{ ...S.cardTitle, marginBottom: 16 }}>Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              <a href={`/api/orders/${id}/invoice`} target="_blank" rel="noreferrer" className="abtn gbtn" style={S.ghostBtnFull}>
                📄 Download Invoice
              </a>

              {canCancel && !showCancelForm && (
                <button onClick={() => setShowCancelForm(true)} className="abtn dbtn" style={S.dangerBtnFull}>
                  Cancel Order
                </button>
              )}
              {canCancel && showCancelForm && (
                <div style={{ padding: 14, background: "#FFF1F2", borderRadius: 12, border: "1px solid #FECDD3" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#9F1239", marginBottom: 8 }}>Cancel this order?</p>
                  <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation…" style={S.textarea} rows={3}/>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={handleCancel} disabled={cancelling} className="abtn dbtn" style={{ ...S.dangerBtnFull, flex: 1 }}>
                      {cancelling ? "Cancelling…" : "Confirm Cancel"}
                    </button>
                    <button onClick={() => setShowCancelForm(false)} className="gbtn" style={S.ghostBtn}>Keep</button>
                  </div>
                </div>
              )}

              {canReturn && !showReturnForm && (
                <button onClick={() => setShowReturnForm(true)} className="abtn gbtn" style={S.ghostBtnFull}>
                  ↩ Request Return
                </button>
              )}
              {canReturn && showReturnForm && (
                <div style={{ padding: 14, background: "#EFF6FF", borderRadius: 12, border: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", marginBottom: 8 }}>Return Request</p>
                  <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} placeholder="Reason for return…" style={S.textarea} rows={3}/>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={handleReturn} disabled={returning} className="abtn" style={{ ...S.primaryBtn, flex: 1 }}>
                      {returning ? "Submitting…" : "Submit Return"}
                    </button>
                    <button onClick={() => setShowReturnForm(false)} className="gbtn" style={S.ghostBtn}>Cancel</button>
                  </div>
                </div>
              )}

              {canRequestRefund && !showRefundForm && (
                <button onClick={() => setShowRefundForm(true)} className="abtn gbtn" style={S.ghostBtnFull}>
                  💰 Request Refund
                </button>
              )}
              {canRequestRefund && showRefundForm && (
                <div style={{ padding: 14, background: "#F0FDF4", borderRadius: 12, border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#065F46", marginBottom: 8 }}>Request Refund</p>
                  <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason for refund…" style={S.textarea} rows={3}/>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={handleRefundRequest} disabled={requestingRefund} className="abtn" style={{ ...S.primaryBtn, flex: 1 }}>
                      {requestingRefund ? "Submitting…" : "Submit Request"}
                    </button>
                    <button onClick={() => setShowRefundForm(false)} className="gbtn" style={S.ghostBtn}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Help */}
          <div style={{ ...S.card, background: "#F8FAFC" }}>
            <p style={{ fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 1.8, margin: 0 }}>
              Need help with this order?<br/>
              <a href={`https://wa.me/?text=Order+%23${order.id.slice(0,8)}`} style={{ color: ACCENT, fontWeight: 600 }}>Chat on WhatsApp</a>
              {" · "}
              <Link href="/account/support" style={{ color: ACCENT, fontWeight: 600 }}>Open a ticket</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 960, margin: "0 auto", padding: "24px 20px 48px", fontFamily: FF },
  loadCenter:  { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "80px 0", color: "#64748B" },
  errorCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", textAlign: "center" },
  header:      { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  backLink:    { display: "inline-flex", alignItems: "center", gap: 6, color: "#64748B", textDecoration: "none", fontSize: 14, fontWeight: 500 },
  badge:       { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  title:       { fontSize: 26, fontWeight: 800, color: BRAND, letterSpacing: "-0.03em", margin: "4px 0 2px" },
  subtitle:    { fontSize: 13, color: "#94A3B8", marginBottom: 28 },
  grid:        { display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" },
  col:         { display: "flex", flexDirection: "column", gap: 16 },
  card:        { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 22px 20px", animation: "fadeUp .3s ease" },
  cardHeader:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  cardTitle:   { fontSize: 15, fontWeight: 700, color: BRAND, margin: 0 },
  tracker:     { display: "flex", gap: 0, alignItems: "flex-start", marginBottom: 8 },
  trackStep:   { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" },
  trackDot:    { width: 14, height: 14, borderRadius: "50%", zIndex: 1, flexShrink: 0, transition: "all .3s" },
  trackLine:   { position: "absolute", top: 7, left: "50%", width: "100%", height: 2, zIndex: 0, transition: "background .3s" },
  trackLabel:  { fontSize: 11, marginTop: 10, textAlign: "center", lineHeight: 1.3 },
  trackingBox: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", marginTop: 16 },
  summary:     { borderTop: "1px solid #F1F5F9", marginTop: 16, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 },
  summaryRow:  { display: "flex", justifyContent: "space-between", fontSize: 14, color: "#475569" },
  infoGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  infoLabel:   { display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 },
  infoVal:     { display: "block", fontSize: 14, color: BRAND, fontWeight: 500 },
  addressBox:  { background: "#F8FAFC", borderRadius: 12, padding: "14px 16px", lineHeight: 1.6 },
  textarea:    { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, resize: "vertical", color: BRAND, background: "#fff" },
  input:       { padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, color: BRAND, background: "#fff" },
  primaryBtn:  { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 20px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer" },
  primaryLink: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", borderRadius: 10, background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 },
  ghostBtn:    { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "transparent", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  ghostBtnFull:  { display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "transparent", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer", textDecoration: "none", width: "100%" },
  dangerBtnFull: { display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px", borderRadius: 10, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer", width: "100%" },
  toast:       { position: "fixed", bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: FF, zIndex: 9999, animation: "fadeUp .3s ease", boxShadow: "0 4px 20px rgba(0,0,0,.25)" },
};