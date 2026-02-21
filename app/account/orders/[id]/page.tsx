"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ordersApi, paymentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, Payment } from "@/lib/types";

const FF = "'Sora', 'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://karabo.onrender.com";

const ORDER_STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: string; step: number }> = {
  pending:   { label: "Pending",   color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", step: 0 },
  paid:      { label: "Confirmed", color: "#065F46", bg: "#F0FDF4", border: "#BBF7D0", icon: "✅", step: 1 },
  shipped:   { label: "Shipped",   color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", icon: "🚚", step: 2 },
  completed: { label: "Delivered", color: "#166534", bg: "#DCFCE7", border: "#86EFAC", icon: "📦", step: 3 },
  cancelled: { label: "Cancelled", color: "#991B1B", bg: "#FFF1F2", border: "#FECDD3", icon: "✕",  step: -1 },
};
const PAY_STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: "Awaiting Payment",  color: "#92400E", bg: "#FFFBEB", dot: "#F59E0B" },
  on_hold:  { label: "Under Review",      color: "#7C3D0A", bg: "#FFF7ED", dot: "#F97316" },
  paid:     { label: "Payment Confirmed", color: "#065F46", bg: "#F0FDF4", dot: "#10B981" },
  rejected: { label: "Payment Rejected",  color: "#991B1B", bg: "#FFF1F2", dot: "#F43F5E" },
};
const TRACK_STEPS = ["Order Placed", "Payment Confirmed", "Shipped", "Delivered"];
const SHIP_STEP: Record<string, number> = { pending: 0, processing: 1, shipped: 2, delivered: 3, returned: 3 };

function Thumb({ src, alt, size = 72 }: { src?: string|null; alt: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width: size, height: size, borderRadius: 12, background: "linear-gradient(135deg,#F1F5F9,#E2E8F0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, flexShrink: 0 }}>📦</div>
  );
  return <img src={src} alt={alt} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 12, objectFit: "cover", flexShrink: 0, border: "1px solid #F1F5F9" }} />;
}

function Spinner({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" style={{ animation: "kspin .7s linear infinite" }}>
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".12"/>
      <path d="M11 2a9 9 0 019 9" stroke={ACCENT} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function UserOrderDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params?.id as string;

  const [order,   setOrder]   = useState<Order|null>(null);
  const [payment, setPayment] = useState<Payment|null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string|null>(null);

  const [showCancel,  setShowCancel]  = useState(false);
  const [cancelReason,setCancelReason]= useState("");
  const [cancelling,  setCancelling]  = useState(false);
  const [showReturn,  setShowReturn]  = useState(false);
  const [returnReason,setReturnReason]= useState("");
  const [returning,   setReturning]   = useState(false);
  const [showRefund,  setShowRefund]  = useState(false);
  const [refundReason,setRefundReason]= useState("");
  const [refunding,   setRefunding]   = useState(false);
  const [proofFile,   setProofFile]   = useState<File|null>(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [toast,       setToast]       = useState<{msg:string;type:"ok"|"err"}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(msg: string, type: "ok"|"err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    try {
      setLoading(true); setError(null);
      const [ord, pmts] = await Promise.all([
        ordersApi.getById(id),
        paymentsApi.getMy().catch(() => [] as Payment[]),
      ]);
      setOrder(ord);
      const list: Payment[] = Array.isArray(pmts) ? pmts : (pmts as any)?.results ?? (pmts as any)?.payments ?? [];
      const match = list.find(p => p.order_id === id) ?? null;
      setPayment(match);
    } catch (e: any) {
      setError(e?.message ?? "Could not load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function handleCancel() {
    if (!cancelReason.trim()) { flash("Please enter a cancellation reason", "err"); return; }
    setCancelling(true);
    try {
      await ordersApi.cancel(id, cancelReason);
      flash("Order cancelled successfully");
      setShowCancel(false);
      await load();
    } catch (e: any) { flash(e?.message ?? "Failed to cancel order", "err"); }
    finally { setCancelling(false); }
  }

  async function handleReturn() {
    if (!returnReason.trim()) { flash("Please enter a return reason", "err"); return; }
    setReturning(true);
    try {
      await ordersApi.requestReturn(id, returnReason);
      flash("Return request submitted");
      setShowReturn(false);
      await load();
    } catch (e: any) { flash(e?.message ?? "Failed to submit return", "err"); }
    finally { setReturning(false); }
  }

  async function handleRefund() {
    if (!refundReason.trim()) { flash("Please enter a refund reason", "err"); return; }
    setRefunding(true);
    try {
      await ordersApi.requestRefund(id, { reason: refundReason, amount: order!.total_amount });
      flash("Refund request submitted");
      setShowRefund(false);
      await load();
    } catch (e: any) { flash(e?.message ?? "Failed to request refund", "err"); }
    finally { setRefunding(false); }
  }

  async function handleUploadProof() {
    if (!proofFile || !payment) return;
    setUploading(true);
    try {
      // Use direct fetch — NOT paymentsApi.uploadProof/resubmitProof — because:
      // 1. The shared request() helper passes Content-Type which breaks multipart boundary
      // 2. Backend param is `proof: UploadFile = File(...)` so field must be "proof" not "file"
      // 3. There is no /resubmit-proof route; same POST /{id}/proof handles all statuses
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "https://karabo.onrender.com").replace(/\/$/, "");
      const token = typeof window !== "undefined" ? localStorage.getItem("karabo_token") : null;
      const form = new FormData();
      form.append("proof", proofFile); // must match FastAPI param name

      const res = await fetch(`${base}/api/payments/${payment.id}/proof`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        let msg = `Upload failed (${res.status})`;
        try {
          const data = await res.json();
          if (Array.isArray(data?.detail)) {
            // FastAPI 422: detail is [{loc, msg, type}] — extract human-readable text
            msg = (data.detail as Array<{loc: string[]; msg: string}>)
              .map(e => `${e.loc.slice(-1)[0]}: ${e.msg}`).join("; ");
          } else {
            msg = (typeof data?.detail === "string" ? data.detail : null)
               ?? data?.message ?? msg;
          }
        } catch {}
        throw new Error(msg);
      }

      flash("Proof uploaded. Awaiting admin review.");
      setProofFile(null); setShowUpload(false);
      await load();
    } catch (e: any) {
      const msg = e instanceof Error ? e.message
                : typeof e === "string" ? e
                : "Upload failed. Please try again.";
      flash(msg, "err");
    }
    finally { setUploading(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", fontFamily: FF, color: "#94A3B8" }}>
      <Spinner /><p style={{ fontSize: 14 }}>Loading order details…</p>
    </div>
  );

  if (error || !order) return (
    <div style={{ textAlign: "center", padding: "80px 0", fontFamily: FF }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: BRAND, marginBottom: 8 }}>Could not load order</h3>
      <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>{error}</p>
      <button onClick={() => load()} style={{ marginRight: 12, padding: "10px 20px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontFamily: FF, cursor: "pointer" }}>Retry</button>
      <Link href="/account/orders" style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #E2E8F0", color: "#475569", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>← Back to Orders</Link>
    </div>
  );

  const os = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
  const ps = payment ? PAY_STATUS[payment.status] : null;
  const items = order.items ?? [];
  const step = SHIP_STEP[order.shipping_status] ?? 0;
  const isCancelled = order.status === "cancelled";
  const canCancel = ["pending", "paid"].includes(order.status);
  const canReturn = order.status === "completed" && order.return_status !== "requested" && order.return_status !== "approved";
  const canRefund = ["paid", "completed"].includes(order.status) && order.refund_status !== "requested" && order.refund_status !== "processing";
  const canUploadProof = payment && ["pending", "on_hold", "rejected"].includes(payment.status);
  const addr = order.shipping_address as any;

  return (
    <div style={{ fontFamily: FF, maxWidth: 940, paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes kspin { to { transform: rotate(360deg); } }
        @keyframes kfadeup { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .kcard { background:#fff; border:1px solid #E2E8F0; border-radius:16px; padding:22px; animation: kfadeup .3s ease both; }
        .kbtn-ghost { background:transparent; border:1px solid #E2E8F0; color:#475569; padding:10px 18px; border-radius:10px; font-weight:600; font-size:13px; font-family:${FF}; cursor:pointer; transition: all .15s; }
        .kbtn-ghost:hover { background:#F8FAFC; border-color:#CBD5E1; }
        .kbtn-primary { background:${ACCENT}; color:#fff; border:none; padding:11px 20px; border-radius:10px; font-weight:700; font-size:14px; font-family:${FF}; cursor:pointer; transition: opacity .15s; }
        .kbtn-primary:hover { opacity:.88; }
        .kbtn-danger { background:#DC2626; color:#fff; border:none; padding:11px 20px; border-radius:10px; font-weight:700; font-size:14px; font-family:${FF}; cursor:pointer; }
        .kbtn-full { width:100%; display:flex; align-items:center; justify-content:center; }
      `}</style>

      {/* ── Breadcrumb + header ── */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/account/orders" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#64748B", textDecoration: "none", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to orders
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: BRAND, letterSpacing: "-0.03em", margin: "0 0 4px" }}>
              Order <code style={{ fontSize: 20, background: "#F1F5F9", padding: "2px 10px", borderRadius: 8, color: BRAND }}>#{order.id.slice(0, 8).toUpperCase()}</code>
            </h1>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Placed {new Date(order.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: os.bg, border: `1px solid ${os.border}`, fontSize: 13, fontWeight: 700, color: os.color }}>
            {os.icon} {os.label}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

        {/* ══ LEFT COLUMN ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Shipping tracker */}
          {!isCancelled && (
            <div className="kcard">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🚚</span> Delivery Progress
              </h3>
              <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 6 }}>
                {TRACK_STEPS.map((label, i) => {
                  const done = step >= i;
                  const active = step === i;
                  return (
                    <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      {i < TRACK_STEPS.length - 1 && (
                        <div style={{ position: "absolute", top: 10, left: "50%", width: "100%", height: 2, background: step > i ? ACCENT : "#E2E8F0", transition: "background .4s", zIndex: 0 }}/>
                      )}
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? ACCENT : "#E2E8F0", border: `3px solid ${active ? ACCENT : done ? ACCENT : "#E2E8F0"}`, zIndex: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? `0 0 0 4px rgba(37,99,235,.15)` : "none", transition: "all .3s" }}>
                        {done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <p style={{ fontSize: 10, fontWeight: done ? 700 : 500, color: done ? BRAND : "#94A3B8", textAlign: "center", marginTop: 8, lineHeight: 1.3 }}>{label}</p>
                    </div>
                  );
                })}
              </div>
              {order.tracking_number && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", marginTop: 16 }}>
                  <span style={{ fontSize: 12, color: "#64748B" }}>Tracking Number</span>
                  <code style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>{order.tracking_number}</code>
                </div>
              )}
            </div>
          )}

          {/* Order items */}
          <div className="kcard">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📦</span> Items Ordered ({items.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {items.length === 0 && <p style={{ fontSize: 14, color: "#94A3B8", margin: 0 }}>No items found</p>}
              {items.map((item, i) => {
                const imgSrc = item.product?.main_image ?? (item.product?.images as any)?.[0]?.image_url ?? null;
                return (
                  <div key={item.id ?? i} style={{ display: "flex", gap: 14, alignItems: "center", paddingBottom: i < items.length - 1 ? 14 : 0, borderBottom: i < items.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <Thumb src={imgSrc} alt={item.title} size={72} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/store/product/${item.product_id}`} style={{ fontSize: 14, fontWeight: 600, color: BRAND, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </Link>
                      {item.variant && (
                        <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>
                          {Object.entries(item.variant.attributes ?? {}).map(([k,v]) => `${k}: ${v}`).join(" · ")}
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0" }}>Qty: {item.quantity}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: BRAND, margin: 0 }}>{formatCurrency(item.subtotal)}</p>
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: "2px 0 0" }}>{formatCurrency(item.price)} each</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order total */}
            <div style={{ borderTop: "1px solid #F1F5F9", marginTop: 18, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#64748B" }}>
                <span>Subtotal ({items.length} items)</span>
                <span>{formatCurrency(items.reduce((s, i) => s + i.subtotal, 0))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#64748B" }}>
                <span>Shipping</span><span style={{ color: "#10B981", fontWeight: 600 }}>Free</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, color: BRAND, borderTop: "1px solid #E2E8F0", paddingTop: 10, marginTop: 4 }}>
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          {addr && (
            <div className="kcard">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span>📍</span> Shipping Address
              </h3>
              <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "14px 16px", fontSize: 14, lineHeight: 1.8, color: "#475569" }}>
                {addr.full_name && <strong style={{ display: "block", color: BRAND, marginBottom: 2 }}>{addr.full_name}</strong>}
                {addr.address_line1 && <span>{addr.address_line1}</span>}
                {addr.address_line2 && <span>, {addr.address_line2}</span>}
                {addr.city && <span> · {addr.city}</span>}
                {addr.district && <span>, {addr.district}</span>}
                {addr.postal_code && <span> {addr.postal_code}</span>}
                {addr.phone && <span style={{ display: "block", marginTop: 4 }}>📞 {addr.phone}</span>}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="kcard">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <span>📝</span> Order Notes
              </h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: 0 }}>{order.notes}</p>
            </div>
          )}

          {/* Refund / Return status cards */}
          {order.refund_status && order.refund_status !== "none" && (
            <div className="kcard" style={{ border: "1px solid #BFDBFE" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 28 }}>💰</span>
                <div>
                  <p style={{ fontWeight: 700, color: BRAND, margin: "0 0 2px", textTransform: "capitalize" }}>Refund {order.refund_status.replace(/_/g, " ")}</p>
                  {order.refund_amount && <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>{formatCurrency(order.refund_amount)} refund requested</p>}
                  {order.refund_reason && <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>{order.refund_reason}</p>}
                </div>
              </div>
            </div>
          )}
          {order.return_status && order.return_status !== "none" && (
            <div className="kcard" style={{ border: "1px solid #BFDBFE" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 28 }}>↩️</span>
                <div>
                  <p style={{ fontWeight: 700, color: BRAND, margin: "0 0 2px", textTransform: "capitalize" }}>Return {order.return_status.replace(/_/g, " ")}</p>
                  {order.return_reason && <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>{order.return_reason}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Payment status */}
          {ps && payment && (
            <div className="kcard">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 14px" }}>Payment</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: ps.bg, borderRadius: 10, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ps.dot, flexShrink: 0 }}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: ps.color }}>{ps.label}</span>
              </div>
              <div style={{ fontSize: 13, color: "#64748B", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Amount</span><strong style={{ color: BRAND }}>{formatCurrency(payment.amount)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Method</span><strong style={{ color: BRAND, textTransform: "capitalize" }}>{payment.method?.replace(/_/g, " ")}</strong>
                </div>
                {payment.proof?.file_url && (
                  <a href={payment.proof.file_url} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", color: "#10B981", fontWeight: 600, marginTop: 4, textDecoration: "none" }}>
                    <span>📎 View proof</span><span>→</span>
                  </a>
                )}
                {payment.admin_notes && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "#FFF1F2", borderRadius: 8, fontSize: 12, color: "#991B1B" }}>
                    <strong>Admin note:</strong> {payment.admin_notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Proof upload */}
          {canUploadProof && (
            <div className="kcard">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 12px" }}>
                {payment?.status === "pending" ? "Upload Payment Proof" : "Resubmit Proof"}
              </h3>
              {!showUpload ? (
                <button onClick={() => setShowUpload(true)} className="kbtn-primary kbtn-full">
                  📎 {payment?.status === "pending" ? "Upload Proof of Payment" : "Resubmit Proof"}
                </button>
              ) : (
                <>
                  <div
                    style={{ border: `2px dashed ${dragOver ? ACCENT : "#CBD5E1"}`, borderRadius: 10, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? "#EFF6FF" : "#F8FAFC", marginBottom: 10, transition: "all .2s" }}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setProofFile(f); }}
                  >
                    {proofFile ? <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: 0 }}>📄 {proofFile.name}</p>
                      : <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Drop file or click to browse<br/><span style={{ fontSize: 11 }}>Image or PDF</span></p>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleUploadProof} disabled={!proofFile || uploading} className="kbtn-primary" style={{ flex: 1, opacity: (!proofFile || uploading) ? 0.6 : 1 }}>
                      {uploading ? "Uploading…" : "Submit Proof"}
                    </button>
                    <button onClick={() => setShowUpload(false)} className="kbtn-ghost">Cancel</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quick info */}
          <div className="kcard">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 14px" }}>Order Info</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Order ID", `#${order.id.slice(0, 8).toUpperCase()}`],
                ["Order Date", new Date(order.created_at).toLocaleDateString()],
                ["Items", `${items.length} item${items.length !== 1 ? "s" : ""}`],
                ["Shipping", order.shipping_status?.replace(/_/g, " ") ?? "Pending"],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, color: BRAND, fontWeight: 600, textTransform: "capitalize" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="kcard">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 14px" }}>Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              <a href={`${API_BASE}/api/orders/${id}/invoice`} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "11px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
                📄 Download Invoice
              </a>

              {canCancel && !showCancel && (
                <button onClick={() => setShowCancel(true)} className="kbtn-danger kbtn-full">Cancel Order</button>
              )}
              {canCancel && showCancel && (
                <div style={{ padding: 14, background: "#FFF1F2", borderRadius: 12, border: "1px solid #FECDD3" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", margin: "0 0 8px" }}>Cancel this order?</p>
                  <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation…" rows={3}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECDD3", fontSize: 13, fontFamily: FF, resize: "vertical", color: BRAND, boxSizing: "border-box" }}/>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={handleCancel} disabled={cancelling} className="kbtn-danger" style={{ flex: 1 }}>
                      {cancelling ? "Cancelling…" : "Confirm Cancel"}
                    </button>
                    <button onClick={() => setShowCancel(false)} className="kbtn-ghost">Keep</button>
                  </div>
                </div>
              )}

              {canReturn && !showReturn && (
                <button onClick={() => setShowReturn(true)} className="kbtn-ghost kbtn-full">↩ Request Return</button>
              )}
              {canReturn && showReturn && (
                <div style={{ padding: 14, background: "#EFF6FF", borderRadius: 12, border: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", margin: "0 0 8px" }}>Return Request</p>
                  <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} placeholder="Reason for return…" rows={3}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #BFDBFE", fontSize: 13, fontFamily: FF, resize: "vertical", color: BRAND, boxSizing: "border-box" }}/>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={handleReturn} disabled={returning} className="kbtn-primary" style={{ flex: 1 }}>
                      {returning ? "Submitting…" : "Submit Return"}
                    </button>
                    <button onClick={() => setShowReturn(false)} className="kbtn-ghost">Cancel</button>
                  </div>
                </div>
              )}

              {canRefund && !showRefund && (
                <button onClick={() => setShowRefund(true)} className="kbtn-ghost kbtn-full">💰 Request Refund</button>
              )}
              {canRefund && showRefund && (
                <div style={{ padding: 14, background: "#F0FDF4", borderRadius: 12, border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#065F46", margin: "0 0 8px" }}>Request Refund</p>
                  <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason for refund…" rows={3}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #BBF7D0", fontSize: 13, fontFamily: FF, resize: "vertical", color: BRAND, boxSizing: "border-box" }}/>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={handleRefund} disabled={refunding} className="kbtn-primary" style={{ flex: 1 }}>
                      {refunding ? "Submitting…" : "Submit Request"}
                    </button>
                    <button onClick={() => setShowRefund(false)} className="kbtn-ghost">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Help */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px", textAlign: "center", fontSize: 13, color: "#64748B", lineHeight: 1.8 }}>
            Need help with this order?<br/>
            <a href={`https://wa.me/266?text=Hi%2C+I+need+help+with+Order+%23${order.id.slice(0,8).toUpperCase()}`} style={{ color: ACCENT, fontWeight: 600 }}>Chat on WhatsApp</a>
            {" · "}
            <Link href="/account/support" style={{ color: ACCENT, fontWeight: 600 }}>Open ticket</Link>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10, background: toast.type === "ok" ? "#0F172A" : "#DC2626", color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: FF, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.25)", animation: "kfadeup .3s ease" }}>
          {toast.type === "ok" ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}