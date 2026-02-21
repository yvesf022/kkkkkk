"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi, paymentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, Payment } from "@/lib/types";

const FF = "'Sora', 'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";

const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:   { label: "Pending",   color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳" },
  paid:      { label: "Confirmed", color: "#065F46", bg: "#F0FDF4", border: "#BBF7D0", icon: "✅" },
  shipped:   { label: "Shipped",   color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", icon: "🚚" },
  completed: { label: "Delivered", color: "#166534", bg: "#DCFCE7", border: "#86EFAC", icon: "📦" },
  cancelled: { label: "Cancelled", color: "#991B1B", bg: "#FFF1F2", border: "#FECDD3", icon: "✕"  },
};

const PAY: Record<string, { label: string; dot: string; color: string }> = {
  pending:  { label: "Awaiting Payment", dot: "#F59E0B", color: "#92400E" },
  on_hold:  { label: "Under Review",     dot: "#F97316", color: "#7C3D0A" },
  paid:     { label: "Payment Confirmed",dot: "#10B981", color: "#065F46" },
  rejected: { label: "Payment Rejected", dot: "#F43F5E", color: "#991B1B" },
};

function Thumb({ src, alt, size = 56 }: { src?: string|null; alt: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "linear-gradient(135deg,#F1F5F9,#E2E8F0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, flexShrink: 0 }}>📦</div>
  );
  return <img src={src} alt={alt} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />;
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "kspin .7s linear infinite" }}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".15"/>
      <path d="M10 2a8 8 0 018 8" stroke={ACCENT} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function AccountOrdersPage() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string|null>(null);
  const [filter,  setFilter]  = useState<string>("all");

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

  const paymentFor = (orderId: string) =>
    payments.find(p => p.order_id === orderId) ?? null;

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const tabs = ["all", "pending", "paid", "shipped", "completed", "cancelled"];

  return (
    <div style={{ fontFamily: FF, maxWidth: 860, paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes kspin { to { transform: rotate(360deg); } }
        @keyframes kfadeup { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .korder-card { transition: box-shadow .18s, transform .18s; }
        .korder-card:hover { box-shadow: 0 8px 32px rgba(37,99,235,.13); transform: translateY(-1px); }
        .ktab { transition: all .15s; cursor: pointer; border: none; background: none; }
        .ktab:hover { background: #F1F5F9 !important; }
        .ktab.active { background: #0A0F1E !important; color: #fff !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Account</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: BRAND, letterSpacing: "-0.04em", margin: 0 }}>My Orders</h1>
        {!loading && <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24, padding: "4px", background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`ktab${filter === t ? " active" : ""}`}
            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: FF, color: filter === t ? "#fff" : "#475569", background: filter === t ? BRAND : "transparent", textTransform: "capitalize" }}>
            {t === "all" ? `All (${orders.length})` : `${STATUS[t]?.label ?? t} (${orders.filter(o => o.status === t).length})`}
          </button>
        ))}
      </div>

      {/* ── States ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", color: "#94A3B8" }}>
          <Spinner /><p style={{ fontSize: 14 }}>Loading your orders…</p>
        </div>
      )}
      {error && (
        <div style={{ padding: "20px 24px", borderRadius: 14, background: "#FFF1F2", border: "1px solid #FECDD3", color: "#991B1B", fontSize: 14 }}>⚠ {error}</div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: BRAND, margin: "0 0 8px" }}>No orders yet</h3>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>When you place orders, they'll show up here.</p>
          <Link href="/store" style={{ padding: "12px 28px", borderRadius: 10, background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Browse Store →</Link>
        </div>
      )}

      {/* ── Orders list ── */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((order, i) => {
            const s = STATUS[order.status] ?? STATUS.pending;
            const pmt = paymentFor(order.id);
            const ps = pmt ? PAY[pmt.status] : null;
            const items = order.items ?? [];
            const firstImg = items[0]?.product?.main_image ?? (items[0]?.product?.images as any)?.[0]?.image_url ?? null;

            return (
              <Link key={order.id} href={`/account/orders/${order.id}`} style={{ textDecoration: "none" }}>
                <div className="korder-card" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 22px", animation: `kfadeup .3s ease ${i * 0.05}s both` }}>

                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em" }}>ORDER</span>
                        <code style={{ fontSize: 12, fontWeight: 700, color: BRAND, background: "#F1F5F9", padding: "2px 8px", borderRadius: 6 }}>#{order.id.slice(0, 8).toUpperCase()}</code>
                      </div>
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{new Date(order.created_at).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {ps && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 11, fontWeight: 600, color: ps.color }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ps.dot, display: "inline-block" }}/>
                          {ps.label}
                        </span>
                      )}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, fontSize: 11, fontWeight: 700, color: s.color }}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: -8 }}>
                      {items.slice(0, 4).map((item, idx) => (
                        <div key={item.id} style={{ marginLeft: idx > 0 ? -12 : 0, zIndex: items.length - idx }}>
                          <Thumb src={item.product?.main_image ?? (item.product?.images as any)?.[0]?.image_url} alt={item.title ?? (item as any).product_title} size={48} />
                        </div>
                      ))}
                      {items.length > 4 && (
                        <div style={{ width: 48, height: 48, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#64748B", marginLeft: -12, border: "2px solid #fff" }}>
                          +{items.length - 4}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {items.length > 0 ? items.map(i => i.title).join(", ") : "Order items"}
                      </p>
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{items.length} item{items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: BRAND, margin: 0 }}>{formatCurrency(order.total_amount)}</p>
                      {order.tracking_number && (
                        <p style={{ fontSize: 11, color: "#64748B", margin: "2px 0 0" }}>Track: {order.tracking_number}</p>
                      )}
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F1F5F9", paddingTop: 12 }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      {order.shipping_status && order.shipping_status !== "pending" && (
                        <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                          Shipping: <strong style={{ color: BRAND, textTransform: "capitalize" }}>{order.shipping_status.replace(/_/g, " ")}</strong>
                        </span>
                      )}
                      {order.tracking_number && (
                        <span style={{ fontSize: 12, color: "#64748B" }}>📍 {order.tracking_number}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>View details →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}