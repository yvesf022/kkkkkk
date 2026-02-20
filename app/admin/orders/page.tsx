"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ordersApi, adminOrdersAdvancedApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Order } from "@/lib/types";

const FF = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0F172A";
const ACCENT = "#2563EB";

const STATUS_META: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  pending:   { color: "#92400E", bg: "#FFFBEB", label: "Pending",   dot: "#F59E0B" },
  paid:      { color: "#065F46", bg: "#F0FDF4", label: "Paid",      dot: "#10B981" },
  shipped:   { color: "#1E40AF", bg: "#EFF6FF", label: "Shipped",   dot: "#3B82F6" },
  completed: { color: "#166534", bg: "#F0FDF4", label: "Completed", dot: "#10B981" },
  cancelled: { color: "#9F1239", bg: "#FFF1F2", label: "Cancelled", dot: "#F43F5E" },
};

const STATUS_FILTERS = ["", "pending", "paid", "shipped", "completed", "cancelled"] as const;

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 10.5l4-3.5L5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ animation: "spin .7s linear infinite" }}>
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
const Search = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulking, setBulking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"selected" | "all-cancelled" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" | "warn" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" | "warn" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getAdmin(filter || undefined);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Search filter
  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      (o as any).user?.email?.toLowerCase().includes(q) ||
      (o as any).user?.full_name?.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(o => o.id)));
  const clearSelection = () => setSelected(new Set());

  /* ─── Bulk Actions ─── */
  async function handleBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    setBulking(true);
    try {
      const ids = [...selected];
      if (bulkAction === "hard-delete") {
        setShowDeleteConfirm("selected");
        setBulking(false);
        return;
      }
      if (bulkAction === "cancel") {
        await Promise.all(ids.map(id => ordersApi.cancel(id, bulkReason || "Bulk cancelled by admin")));
        showToast(`${ids.length} orders cancelled`);
      } else if (bulkAction === "force-complete") {
        await Promise.all(ids.map(id => adminOrdersAdvancedApi.forceStatus(id, { status: "completed", reason: bulkReason || "Bulk completed by admin" })));
        showToast(`${ids.length} orders marked completed`);
      } else if (bulkAction === "force-shipped") {
        await Promise.all(ids.map(id => adminOrdersAdvancedApi.forceStatus(id, { status: "shipped", reason: bulkReason || "Bulk shipped by admin" })));
        showToast(`${ids.length} orders marked shipped`);
      }
      clearSelection();
      setBulkAction(""); setBulkReason("");
      load();
    } catch (e: any) {
      showToast(e.message ?? "Bulk action failed", "err");
    } finally {
      setBulking(false);
    }
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    setDeleting(true);
    try {
      await Promise.all(ids.map(id => adminOrdersAdvancedApi.hardDelete(id)));
      showToast(`${ids.length} order(s) permanently deleted`);
      setOrders(prev => prev.filter(o => !ids.includes(o.id)));
      clearSelection();
      setShowDeleteConfirm(null);
    } catch (e: any) {
      showToast(e.message ?? "Delete failed", "err");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAllCancelled() {
    const cancelledIds = orders.filter(o => o.status === "cancelled").map(o => o.id);
    if (cancelledIds.length === 0) { showToast("No cancelled orders to delete", "warn"); return; }
    setDeleting(true);
    try {
      await Promise.all(cancelledIds.map(id => adminOrdersAdvancedApi.hardDelete(id)));
      showToast(`${cancelledIds.length} cancelled orders deleted`);
      setOrders(prev => prev.filter(o => o.status !== "cancelled"));
      setShowDeleteConfirm(null);
    } catch (e: any) {
      showToast(e.message ?? "Delete failed", "err");
    } finally {
      setDeleting(false);
    }
  }

  const cancelledCount = orders.filter(o => o.status === "cancelled").length;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        .row-hover:hover { background: #F8FAFF !important; }
        .btn-hover:hover { opacity: .85; }
        .ghost-h:hover { background: #F1F5F9 !important; }
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toast.type === "ok" ? BRAND : toast.type === "err" ? "#DC2626" : "#D97706" }}>
          {toast.type === "ok" ? "✓" : toast.type === "warn" ? "⚠" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Orders</h1>
          <p style={S.pageSub}>{orders.length} total orders</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {cancelledCount > 0 && (
            <button onClick={() => setShowDeleteConfirm("all-cancelled")} style={S.dangerBtnSm} className="btn-hover">
              <Trash2 /> Purge {cancelledCount} Cancelled
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div style={S.filterBar}>
        <div style={S.searchBox}>
          <Search />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, email, name…"
            style={S.searchInput}
          />
        </div>
        <div style={S.tabBar}>
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); clearSelection(); }}
              style={{
                ...S.tab,
                color: filter === s ? ACCENT : "#64748B",
                borderBottom: filter === s ? `2px solid ${ACCENT}` : "2px solid transparent",
                fontWeight: filter === s ? 700 : 500,
              }}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "" && orders.filter(o => o.status === s).length > 0 && (
                <span style={{ ...S.tabCount, background: filter === s ? "#EFF6FF" : "#F1F5F9", color: filter === s ? ACCENT : "#94A3B8" }}>
                  {orders.filter(o => o.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={S.bulkBar}>
          <span style={{ fontSize: 13, fontWeight: 600, color: BRAND }}>{selected.size} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} style={S.selectSm}>
            <option value="">Bulk action…</option>
            <option value="cancel">Cancel Orders</option>
            <option value="force-shipped">Mark as Shipped</option>
            <option value="force-complete">Mark as Completed</option>
            <option value="hard-delete">Hard Delete</option>
          </select>
          {bulkAction && bulkAction !== "hard-delete" && (
            <input
              type="text"
              value={bulkReason}
              onChange={e => setBulkReason(e.target.value)}
              placeholder="Reason (optional)"
              style={{ ...S.selectSm, minWidth: 180 }}
            />
          )}
          <button onClick={handleBulkAction} disabled={!bulkAction || bulking} className="btn-hover"
            style={bulkAction === "hard-delete" ? S.dangerBtnSm : S.primaryBtn}>
            {bulking ? <Spinner /> : "Apply"}
          </button>
          <button onClick={clearSelection} className="ghost-h" style={S.ghostBtnSm}>✕ Clear</button>
        </div>
      )}

      {/* Select all */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <button onClick={selected.size === filtered.length ? clearSelection : selectAll} style={S.selectAllBtn}>
            <input type="checkbox" readOnly checked={selected.size === filtered.length && filtered.length > 0} style={{ cursor: "pointer", accentColor: ACCENT }} />
            <span style={{ fontSize: 13, color: "#64748B" }}>Select all {filtered.length}</span>
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={S.loadCenter}><div style={{ color: ACCENT }}><Spinner /></div><p style={{ color: "#94A3B8", fontSize: 14 }}>Loading orders…</p></div>
      ) : filtered.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND }}>No orders</h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>{search ? "No orders match your search." : "No orders found for this filter."}</p>
        </div>
      ) : (
        <div style={S.tableWrapper}>
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={S.th}></th>
                <th style={S.th}>Order</th>
                <th style={S.th}>Customer</th>
                <th style={S.th}>Items</th>
                <th style={S.th}>Total</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Payment</th>
                <th style={S.th}>Date</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const meta = STATUS_META[order.status] ?? STATUS_META.pending;
                const isSelected = selected.has(order.id);
                const lastPmt = order.payments?.[order.payments.length - 1];
                const pmtMeta = lastPmt ? { pending: "#F59E0B", on_hold: "#F97316", paid: "#10B981", rejected: "#EF4444" }[lastPmt.status] ?? "#94A3B8" : null;
                return (
                  <tr
                    key={order.id}
                    className="row-hover"
                    style={{
                      ...S.tr,
                      background: isSelected ? "#F0F7FF" : undefined,
                      borderLeft: isSelected ? `3px solid ${ACCENT}` : "3px solid transparent",
                    }}
                  >
                    <td style={S.td}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(order.id)} style={{ cursor: "pointer", accentColor: ACCENT }} />
                    </td>
                    <td style={S.td}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: BRAND }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: 0 }}>{(order as any).user?.full_name ?? "—"}</p>
                        <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{(order as any).user?.email ?? "Guest"}</p>
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 13, color: "#475569" }}>{order.items?.length ?? 0} items</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: BRAND }}>{formatCurrency(order.total_amount)}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, color: meta.color, background: meta.bg }}>{meta.label}</span>
                    </td>
                    <td style={S.td}>
                      {lastPmt ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: pmtMeta ?? "#94A3B8", flexShrink: 0 }}/>
                          <span style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" as const }}>{lastPmt.status.replace(/_/g, " ")}</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: "#94A3B8" }}>None</span>}
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" as const }}>
                        {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td style={S.td}>
                      <Link href={`/admin/orders/${order.id}`} style={S.viewBtn} className="btn-hover">
                        View <ChevronRight />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete selected modal */}
      {showDeleteConfirm === "selected" && (
        <div style={S.modalBackdrop} onClick={() => setShowDeleteConfirm(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: "center" as const, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, textAlign: "center" as const, marginBottom: 8 }}>Hard Delete {selected.size} Orders?</h3>
            <p style={{ fontSize: 14, color: "#64748B", textAlign: "center" as const, marginBottom: 24 }}>This will permanently delete the selected orders. Cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDeleteSelected} disabled={deleting} className="btn-hover" style={{ ...S.dangerBtnFull, flex: 1 }}>
                {deleting ? "Deleting…" : "Yes, Hard Delete"}
              </button>
              <button onClick={() => setShowDeleteConfirm(null)} className="ghost-h" style={S.ghostBtnSm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete all cancelled modal */}
      {showDeleteConfirm === "all-cancelled" && (
        <div style={S.modalBackdrop} onClick={() => setShowDeleteConfirm(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: "center" as const, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: BRAND, textAlign: "center" as const, marginBottom: 8 }}>Purge All Cancelled Orders?</h3>
            <p style={{ fontSize: 14, color: "#64748B", textAlign: "center" as const, marginBottom: 24 }}>
              This will permanently delete <strong>{cancelledCount}</strong> cancelled orders. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDeleteAllCancelled} disabled={deleting} className="btn-hover" style={{ ...S.dangerBtnFull, flex: 1 }}>
                {deleting ? "Deleting…" : `Purge ${cancelledCount} Orders`}
              </button>
              <button onClick={() => setShowDeleteConfirm(null)} className="ghost-h" style={S.ghostBtnSm}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1200, margin: "0 auto", padding: "20px 20px 48px", fontFamily: FF },
  toast: { position: "fixed" as const, bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: FF, zIndex: 9999, animation: "fadeUp .3s ease", boxShadow: "0 4px 20px rgba(0,0,0,.25)" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" as const, gap: 12 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", margin: 0 },
  pageSub: { fontSize: 13, color: "#94A3B8", margin: "4px 0 0" },
  filterBar: { display: "flex", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap" as const },
  searchBox: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", flex: 1, minWidth: 200 },
  searchInput: { border: "none", outline: "none", fontSize: 14, fontFamily: FF, width: "100%", color: BRAND },
  tabBar: { display: "flex", gap: 0, borderBottom: "1px solid #E2E8F0", flex: "2 1 auto", overflowX: "auto" as const },
  tab: { padding: "8px 14px", border: "none", background: "transparent", fontFamily: FF, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" as const, display: "flex", alignItems: "center", gap: 5 },
  tabCount: { fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 10 },
  bulkBar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#EFF6FF", borderRadius: 10, marginBottom: 12, flexWrap: "wrap" as const },
  selectAllBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: FF, padding: "4px 0" },
  tableWrapper: { border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" as const },
  table: { width: "100%", borderCollapse: "collapse" as const },
  thead: { background: "#F8FAFC" },
  th: { padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#94A3B8", textAlign: "left" as const, textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0" },
  tr: { borderBottom: "1px solid #F1F5F9", transition: "background .15s", animation: "fadeUp .2s ease" },
  td: { padding: "12px 14px", verticalAlign: "middle" as const },
  badge: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: BRAND, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 12, fontFamily: FF },
  loadCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "64px 0" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 0", textAlign: "center" as const, gap: 10 },
  primaryBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  dangerBtnSm: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  dangerBtnFull: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 16px", borderRadius: 10, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  ghostBtnSm: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  selectSm: { padding: "7px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontFamily: FF, outline: "none", background: "#fff" },
  modalBackdrop: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#fff", borderRadius: 16, padding: "28px", width: "100%", maxWidth: 440, animation: "fadeUp .2s ease" },
};