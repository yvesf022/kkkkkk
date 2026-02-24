"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ordersApi, paymentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, Payment } from "@/lib/types";

/* ─── Design tokens — matches the orders list page ─── */
const FF      = "'Sora', 'DM Sans', -apple-system, sans-serif";
const BRAND   = "#0A0F1E";
const ACCENT  = "#2563EB";
const SUCCESS = "#10B981";
const WARN    = "#F59E0B";
const DANGER  = "#EF4444";
const BORDER  = "#E2E8F0";
const SURFACE = "#F8FAFF";

/* ─── Status config ─── */
const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: string; step: number }> = {
  pending:   { label: "Pending",   color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", step: 0 },
  paid:      { label: "Confirmed", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", icon: "✅", step: 1 },
  shipped:   { label: "Shipped",   color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", icon: "🚚", step: 2 },
  completed: { label: "Delivered", color: "#166534", bg: "#DCFCE7", border: "#86EFAC", icon: "📦", step: 3 },
  cancelled: { label: "Cancelled", color: "#991B1B", bg: "#FFF1F2", border: "#FECDD3", icon: "✕",  step: -1 },
};

const PAY: Record<string, { label: string; dot: string; color: string; bg: string; border: string }> = {
  pending:  { label: "Awaiting Payment",  dot: "#F59E0B", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  on_hold:  { label: "Under Review",      dot: "#F97316", color: "#7C3D0A", bg: "#FFF7ED", border: "#FED7AA" },
  paid:     { label: "Payment Confirmed", dot: "#10B981", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
  rejected: { label: "Payment Rejected",  dot: "#F43F5E", color: "#991B1B", bg: "#FFF1F2", border: "#FECDD3" },
};

const SHIP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:    { label: "Awaiting Dispatch", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  processing: { label: "Processing",        color: "#7C3D0A", bg: "#FFF7ED", border: "#FED7AA" },
  shipped:    { label: "Shipped",           color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" },
  delivered:  { label: "Delivered",         color: "#065F46", bg: "#DCFCE7", border: "#A7F3D0" },
  returned:   { label: "Returned",          color: "#6B21A8", bg: "#F5F3FF", border: "#DDD6FE" },
};

const STEPS = [
  { label: "Placed",    icon: "📋" },
  { label: "Confirmed", icon: "✅" },
  { label: "Shipped",   icon: "🚚" },
  { label: "Delivered", icon: "📦" },
];

/* ─── Helpers ─── */
function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function fmtDateShort(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtTime(s?: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Sub-components ─── */
function Spinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation: "odspin .7s linear infinite" }}>
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".12" />
      <path d="M11 2a9 9 0 019 9" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Thumb({ src, alt, size = 64 }: { src?: string | null; alt: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width: size, height: size, borderRadius: 12, background: "linear-gradient(135deg,#F1F5F9,#E2E8F0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, flexShrink: 0 }}>📦</div>
  );
  return <img src={src} alt={alt} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 12, objectFit: "cover", flexShrink: 0, border: "1px solid #F1F5F9" }} />;
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "16px 22px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <h2 style={{ fontSize: 14, fontWeight: 800, color: BRAND, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      <div style={{ padding: "18px 22px" }}>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, color, bg, border, dot }: { label: string; color: string; bg: string; border?: string; dot?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: bg, border: `1px solid ${border ?? "#E2E8F0"}`, fontSize: 12, fontWeight: 700, color, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      {label}
    </span>
  );
}

function OrderProgress({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, width: "100%", padding: "4px 0" }}>
      {STEPS.map((s, i) => {
        const done   = step >= i;
        const active = step === i;
        const last   = i === STEPS.length - 1;
        return (
          <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {!last && (
              <div style={{ position: "absolute", top: 11, left: "50%", width: "100%", height: 2, background: step > i ? ACCENT : "#E2E8F0", transition: "background .4s", zIndex: 0 }} />
            )}
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: done ? ACCENT : "#F1F5F9", border: `2px solid ${done ? ACCENT : "#E2E8F0"}`, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? `0 0 0 5px rgba(37,99,235,.12)` : "none", transition: "all .35s", marginBottom: 6 }}>
              {done
                ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D1D5DB", display: "block" }} />
              }
            </div>
            <span style={{ fontSize: 10, fontWeight: done ? 700 : 500, color: done ? ACCENT : "#9CA3AF", textAlign: "center", letterSpacing: "0.02em" }}>{s.label}</span>
            <span style={{ fontSize: 14, marginTop: 2 }}>{s.icon}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main page ─── */
export default function AccountOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order,   setOrder]   = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  /* ── Actions ── */
  const [cancelling,      setCancelling]      = useState(false);
  const [cancelDone,      setCancelDone]      = useState(false);
  const [cancelErr,       setCancelErr]       = useState<string | null>(null);
  const [showCancelConf,  setShowCancelConf]  = useState(false);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const [ord, pmts] = await Promise.allSettled([
          ordersApi.getById(orderId),
          paymentsApi.getMy(),
        ]);
        if (ord.status === "fulfilled") setOrder(ord.value);
        if (pmts.status === "fulfilled") {
          const list: Payment[] = Array.isArray(pmts.value) ? pmts.value as Payment[] : (pmts.value as any)?.results ?? [];
          setPayment(list.find(p => p.order_id === orderId) ?? null);
        }
      } catch (e: any) {
        setError(e?.message ?? "Could not load order");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    setCancelErr(null);
    try {
      await ordersApi.cancel(order.id, "Cancelled by customer");
      setOrder(prev => prev ? { ...prev, status: "cancelled" } : prev);
      setCancelDone(true);
      setShowCancelConf(false);
    } catch (e: any) {
      setCancelErr(e?.message ?? "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  }

  /* ── Derived values ── */
  const s        = order ? (STATUS[order.status] ?? STATUS.pending) : null;
  const ps       = payment ? (PAY[payment.status] ?? null) : null;
  const ss       = order ? (SHIP[order.shipping_status] ?? null) : null;
  const step     = s?.step ?? 0;
  const tracking = (order as any)?.tracking;
  const addr     = order?.shipping_address as Record<string, any> | null;
  const notes    = (order as any)?.order_notes ?? [];
  const customerNotes = notes.filter((n: any) => !n.is_internal);

  /* ─────────────────────────────── */

  return (
    <div style={{ fontFamily: FF, maxWidth: 780, paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes odspin { to { transform: rotate(360deg); } }
        @keyframes odfade { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        .od-btn { transition: opacity .15s, transform .15s; }
        .od-btn:hover { opacity:.85; transform:translateY(-1px); }
        .od-btn:active { transform:translateY(0); }
        .od-ghost { transition: background .15s; }
        .od-ghost:hover { background: #F1F5F9 !important; }
      `}</style>

      {/* ── Back nav ── */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/account/orders" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#64748B", textDecoration: "none" }}
          className="od-ghost" >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to orders
        </Link>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "100px 0", color: "#94A3B8" }}>
          <Spinner />
          <p style={{ fontSize: 14, margin: 0 }}>Loading order…</p>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{ padding: "20px 24px", borderRadius: 14, background: "#FFF1F2", border: "1px solid #FECDD3", color: "#991B1B", fontSize: 14 }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Content ── */}
      {!loading && !error && order && (
        <div style={{ animation: "odfade .35s ease both" }}>

          {/* ── Hero header card ── */}
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
            {/* Colour bar */}
            <div style={{ height: 4, background: s?.bg, borderBottom: `1px solid ${s?.border}` }}>
              {order.status === "shipped" && <div style={{ height: "100%", background: `linear-gradient(90deg,${ACCENT},#60A5FA)` }} />}
              {order.status === "completed" && <div style={{ height: "100%", background: `linear-gradient(90deg,${SUCCESS},#34D399)` }} />}
              {order.status === "cancelled" && <div style={{ height: "100%", background: `linear-gradient(90deg,${DANGER},#F87171)` }} />}
            </div>

            <div style={{ padding: "22px 24px" }}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>Order</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <code style={{ fontSize: 18, fontWeight: 800, color: BRAND, background: "#F1F5F9", padding: "4px 12px", borderRadius: 8, letterSpacing: "0.04em" }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </code>
                    {s && <Badge label={`${s.icon} ${s.label}`} color={s.color} bg={s.bg} border={s.border} />}
                  </div>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: "6px 0 0" }}>{fmtDate(order.created_at)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 26, fontWeight: 800, color: BRAND, margin: 0, letterSpacing: "-0.03em" }}>
                    {formatCurrency(order.total_amount)}
                  </p>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: "2px 0 0" }}>{(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Status badges row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
                {ps && <Badge label={ps.label} color={ps.color} bg={ps.bg} border={ps.border} dot={ps.dot} />}
                {ss && order.shipping_status !== "pending" && (
                  <Badge label={`🚚 ${ss.label}`} color={ss.color} bg={ss.bg} border={ss.border} />
                )}
                {(order.return_status && order.return_status !== "none") && (
                  <Badge label={`↩ Return: ${order.return_status}`} color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" />
                )}
                {(order.refund_status && order.refund_status !== "none") && (
                  <Badge label={`💰 Refund: ${order.refund_status}`} color="#6D28D9" bg="#EDE9FE" border="#C4B5FD" />
                )}
              </div>

              {/* Progress tracker — only for non-cancelled */}
              {order.status !== "cancelled" && (
                <div style={{ padding: "18px 0 8px" }}>
                  <OrderProgress step={step} />
                </div>
              )}

              {/* Cancelled notice */}
              {order.status === "cancelled" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 12 }}>
                  <span style={{ fontSize: 20 }}>✕</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", margin: "0 0 2px" }}>Order Cancelled</p>
                    {(order as any).cancelled_at && (
                      <p style={{ fontSize: 12, color: "#F87171", margin: 0 }}>Cancelled on {fmtDate((order as any).cancelled_at)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Message from us (customer-visible admin notes) ── */}
          {customerNotes.length > 0 && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 16, padding: "16px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#1E40AF", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>📣 Message from us</p>
              {customerNotes.map((n: any) => (
                <p key={n.id} style={{ fontSize: 13, color: "#1E40AF", margin: "4px 0 0", lineHeight: 1.6 }}>{n.content}</p>
              ))}
            </div>
          )}

          {/* ── Tracking card ── */}
          {(tracking?.tracking_number || order.tracking_number) && (
            <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 28 }}>🚚</span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
                  {tracking?.carrier ? `${tracking.carrier} Tracking` : "Tracking Number"}
                </p>
                <code style={{ fontSize: 16, fontWeight: 800, color: BRAND, letterSpacing: "0.05em", fontFamily: "monospace" }}>
                  {tracking?.tracking_number ?? order.tracking_number}
                </code>
                {tracking?.estimated_delivery && (
                  <p style={{ fontSize: 12, color: "#10B981", fontWeight: 600, margin: "4px 0 0" }}>
                    Estimated delivery: {fmtDateShort(tracking.estimated_delivery)}
                  </p>
                )}
              </div>
              {tracking?.tracking_url && (
                <a href={tracking.tracking_url} target="_blank" rel="noreferrer"
                  style={{ padding: "10px 20px", background: "#065F46", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Track Package →
                </a>
              )}
            </div>
          )}

          {/* ── Items ── */}
          <Section title="Order Items" icon="🛍️">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(order.items ?? []).map((item, i) => (
                <div key={item.id} style={{ display: "flex", gap: 14, alignItems: "center", paddingBottom: i < (order.items ?? []).length - 1 ? 14 : 0, borderBottom: i < (order.items ?? []).length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <Thumb
                    src={(item as any).product?.main_image ?? (item as any).product?.images?.[0]?.image_url}
                    alt={(item as any).title ?? "Product"}
                    size={64}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(item as any).title ?? (item as any).product_title ?? "Product"}
                    </p>
                    {(item as any).variant && (
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 4px" }}>
                        {Object.entries((item as any).variant.attributes ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                    )}
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                      Qty {item.quantity} · {formatCurrency(item.price)} each
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: BRAND, margin: 0 }}>
                      {formatCurrency(item.quantity * item.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order total breakdown */}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `2px solid ${BORDER}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: BRAND }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: BRAND, letterSpacing: "-0.02em" }}>
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
              {order.refund_amount && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: "#7C3AED" }}>Refund applied</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>−{formatCurrency(order.refund_amount)}</span>
                </div>
              )}
            </div>
          </Section>

          {/* ── Payment ── */}
          {payment && (
            <Section title="Payment" icon="💳">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Status</p>
                  {ps && <Badge label={ps.label} color={ps.color} bg={ps.bg} border={ps.border} dot={ps.dot} />}
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Method</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: 0, textTransform: "capitalize" }}>
                    {payment.method?.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Amount</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: 0 }}>{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Date</p>
                  <p style={{ fontSize: 13, color: BRAND, margin: 0, fontWeight: 600 }}>{fmtDateShort(payment.created_at)}</p>
                </div>
              </div>

              {/* Proof uploaded */}
              {payment.proof && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📎</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#065F46", margin: "0 0 1px" }}>Payment proof uploaded</p>
                    <p style={{ fontSize: 11, color: "#6EE7B7", margin: 0 }}>{fmtDate(payment.proof.uploaded_at)}</p>
                  </div>
                  <a href={payment.proof.file_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, fontWeight: 700, color: "#065F46", textDecoration: "none" }}>
                    View →
                  </a>
                </div>
              )}

              {/* On hold notice */}
              {payment.status === "on_hold" && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#7C3D0A", margin: "0 0 3px" }}>⏳ Payment under review</p>
                  <p style={{ fontSize: 12, color: "#92400E", margin: 0 }}>Our team is reviewing your payment. This usually takes 1–2 business days.</p>
                </div>
              )}

              {/* Rejected notice */}
              {payment.status === "rejected" && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", margin: "0 0 3px" }}>⚠ Payment rejected</p>
                  <p style={{ fontSize: 12, color: "#B91C1C", margin: 0 }}>Please contact us to resolve your payment or upload a new proof.</p>
                </div>
              )}
            </Section>
          )}

          {/* ── Shipping address ── */}
          {addr && (
            <Section title="Delivery Address" icon="📍">
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 14 }}>
                {addr.full_name && (
                  <>
                    <span style={{ color: "#94A3B8", fontWeight: 600, fontSize: 12 }}>Name</span>
                    <span style={{ fontWeight: 700, color: BRAND }}>{addr.full_name}</span>
                  </>
                )}
                {addr.phone && (
                  <>
                    <span style={{ color: "#94A3B8", fontWeight: 600, fontSize: 12 }}>Phone</span>
                    <span style={{ color: BRAND }}>{addr.phone}</span>
                  </>
                )}
                {addr.address_line1 && (
                  <>
                    <span style={{ color: "#94A3B8", fontWeight: 600, fontSize: 12 }}>Address</span>
                    <span style={{ color: BRAND }}>
                      {addr.address_line1}
                      {addr.address_line2 && <>, {addr.address_line2}</>}
                    </span>
                  </>
                )}
                {addr.city && (
                  <>
                    <span style={{ color: "#94A3B8", fontWeight: 600, fontSize: 12 }}>City</span>
                    <span style={{ color: BRAND }}>
                      {addr.city}{addr.district && `, ${addr.district}`}
                    </span>
                  </>
                )}
                {addr.country && (
                  <>
                    <span style={{ color: "#94A3B8", fontWeight: 600, fontSize: 12 }}>Country</span>
                    <span style={{ color: BRAND }}>
                      {addr.country}{addr.postal_code && ` · ${addr.postal_code}`}
                    </span>
                  </>
                )}
              </div>
            </Section>
          )}

          {/* ── Return / Refund status ── */}
          {((order.return_status && order.return_status !== "none") ||
            (order.refund_status && order.refund_status !== "none")) && (
            <Section title="Return & Refund" icon="↩">
              {order.return_status && order.return_status !== "none" && (
                <div style={{ marginBottom: order.refund_status && order.refund_status !== "none" ? 14 : 0 }}>
                  <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Return Status</p>
                  <Badge label={`↩ ${order.return_status.replace(/_/g, " ")}`} color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" />
                  {order.return_reason && (
                    <p style={{ fontSize: 13, color: "#64748B", margin: "8px 0 0", fontStyle: "italic" }}>"{order.return_reason}"</p>
                  )}
                </div>
              )}
              {order.refund_status && order.refund_status !== "none" && (
                <div>
                  <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Refund Status</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Badge label={`💰 ${order.refund_status.replace(/_/g, " ")}`} color="#6D28D9" bg="#EDE9FE" border="#C4B5FD" />
                    {order.refund_amount && (
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#6D28D9" }}>
                        {formatCurrency(order.refund_amount)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ── Notes ── */}
          {order.notes && (
            <Section title="Order Notes" icon="📝">
              <p style={{ fontSize: 14, color: BRAND, margin: 0, lineHeight: 1.6 }}>{order.notes}</p>
            </Section>
          )}

          {/* ── Actions ── */}
          {order.status === "pending" && !cancelDone && (
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 18, padding: "18px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: BRAND, margin: "0 0 12px" }}>Actions</p>

              {!showCancelConf ? (
                <button
                  className="od-ghost"
                  onClick={() => setShowCancelConf(true)}
                  style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid #FECDD3`, background: "#FFF1F2", color: "#991B1B", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FF }}>
                  Cancel Order
                </button>
              ) : (
                <div style={{ padding: "14px 18px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", margin: "0 0 10px" }}>
                    Are you sure you want to cancel this order?
                  </p>
                  {cancelErr && <p style={{ fontSize: 12, color: DANGER, margin: "0 0 10px" }}>{cancelErr}</p>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="od-btn"
                      onClick={handleCancel}
                      disabled={cancelling}
                      style={{ padding: "9px 20px", borderRadius: 9, background: DANGER, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: cancelling ? "not-allowed" : "pointer", opacity: cancelling ? 0.7 : 1, fontFamily: FF, display: "flex", alignItems: "center", gap: 8 }}>
                      {cancelling && <Spinner />}
                      {cancelling ? "Cancelling…" : "Yes, Cancel"}
                    </button>
                    <button
                      className="od-ghost"
                      onClick={() => { setShowCancelConf(false); setCancelErr(null); }}
                      style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${BORDER}`, background: "#fff", color: BRAND, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FF }}>
                      Keep Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {cancelDone && (
            <div style={{ padding: "16px 20px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#065F46", margin: 0 }}>Order cancelled successfully.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}