"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ordersApi, adminOrdersAdvancedApi, paymentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order, OrderStatus, ShippingStatus } from "@/lib/types";

/* ─── Design tokens ─── */
const FF = "'Syne', 'DM Sans', -apple-system, sans-serif";
const FFBody = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";
const ACCENT2 = "#7C3AED";
const SURFACE = "#F8FAFF";
const BORDER = "#E2E8F0";

/* ─── Status config ─── */
const STATUS_META: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  pending:   { color: "#92400E", bg: "#FFFBEB", label: "Pending",   dot: "#F59E0B" },
  paid:      { color: "#065F46", bg: "#ECFDF5", label: "Paid",      dot: "#10B981" },
  shipped:   { color: "#1E40AF", bg: "#EFF6FF", label: "Shipped",   dot: "#3B82F6" },
  completed: { color: "#166534", bg: "#F0FDF4", label: "Completed", dot: "#22C55E" },
  cancelled: { color: "#9F1239", bg: "#FFF1F2", label: "Cancelled", dot: "#F43F5E" },
};
const PAYMENT_COLOR: Record<string, string> = {
  pending: "#F59E0B", on_hold: "#F97316", paid: "#10B981", rejected: "#EF4444",
};
const SHIP_META: Record<string, { label: string; color: string }> = {
  pending:    { label: "Not Shipped", color: "#94A3B8" },
  processing: { label: "Processing",  color: "#F59E0B" },
  shipped:    { label: "In Transit",  color: "#3B82F6" },
  delivered:  { label: "Delivered",   color: "#10B981" },
  returned:   { label: "Returned",    color: "#EF4444" },
};
const STATUS_FILTERS = ["", "pending", "paid", "shipped", "completed", "cancelled"] as const;
const TAB_LABELS: Record<string, string> = {
  "": "All", pending: "Pending", paid: "Paid",
  shipped: "Shipped", completed: "Completed", cancelled: "Cancelled",
};

/* ─── Icons ─── */
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const Spinner = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".12" />
    <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ─── Helpers ─── */
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function normalizeOrders(data: unknown): Order[] {
  if (Array.isArray(data)) return data as Order[];
  const d = data as any;
  if (d && Array.isArray(d.results)) return d.results;
  if (d && Array.isArray(d.orders)) return d.orders;
  return [];
}

/* ─── Product thumbnail ─── */
function Thumb({ order }: { order: Order }) {
  const imgs: string[] = [];
  (order.items ?? []).forEach((item) => {
    const img = item.product?.main_image ?? (item.product?.images?.[0]?.image_url ?? "");
    if (img && !imgs.includes(img)) imgs.push(img);
  });
  const shown = imgs.slice(0, 3);
  if (shown.length === 0) {
    return (
      <div style={S.thumbWrap}>
        <div style={{ ...S.thumbSingle, background: "#F1F5F9", color: "#94A3B8", fontSize: 20 }}>📦</div>
      </div>
    );
  }
  if (shown.length === 1) {
    return (
      <div style={S.thumbWrap}>
        <img src={shown[0]} alt="" style={S.thumbSingle} onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
      </div>
    );
  }
  return (
    <div style={{ ...S.thumbWrap, display: "flex", gap: 2 }}>
      {shown.map((src, i) => (
        <img key={i} src={src} alt="" style={{ ...S.thumbMulti, width: shown.length === 2 ? "50%" : "33.3%" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ))}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulking, setBulking] = useState(false);
  const [confirmModal, setConfirmModal] = useState<"delete-selected" | "purge-cancelled" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" | "warn" } | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "ok" | "err" | "warn" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3800);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await ordersApi.getAdmin(filter || undefined);
      setOrders(normalizeOrders(raw));
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load orders", "err");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(new Set()); }, [filter]);

  /* Search filter */
  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      (o as any).user?.email?.toLowerCase().includes(q) ||
      (o as any).user?.full_name?.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q) ||
      o.items?.some((item) => item.title?.toLowerCase().includes(q))
    );
  });

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map((o) => o.id)));
  const clearSelection = () => setSelected(new Set());
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  /* ─── Bulk actions ─── */
  async function handleBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === "hard-delete") { setConfirmModal("delete-selected"); return; }
    setBulking(true);
    try {
      const ids = [...selected];
      const reason = bulkReason || `Bulk ${bulkAction} by admin`;
      if (bulkAction === "cancel") {
        await Promise.all(ids.map((id) => ordersApi.cancel(id, reason)));
        showToast(`${ids.length} order(s) cancelled`);
      } else if (bulkAction === "force-shipped") {
        await Promise.all(ids.map((id) => adminOrdersAdvancedApi.forceStatus(id, { status: "shipped", reason })));
        showToast(`${ids.length} order(s) marked shipped`);
      } else if (bulkAction === "force-complete") {
        await Promise.all(ids.map((id) => adminOrdersAdvancedApi.forceStatus(id, { status: "completed", reason })));
        showToast(`${ids.length} order(s) marked completed`);
      } else if (bulkAction === "restore") {
        await Promise.all(ids.map((id) => adminOrdersAdvancedApi.restore(id)));
        showToast(`${ids.length} order(s) restored`);
      }
      clearSelection(); setBulkAction(""); setBulkReason("");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Bulk action failed", "err");
    } finally {
      setBulking(false);
    }
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => adminOrdersAdvancedApi.hardDelete(id)));
      showToast(`${ids.length} order(s) permanently deleted`);
      setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      clearSelection(); setConfirmModal(null);
    } catch (e: any) {
      showToast(e?.message ?? "Delete failed", "err");
    } finally {
      setDeleting(false);
    }
  }

  async function handlePurgeCancelled() {
    setDeleting(true);
    try {
      const cancelled = orders.filter((o) => o.status === "cancelled").map((o) => o.id);
      await Promise.all(cancelled.map((id) => adminOrdersAdvancedApi.hardDelete(id)));
      showToast(`${cancelled.length} cancelled order(s) purged`);
      setOrders((prev) => prev.filter((o) => o.status !== "cancelled"));
      setConfirmModal(null);
    } catch (e: any) {
      showToast(e?.message ?? "Purge failed", "err");
    } finally {
      setDeleting(false);
    }
  }

  /* ─── Quick shipping update ─── */
  async function handleShippingUpdate(orderId: string, status: ShippingStatus) {
    try {
      await ordersApi.updateShipping(orderId, { status });
      showToast("Shipping status updated");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Update failed", "err");
    }
  }

  /* ─── Quick cancel ─── */
  async function handleAdminCancel(orderId: string) {
    try {
      await adminOrdersAdvancedApi.forceStatus(orderId, { status: "cancelled", reason: "Cancelled by admin" });
      showToast("Order cancelled");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "err");
    }
  }

  const toastBg = toast?.type === "ok" ? "#10B981" : toast?.type === "warn" ? "#F59E0B" : "#EF4444";

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        .row-h:hover { background: #F8FAFF !important; }
        .btn-h:hover { opacity: .85; transform: translateY(-1px); }
        .tab-h:hover { color: ${ACCENT}; }
        .gh:hover { background: #F1F5F9; }
        select, input { font-family: ${FFBody}; }
        .expand-row { animation: slideIn .2s ease; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ ...S.toast, background: toastBg }}>
          {toast.type === "ok" ? "✓" : toast.type === "warn" ? "⚠" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Orders</h1>
          <p style={S.sub}>
            {loading ? "Loading…" : `${orders.length} total · ${orders.filter(o => o.status === "pending").length} pending`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const }}>
          {cancelledCount > 0 && (
            <button onClick={() => setConfirmModal("purge-cancelled")} style={S.dangerOutline} className="btn-h">
              <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={14} />
              Purge {cancelledCount} Cancelled
            </button>
          )}
          <button onClick={load} style={S.ghostSm} className="gh">
            <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={S.statsStrip}>
        {(["pending","paid","shipped","completed","cancelled"] as const).map((s) => {
          const count = orders.filter(o => o.status === s).length;
          const m = STATUS_META[s];
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              ...S.statPill,
              background: filter === s ? m.bg : "#fff",
              border: `1px solid ${filter === s ? m.dot : BORDER}`,
              color: filter === s ? m.color : "#64748B",
            }} className="btn-h">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot, flexShrink: 0, display: "inline-block" }} />
              {m.label} <strong style={{ color: filter === s ? m.color : BRAND }}>{count}</strong>
            </button>
          );
        })}
      </div>

      {/* Filter/search bar */}
      <div style={S.filterBar}>
        <div style={S.searchBox}>
          <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer, product…"
            style={S.searchInput}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>✕</button>
          )}
        </div>

        {/* Tab filter */}
        <div style={S.tabRow}>
          {STATUS_FILTERS.map((f) => {
            const cnt = f === "" ? orders.length : orders.filter(o => o.status === f).length;
            return (
              <button key={f} onClick={() => setFilter(f)} className="tab-h"
                style={{
                  ...S.tab,
                  color: filter === f ? ACCENT : "#64748B",
                  borderBottom: filter === f ? `2px solid ${ACCENT}` : "2px solid transparent",
                  fontWeight: filter === f ? 700 : 500,
                }}
              >
                {TAB_LABELS[f]}
                <span style={{ ...S.tabCount, background: filter === f ? ACCENT : "#F1F5F9", color: filter === f ? "#fff" : "#64748B" }}>{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={S.bulkBar}>
          <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, fontFamily: FF }}>{selected.size} selected</span>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} style={S.selectSm}>
            <option value="">Choose action…</option>
            <option value="cancel">Cancel Orders</option>
            <option value="force-shipped">Mark Shipped</option>
            <option value="force-complete">Mark Completed</option>
            <option value="restore">Restore Orders</option>
            <option value="hard-delete">Hard Delete</option>
          </select>
          {bulkAction && bulkAction !== "hard-delete" && (
            <input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="Reason (optional)"
              style={{ ...S.searchInput, flex: "1 1 180px", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 12px", maxWidth: 260 }}
            />
          )}
          <button onClick={handleBulkAction} disabled={!bulkAction || bulking} style={S.primarySm} className="btn-h">
            {bulking ? <Spinner size={14} /> : "Apply"}
          </button>
          <button onClick={clearSelection} style={S.ghostSm} className="gh">Clear</button>
        </div>
      )}

      {/* Select all row */}
      {filtered.length > 0 && !loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", marginBottom: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#64748B", fontFamily: FFBody }}>
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={() => selected.size === filtered.length ? clearSelection() : selectAll()}
              style={{ cursor: "pointer", accentColor: ACCENT, width: 15, height: 15 }}
            />
            Select all {filtered.length} orders
          </label>
          {search && <span style={{ fontSize: 12, color: "#94A3B8" }}>({filtered.length} matching)</span>}
        </div>
      )}

      {/* ─── Table ─── */}
      {loading ? (
        <div style={S.loadCenter}>
          <div style={{ color: ACCENT }}><Spinner size={28} /></div>
          <p style={{ color: "#94A3B8", fontSize: 14, fontFamily: FFBody }}>Loading orders…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>📭</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND, fontFamily: FF }}>No orders found</h2>
          <p style={{ color: "#94A3B8", fontSize: 14, fontFamily: FFBody }}>
            {search ? `No results for "${search}"` : filter ? `No ${filter} orders` : "No orders yet"}
          </p>
          {(search || filter) && (
            <button onClick={() => { setSearch(""); setFilter(""); }} style={{ ...S.primarySm, marginTop: 12 }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr style={{ background: "#F8FAFF" }}>
                <th style={{ ...S.th, width: 36 }}></th>
                <th style={{ ...S.th, width: 72 }}>Preview</th>
                <th style={S.th}>Order</th>
                <th style={S.th}>Customer</th>
                <th style={S.th}>Items</th>
                <th style={S.th}>Total</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Payment</th>
                <th style={S.th}>Shipping</th>
                <th style={S.th}>Date</th>
                <th style={{ ...S.th, textAlign: "right" as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const meta = STATUS_META[order.status] ?? STATUS_META.pending;
                const isSelected = selected.has(order.id);
                const lastPmt = order.payments?.[order.payments.length - 1];
                const pmtColor = lastPmt ? (PAYMENT_COLOR[lastPmt.status] ?? "#94A3B8") : null;
                const shipMeta = SHIP_META[order.shipping_status] ?? SHIP_META.pending;
                const isExpanded = expandedRow === order.id;

                return (
                  <>
                    <tr
                      key={order.id}
                      className="row-h"
                      style={{
                        ...S.tr,
                        background: isSelected ? "#EFF6FF" : isExpanded ? "#FAFBFF" : "#fff",
                        borderLeft: isSelected ? `3px solid ${ACCENT}` : isExpanded ? `3px solid ${ACCENT2}` : "3px solid transparent",
                      }}
                    >
                      {/* Checkbox */}
                      <td style={S.td}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(order.id)}
                          style={{ cursor: "pointer", accentColor: ACCENT, width: 15, height: 15 }} />
                      </td>

                      {/* Product thumbnail */}
                      <td style={S.td}>
                        <Thumb order={order} />
                      </td>

                      {/* Order ID */}
                      <td style={S.td}>
                        <button onClick={() => setExpandedRow(isExpanded ? null : order.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 800, color: isExpanded ? ACCENT2 : BRAND, padding: 0, letterSpacing: "0.02em" }}>
                          #{order.id.slice(0, 8).toUpperCase()}
                        </button>
                        {order.tracking_number && (
                          <p style={{ fontSize: 10, color: "#94A3B8", margin: "2px 0 0", fontFamily: FFBody }}>
                            🚚 {order.tracking_number}
                          </p>
                        )}
                      </td>

                      {/* Customer */}
                      <td style={S.td}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: 0, fontFamily: FFBody }}>
                          {(order as any).user?.full_name ?? "Guest"}
                        </p>
                        <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0", fontFamily: FFBody }}>
                          {(order as any).user?.email ?? "—"}
                        </p>
                      </td>

                      {/* Items */}
                      <td style={S.td}>
                        <span style={{ fontSize: 13, color: "#475569", fontFamily: FFBody, fontWeight: 600 }}>
                          {order.items?.length ?? 0}
                        </span>
                        {order.items && order.items.length > 0 && (
                          <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0", fontFamily: FFBody, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                            {order.items[0].title}
                          </p>
                        )}
                      </td>

                      {/* Total */}
                      <td style={S.td}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: BRAND, fontFamily: FF }}>
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>

                      {/* Order status */}
                      <td style={S.td}>
                        <span style={{ ...S.badge, color: meta.color, background: meta.bg }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Payment */}
                      <td style={S.td}>
                        {lastPmt ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: pmtColor ?? "#94A3B8", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#475569", fontFamily: FFBody, textTransform: "capitalize" as const }}>
                              {lastPmt.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "#CBD5E1", fontFamily: FFBody }}>None</span>
                        )}
                      </td>

                      {/* Shipping status */}
                      <td style={S.td}>
                        <span style={{ fontSize: 12, color: shipMeta.color, fontWeight: 600, fontFamily: FFBody }}>
                          {shipMeta.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={S.td}>
                        <span style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" as const, fontFamily: FFBody }}>
                          {fmtDate(order.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ ...S.td, textAlign: "right" as const }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => setExpandedRow(isExpanded ? null : order.id)}
                            style={{ ...S.ghostSm, padding: "5px 10px", fontSize: 12 }} className="gh">
                            {isExpanded ? "▲" : "▼"}
                          </button>
                          <Link href={`/admin/orders/${order.id}`} style={S.viewBtn} className="btn-h">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded quick actions row */}
                    {isExpanded && (
                      <tr key={`${order.id}-exp`} className="expand-row">
                        <td colSpan={11} style={{ padding: "0 16px 16px 60px", background: "#FAFBFF", borderBottom: `1px solid ${BORDER}` }}>
                          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" as const, paddingTop: 12 }}>

                            {/* Items preview */}
                            <div style={{ flex: "1 1 300px" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8, fontFamily: FF }}>Items</p>
                              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                                {(order.items ?? []).map((item) => (
                                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "#F1F5F9", flexShrink: 0 }}>
                                      {item.product?.main_image
                                        ? <img src={item.product.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        : <span style={{ fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>📦</span>
                                      }
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: 0, fontFamily: FFBody, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 240 }}>
                                        {item.title}
                                      </p>
                                      <p style={{ fontSize: 11, color: "#94A3B8", margin: 0, fontFamily: FFBody }}>
                                        qty {item.quantity} · {formatCurrency(item.price)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Shipping address */}
                            {order.shipping_address && (
                              <div style={{ flex: "1 1 200px" }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8, fontFamily: FF }}>Ship To</p>
                                <p style={{ fontSize: 13, color: "#475569", fontFamily: FFBody, lineHeight: 1.6, margin: 0 }}>
                                  {order.shipping_address.full_name}<br />
                                  {order.shipping_address.address_line1}<br />
                                  {order.shipping_address.city}, {order.shipping_address.country}
                                </p>
                              </div>
                            )}

                            {/* Quick actions */}
                            <div style={{ flex: "0 0 auto" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8, fontFamily: FF }}>Quick Actions</p>
                              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                                {order.status !== "shipped" && order.status !== "completed" && order.status !== "cancelled" && (
                                  <button onClick={() => handleShippingUpdate(order.id, "shipped")}
                                    style={{ ...S.ghostSm, fontSize: 12, justifyContent: "flex-start" }} className="gh">
                                    🚚 Mark Shipped
                                  </button>
                                )}
                                {order.status !== "completed" && order.status !== "cancelled" && (
                                  <button onClick={() => adminOrdersAdvancedApi.forceStatus(order.id, { status: "completed", reason: "Completed by admin" }).then(() => { showToast("Marked completed"); load(); }).catch((e: any) => showToast(e?.message ?? "Failed", "err"))}
                                    style={{ ...S.ghostSm, fontSize: 12, justifyContent: "flex-start" }} className="gh">
                                    ✅ Mark Completed
                                  </button>
                                )}
                                {order.status !== "cancelled" && (
                                  <button onClick={() => handleAdminCancel(order.id)}
                                    style={{ ...S.ghostSm, fontSize: 12, color: "#DC2626", justifyContent: "flex-start" }} className="gh">
                                    ✕ Cancel Order
                                  </button>
                                )}
                                <Link href={`/admin/orders/${order.id}`}
                                  style={{ ...S.primarySm, fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}
                                  className="btn-h">
                                  Open Full Detail →
                                </Link>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Modals ─── */}
      {confirmModal && (
        <div style={S.backdrop} onClick={() => setConfirmModal(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40, textAlign: "center" as const, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, textAlign: "center" as const, fontFamily: FF, marginBottom: 8 }}>
              {confirmModal === "delete-selected" ? `Hard Delete ${selected.size} Orders?` : `Purge ${cancelledCount} Cancelled Orders?`}
            </h3>
            <p style={{ fontSize: 14, color: "#64748B", textAlign: "center" as const, fontFamily: FFBody, marginBottom: 24 }}>
              This is permanent and cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={confirmModal === "delete-selected" ? handleDeleteSelected : handlePurgeCancelled}
                disabled={deleting}
                style={{ ...S.dangerFull, flex: 1 }}
                className="btn-h"
              >
                {deleting ? <Spinner size={14} /> : confirmModal === "delete-selected" ? "Yes, Delete" : `Purge ${cancelledCount} Orders`}
              </button>
              <button onClick={() => setConfirmModal(null)} style={S.ghostSm} className="gh">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1280, margin: "0 auto", padding: "24px 20px 60px", fontFamily: FF },
  toast: { position: "fixed", bottom: 24, right: 24, padding: "12px 22px", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: FF, zIndex: 9999, animation: "fadeUp .3s ease", boxShadow: "0 8px 32px rgba(0,0,0,.25)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 30, fontWeight: 800, color: BRAND, letterSpacing: "-0.04em", margin: 0, fontFamily: FF },
  sub: { fontSize: 13, color: "#94A3B8", margin: "4px 0 0", fontFamily: FFBody },
  statsStrip: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  statPill: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: FFBody, cursor: "pointer", transition: "all .15s", fontWeight: 600 },
  filterBar: { display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" },
  searchBox: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: 10, background: "#fff", flex: "1 1 220px", maxWidth: 380, color: "#94A3B8" },
  searchInput: { border: "none", outline: "none", fontSize: 14, fontFamily: FFBody, width: "100%", color: BRAND, background: "transparent" },
  tabRow: { display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, flex: "2 1 auto", overflowX: "auto" },
  tab: { padding: "8px 14px", border: "none", background: "transparent", fontFamily: FF, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, transition: "color .15s" },
  tabCount: { fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, transition: "all .15s" },
  bulkBar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#EFF6FF", borderRadius: 12, marginBottom: 12, flexWrap: "wrap", border: `1px solid #BFDBFE` },
  selectSm: { padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: "none", background: "#fff", color: BRAND, cursor: "pointer" },
  tableWrap: { border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "#94A3B8", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${BORDER}`, fontFamily: FF },
  tr: { borderBottom: `1px solid #F1F5F9`, transition: "background .12s", animation: "fadeUp .2s ease" },
  td: { padding: "11px 14px", verticalAlign: "middle" },
  badge: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: FFBody },
  thumbWrap: { width: 56, height: 44, borderRadius: 10, overflow: "hidden", background: "#F1F5F9", display: "flex", flexShrink: 0 },
  thumbSingle: { width: "100%", height: "100%", objectFit: "cover", display: "flex", alignItems: "center", justifyContent: "center" },
  thumbMulti: { height: "100%", objectFit: "cover", flexShrink: 0 },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 8, background: BRAND, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 12, fontFamily: FF, transition: "all .15s" },
  primarySm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer", transition: "all .15s" },
  ghostSm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FFBody, cursor: "pointer", transition: "background .12s", whiteSpace: "nowrap" },
  dangerOutline: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 12, fontFamily: FFBody, cursor: "pointer", transition: "all .15s" },
  dangerFull: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", borderRadius: 10, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer", transition: "all .15s" },
  loadCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center", gap: 10 },
  backdrop: { position: "fixed", inset: 0, background: "rgba(10,15,30,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" },
  modal: { background: "#fff", borderRadius: 20, padding: "32px", width: "100%", maxWidth: 440, animation: "fadeUp .2s ease", boxShadow: "0 24px 64px rgba(0,0,0,.2)" },
};