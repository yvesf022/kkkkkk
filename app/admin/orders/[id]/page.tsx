"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ordersApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order } from "@/lib/types";

const FF = "'DM Sans', -apple-system, sans-serif";
const ACCENT = "#2563EB";
const BRAND = "#0F172A";

const STATUS_META: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:   { color: "#92400E", bg: "#FFFBEB", label: "Pending",   icon: "⏳" },
  paid:      { color: "#065F46", bg: "#F0FDF4", label: "Paid",      icon: "✅" },
  shipped:   { color: "#1E40AF", bg: "#EFF6FF", label: "Shipped",   icon: "🚚" },
  completed: { color: "#166534", bg: "#F0FDF4", label: "Delivered", icon: "📦" },
  cancelled: { color: "#9F1239", bg: "#FFF1F2", label: "Cancelled", icon: "❌" },
};

const TABS = [
  { key: "", label: "All Orders" },
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 10.5l4-3.5L5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Spinner = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".15"/>
    <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const Trash2 = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
    <polyline points="3 6 5 6 17 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2M15 6v10a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getMy();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = activeTab ? orders.filter(o => o.status === activeTab) : orders;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map(o => o.id)));
  const clearSelection = () => setSelected(new Set());

  // Delete cancelled orders (user can only cancel their own cancelled orders)
  const handleDeleteSelected = async () => {
    const toDelete = [...selected].filter(id => {
      const o = orders.find(x => x.id === id);
      return o?.status === "cancelled";
    });
    if (toDelete.length === 0) {
      showToast("Only cancelled orders can be deleted", "err");
      return;
    }
    setDeleting(true);
    try {
      // Cancel operation — orders are soft-deleted by cancelling (user can only cancel pending)
      // For "delete all" UI, we show cancelled orders and let user clean up view
      // Since there's no user bulk-delete endpoint, we just remove from local state
      setOrders(prev => prev.filter(o => !toDelete.includes(o.id)));
      setSelected(new Set());
      setShowDeleteConfirm(false);
      showToast(`Removed ${toDelete.length} cancelled order(s) from view`);
    } catch (e: any) {
      showToast(e.message ?? "Failed to delete", "err");
    } finally {
      setDeleting(false);
    }
  };

  const allCancelledSelected = [...selected].every(id => orders.find(o => o.id === id)?.status === "cancelled");

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        .order-row:hover { background: #FAFBFF !important; }
        .tab-btn { transition: all .15s; }
        .tab-btn:hover { color: ${ACCENT}; }
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toast.type === "ok" ? BRAND : "#DC2626" }}>
          {toast.type === "ok" ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>My Orders</h1>
          <p style={S.pageSub}>{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
        </div>
        {selected.size > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#64748B" }}>{selected.size} selected</span>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={S.dangerBtn}
              disabled={!allCancelledSelected}
              title={!allCancelledSelected ? "Only cancelled orders can be removed" : ""}
            >
              <Trash2 /> Remove Selected
            </button>
            <button onClick={clearSelection} style={S.ghostBtn}>Clear</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className="tab-btn"
            onClick={() => { setActiveTab(tab.key); clearSelection(); }}
            style={{
              ...S.tab,
              color: activeTab === tab.key ? ACCENT : "#64748B",
              borderBottom: activeTab === tab.key ? `2px solid ${ACCENT}` : "2px solid transparent",
              fontWeight: activeTab === tab.key ? 700 : 500,
            }}
          >
            {tab.label}
            {tab.key === "" && <span style={S.tabCount}>{orders.length}</span>}
            {tab.key !== "" && orders.filter(o => o.status === tab.key).length > 0 && (
              <span style={S.tabCount}>{orders.filter(o => o.status === tab.key).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Select all bar */}
      {filtered.length > 0 && (
        <div style={S.selectBar}>
          <button onClick={selected.size === filtered.length ? clearSelection : selectAll} style={S.selectAllBtn}>
            <input
              type="checkbox"
              readOnly
              checked={selected.size === filtered.length && filtered.length > 0}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "#64748B" }}>Select all</span>
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={S.loadCenter}>
          <div style={{ color: ACCENT }}><Spinner /></div>
          <p style={{ color: "#94A3B8", fontSize: 14 }}>Loading orders…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND }}>No orders yet</h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            {activeTab ? `No ${activeTab} orders found.` : "Start shopping to see your orders here."}
          </p>
          <Link href="/store" style={S.primaryLink}>Browse Products →</Link>
        </div>
      ) : (
        <div style={S.list}>
          {filtered.map(order => {
            const meta = STATUS_META[order.status] ?? STATUS_META.pending;
            const isSelected = selected.has(order.id);
            const firstItem = order.items?.[0];
            return (
              <div
                key={order.id}
                className="order-row"
                style={{
                  ...S.orderCard,
                  border: isSelected ? `1px solid ${ACCENT}` : "1px solid #E2E8F0",
                  background: isSelected ? "#F0F7FF" : "#fff",
                }}
              >
                {/* Checkbox */}
                <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(order.id)}
                    style={{ cursor: "pointer", marginRight: 14, marginTop: 2, width: 16, height: 16, accentColor: ACCENT }}
                  />
                </div>

                {/* Thumbnail */}
                <div style={S.thumb}>
                  {firstItem?.product?.main_image
                    ? <img src={firstItem.product.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                    : <span style={{ fontSize: 22 }}>📦</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: BRAND }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ ...S.badge, color: meta.color, background: meta.bg }}>{meta.icon} {meta.label}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#475569", margin: "0 0 4px" }}>
                    {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                    {firstItem && ` · ${firstItem.title.slice(0, 40)}${firstItem.title.length > 40 ? "…" : ""}`}
                  </p>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                    {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>

                {/* Amount */}
                <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 16, color: BRAND, margin: "0 0 4px" }}>{formatCurrency(order.total_amount)}</p>
                  {order.payment_status && (
                    <p style={{ fontSize: 11, color: order.payment_status === "paid" ? "#10B981" : "#F59E0B", fontWeight: 600, textTransform: "uppercase" as const }}>
                      {order.payment_status.replace(/_/g, " ")}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <Link href={`/account/orders/${order.id}`} style={S.arrowLink}>
                  <ChevronRight />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={S.modalBackdrop} onClick={() => setShowDeleteConfirm(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, marginBottom: 8 }}>Remove Orders?</h3>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>
              Remove {selected.size} cancelled order{selected.size !== 1 ? "s" : ""} from your view? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDeleteSelected} disabled={deleting} style={{ ...S.dangerBtn, flex: 1 }}>
                {deleting ? "Removing…" : "Yes, Remove"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} style={S.ghostBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 880, margin: "0 auto", padding: "24px 20px 48px", fontFamily: FF },
  toast: { position: "fixed" as const, bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: FF, zIndex: 9999, animation: "fadeUp .3s ease", boxShadow: "0 4px 20px rgba(0,0,0,.25)" },
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12, marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", margin: 0 },
  pageSub: { fontSize: 13, color: "#94A3B8", margin: "4px 0 0" },
  tabBar: { display: "flex", gap: 0, borderBottom: "1px solid #E2E8F0", marginBottom: 20, overflowX: "auto" as const },
  tab: { padding: "10px 16px", border: "none", background: "transparent", fontFamily: FF, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" as const, display: "flex", alignItems: "center", gap: 6 },
  tabCount: { fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "#F1F5F9", color: "#64748B" },
  selectBar: { display: "flex", alignItems: "center", marginBottom: 10 },
  selectAllBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: FF, padding: "4px 0" },
  loadCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "64px 0", color: "#64748B" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 0", textAlign: "center" as const, gap: 10 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  orderCard: { display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 14, transition: "all .15s", cursor: "default", animation: "fadeUp .25s ease" },
  thumb: { width: 52, height: 52, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  badge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  arrowLink: { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#F8FAFC", color: "#64748B", textDecoration: "none", flexShrink: 0 },
  primaryLink: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 24px", borderRadius: 10, background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, marginTop: 8 },
  dangerBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 10, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  ghostBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "transparent", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  modalBackdrop: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "28px", width: "100%", maxWidth: 400, animation: "fadeUp .2s ease" },
};