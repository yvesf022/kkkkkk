"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi, paymentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, Payment } from "@/lib/types";

const FF = "'Sora', 'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";
const SUCCESS = "#10B981";
const BORDER = "#E2E8F0";

/* ─── Status config ─── */
const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: string; step: number }> = {
  pending:   { label: "Pending",   color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", step: 0 },
  paid:      { label: "Confirmed", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", icon: "✅", step: 1 },
  shipped:   { label: "Shipped",   color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", icon: "🚚", step: 2 },
  completed: { label: "Delivered", color: "#166534", bg: "#DCFCE7", border: "#86EFAC", icon: "📦", step: 3 },
  cancelled: { label: "Cancelled", color: "#991B1B", bg: "#FFF1F2", border: "#FECDD3", icon: "✕",  step: -1 },
};
const PAY: Record<string, { label: string; dot: string; color: string; bg: string }> = {
  pending:  { label: "Awaiting Payment",  dot: "#F59E0B", color: "#92400E", bg: "#FFFBEB" },
  on_hold:  { label: "Under Review",      dot: "#F97316", color: "#7C3D0A", bg: "#FFF7ED" },
  paid:     { label: "Payment Confirmed", dot: "#10B981", color: "#065F46", bg: "#ECFDF5" },
  rejected: { label: "Payment Rejected",  dot: "#F43F5E", color: "#991B1B", bg: "#FFF1F2" },
};

const STEPS = ["Placed", "Confirmed", "Shipped", "Delivered"];

/* ─── Components ─── */
function Thumb({ src, alt, size = 52 }: { src?: string | null; alt: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "linear-gradient(135deg,#F1F5F9,#E2E8F0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, flexShrink: 0 }}>📦</div>
  );
  return <img src={src} alt={alt} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1px solid #F1F5F9" }} />;
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "kspin .7s linear infinite" }}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".15"/>
      <path d="M10 2a8 8 0 018 8" stroke={ACCENT} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/* Mini progress bar component */
function OrderProgress({ status }: { status: string }) {
  const s = STATUS[status];
  if (!s || status === "cancelled") return null;
  const step = s.step;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
      {STEPS.map((label, i) => {
        const done = step >= i;
        const active = step === i;
        return (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {i < STEPS.length - 1 && (
              <div style={{ position: "absolute", top: 7, left: "50%", width: "100%", height: 2, background: step > i ? ACCENT : "#E2E8F0", transition: "background .4s", zIndex: 0 }} />
            )}
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: done ? ACCENT : "#E2E8F0", zIndex: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? `0 0 0 4px rgba(37,99,235,.15)` : "none", transition: "all .3s" }}>
              {done && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.5 1.5 3.5-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ fontSize: 9, color: done ? ACCENT : "#94A3B8", fontWeight: done ? 700 : 500, marginTop: 3, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AccountOrdersPage() {
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<string>("all");
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [ords, pmts] = await Promise.allSettled([
          ordersApi.getMy(),
          paymentsApi.getMy(),
        ]);
        if (ords.status === "fulfilled") {
          const v: any = ords.value;
          setOrders(Array.isArray(v) ? v : v?.orders ?? v?.results ?? []);
        }
        if (pmts.status === "fulfilled") {
          const v: any = pmts.value;
          setPayments(Array.isArray(v) ? v : v?.payments ?? v?.results ?? []);
        }
      } catch (e: any) {
        setError(e?.message ?? "Could not load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const paymentFor = (orderId: string) => payments.find(p => p.order_id === orderId) ?? null;

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === "all" || o.status === filter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q
      || o.id.toLowerCase().includes(q)
      || (o.items ?? []).some(i => (i.title ?? "").toLowerCase().includes(q))
      || (o.tracking_number ?? "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const tabs = ["all", "pending", "paid", "shipped", "completed", "cancelled"];
  const counts = tabs.reduce((acc, t) => {
    acc[t] = t === "all" ? orders.length : orders.filter(o => o.status === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ fontFamily: FF, maxWidth: 900, paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes kspin { to { transform: rotate(360deg); } }
        @keyframes kfade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .kcard { transition: box-shadow .18s, transform .18s; }
        .kcard:hover { box-shadow: 0 8px 32px rgba(37,99,235,.12); transform: translateY(-1px); }
        .ktab { border:none; background:none; cursor:pointer; transition:all .15s; }
        .ktab:hover { background:#F1F5F9 !important; }
        .ktab.active { background:#0A0F1E !important; color:#fff !important; }
        .ksearch:focus { border-color: #2563EB; outline: none; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Account</p>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: BRAND, letterSpacing: "-0.04em", margin: "0 0 6px" }}>My Orders</h1>
        {!loading && (
          <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
            {orders.length} order{orders.length !== 1 ? "s" : ""} total ·{" "}
            <span style={{ color: SUCCESS, fontWeight: 600 }}>
              {orders.filter(o => o.status === "shipped").length} in transit
            </span>
          </p>
        )}
      </div>

      {/* ── Search ── */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <svg style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <input
          className="ksearch"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order ID, product name, or tracking number…"
          style={{ width: "100%", padding: "11px 16px 11px 38px", borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 14, fontFamily: FF, color: BRAND, background: "#fff", boxSizing: "border-box", transition: "all .15s" }}
        />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16 }}>
            ✕
          </button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 24, padding: "4px", background: "#F8FAFC", borderRadius: 12, border: `1px solid ${BORDER}` }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`ktab${filter === t ? " active" : ""}`}
            style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: FF, color: filter === t ? "#fff" : "#475569", textTransform: "capitalize" }}>
            {t === "all" ? "All" : STATUS[t]?.label ?? t}
            <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 20, background: filter === t ? "rgba(255,255,255,.25)" : "#E2E8F0", fontSize: 11, fontWeight: 800 }}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* ── States ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", color: "#94A3B8" }}>
          <Spinner />
          <p style={{ fontSize: 14 }}>Loading your orders…</p>
        </div>
      )}

      {error && (
        <div style={{ padding: "20px 24px", borderRadius: 14, background: "#FFF1F2", border: "1px solid #FECDD3", color: "#991B1B", fontSize: 14 }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && filteredOrders.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{search || filter !== "all" ? "🔍" : "📭"}</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: BRAND, margin: "0 0 8px" }}>
            {search ? "No matching orders" : filter !== "all" ? `No ${STATUS[filter]?.label ?? filter} orders` : "No orders yet"}
          </h3>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>
            {search ? "Try a different search term." : filter !== "all" ? "Try a different filter." : "When you place orders, they'll show up here."}
          </p>
          {!search && filter === "all" && (
            <Link href="/store" style={{ padding: "12px 28px", borderRadius: 10, background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
              Browse Store →
            </Link>
          )}
        </div>
      )}

      {/* ── Orders list ── */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredOrders.map((order, i) => {
            const s = STATUS[order.status] ?? STATUS.pending;
            const pmt = paymentFor(order.id);
            const ps = pmt ? PAY[pmt.status] : null;
            const items = order.items ?? [];
            const hasTracking = !!(order.tracking_number || (order as any).tracking?.tracking_number);
            const trackingNum = order.tracking_number || (order as any).tracking?.tracking_number;
            const trackingCarrier = (order as any).tracking?.carrier;
            const trackingUrl = (order as any).tracking?.tracking_url;
            const estimatedDelivery = (order as any).tracking?.estimated_delivery;

            return (
              <div key={order.id} className="kcard"
                style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", animation: `kfade .3s ease ${i * 0.04}s both` }}>

                {/* Status accent line */}
                <div style={{ height: 3, background: s.bg, borderBottom: `1px solid ${s.border}` }}>
                  {order.status === "shipped" && (
                    <div style={{ height: "100%", background: `linear-gradient(90deg, ${ACCENT}, #60A5FA)`, animation: "none" }} />
                  )}
                  {order.status === "completed" && (
                    <div style={{ height: "100%", background: `linear-gradient(90deg, ${SUCCESS}, #34D399)` }} />
                  )}
                </div>

                <Link href={`/account/orders/${order.id}`} style={{ textDecoration: "none", display: "block", padding: "18px 22px 16px" }}>

                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <code style={{ fontSize: 13, fontWeight: 800, color: BRAND, background: "#F1F5F9", padding: "3px 10px", borderRadius: 7, letterSpacing: "0.04em" }}>
                          #{order.id.slice(0, 8).toUpperCase()}
                        </code>
                        {/* Status badge */}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, fontSize: 11, fontWeight: 700, color: s.color }}>
                          {s.icon} {s.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                        {new Date(order.created_at).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: BRAND }}>
                        {formatCurrency(order.total_amount)}
                      </span>
                      {ps && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 20, background: ps.bg, border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 600, color: ps.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: ps.dot }} />
                          {ps.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items preview */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                    {/* Stacked thumbs */}
                    <div style={{ display: "flex", flexShrink: 0 }}>
                      {items.slice(0, 4).map((item, idx) => (
                        <div key={item.id} style={{ marginLeft: idx > 0 ? -10 : 0, zIndex: items.length - idx, borderRadius: 10, border: "2px solid #fff" }}>
                          <Thumb src={item.product?.main_image ?? (item.product?.images as any)?.[0]?.image_url} alt={item.title ?? ""} size={46} />
                        </div>
                      ))}
                      {items.length > 4 && (
                        <div style={{ width: 46, height: 46, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#64748B", marginLeft: -10, border: "2px solid #fff" }}>
                          +{items.length - 4}
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {items.length > 0 ? items.map(i => i.title).filter(Boolean).join(", ") : "Order items"}
                      </p>
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                        {items.length} item{items.length !== 1 ? "s" : ""}
                        {order.shipping_status && order.shipping_status !== "pending" && (
                          <> · <span style={{ color: BRAND, textTransform: "capitalize" }}>Shipping: {order.shipping_status.replace(/_/g, " ")}</span></>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Order progress tracker */}
                  {order.status !== "cancelled" && (
                    <div style={{ marginBottom: 14, padding: "12px 0 4px" }}>
                      <OrderProgress status={order.status} />
                    </div>
                  )}

                  {/* Tracking info */}
                  {hasTracking && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>🚚</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#065F46", margin: "0 0 1px" }}>
                          {trackingCarrier && <>{trackingCarrier} · </>}
                          <code style={{ fontFamily: "monospace" }}>{trackingNum}</code>
                        </p>
                        {estimatedDelivery && (
                          <p style={{ fontSize: 11, color: "#6EE7B7", margin: 0, fontWeight: 600 }}>
                            Est. delivery: {new Date(estimatedDelivery).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      {trackingUrl && (
                        <a href={trackingUrl} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ padding: "5px 12px", background: "#065F46", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                          Track →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Return / Refund status */}
                  {(order.return_status && order.return_status !== "none") && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, marginBottom: 10 }}>
                      <span>↩</span>
                      <p style={{ fontSize: 12, color: "#92400E", margin: 0, fontWeight: 600 }}>
                        Return <span style={{ textTransform: "capitalize" }}>{order.return_status.replace(/_/g, " ")}</span>
                      </p>
                    </div>
                  )}
                  {(order.refund_status && order.refund_status !== "none") && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, marginBottom: 10 }}>
                      <span>💰</span>
                      <p style={{ fontSize: 12, color: "#7C3AED", margin: 0, fontWeight: 600 }}>
                        Refund <span style={{ textTransform: "capitalize" }}>{order.refund_status.replace(/_/g, " ")}</span>
                        {order.refund_amount && <> · {formatCurrency(order.refund_amount)}</>}
                      </p>
                    </div>
                  )}

                  {/* Admin notes visible to customer */}
                  {(order as any).customer_notes?.length > 0 && (
                    <div style={{ padding: "8px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, marginBottom: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1E40AF", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Message from us</p>
                      <p style={{ fontSize: 12, color: "#1E40AF", margin: 0 }}>{(order as any).customer_notes[0]?.content}</p>
                    </div>
                  )}

                  {/* Bottom row */}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", borderTop: `1px solid #F1F5F9`, paddingTop: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>View details →</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}