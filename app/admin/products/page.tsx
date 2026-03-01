// FILE: app/admin/products/page.tsx  ──  Enterprise Product List
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { adminProductsApi, productsApi, adminApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import type { AdminDashboardStats } from "@/lib/types";

/* ─────────── constants ─────────── */
type SortField = "title" | "price" | "stock" | "sales" | "created_at";
type SortDir   = "asc" | "desc";
type ViewMode  = "table" | "gallery";

const P = {
  green:     "#0f3f2f",
  greenLight:"#1b5e4a",
  greenDark: "#0a2a1f",
  accent:    "#c8a75a",
  accentL:   "#d4b976",
  bg:        "#f5f5f4",
  card:      "#ffffff",
  border:    "#e7e5e4",
  muted:     "#a8a29e",
  text:      "#1c1917",
  sub:       "#57534e",
} as const;

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  active:       { label: "Active",       bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  draft:        { label: "Draft",        bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  archived:     { label: "Archived",     bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  inactive:     { label: "Inactive",     bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
  discontinued: { label: "Discontinued", bg: "#f3e8ff", color: "#7e22ce", dot: "#a855f7" },
};

/* ─────────── helpers ─────────── */
function getImg(p: any): string | null {
  if (p.main_image && typeof p.main_image === "string") return p.main_image;
  if (p.image_url  && typeof p.image_url  === "string") return p.image_url;
  if (p.primary_image && typeof p.primary_image === "string") return p.primary_image;
  if (p.img && typeof p.img === "string") return p.img;
  if (Array.isArray(p.images) && p.images.length > 0) {
    const pri = p.images.find((i: any) => i?.is_primary);
    if (pri?.image_url) return pri.image_url;
    const f = p.images[0];
    if (typeof f === "string") return f;
    if (f?.image_url) return f.image_url;
    if (f?.url) return f.url;
  }
  return null;
}

function imgCount(p: any): number {
  if (Array.isArray(p.images)) return p.images.length;
  return getImg(p) ? 1 : 0;
}

/* ═══════════════════════════════ COMPONENT ═══════════════════════════════ */
export default function AdminProductsPage() {
  const router = useRouter();

  /* lists */
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  /* filters */
  const [search, setSearch]           = useState("");
  const [status, setStatus]           = useState("");
  const [category, setCategory]       = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "low" | "out">("");
  const [page, setPage]               = useState(1);
  const perPage                       = 24;
  const [sortField, setSortField]     = useState<SortField>("created_at");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");

  /* ui states */
  const [viewMode, setViewMode]       = useState<ViewMode>("table");
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [allPagesSelected, setAllPagesSelected] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  /* stats */
  const [stats, setStats]             = useState<AdminDashboardStats | null>(null);

  /* hover preview */
  const [hoverImg, setHoverImg]       = useState<{ src: string; x: number; y: number } | null>(null);

  /* modals */
  const [discountModal, setDiscountModal]     = useState(false);
  const [discountValue, setDiscountValue]     = useState("");
  const [emptyStoreModal, setEmptyStoreModal] = useState(false);
  const [emptyConfirmText, setEmptyConfirmText] = useState("");
  const [emptyLoading, setEmptyLoading]       = useState(false);
  const [filterDrawer, setFilterDrawer]       = useState(false);
  const [minPrice, setMinPrice]               = useState("");
  const [maxPrice, setMaxPrice]               = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3800);
  };

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page, per_page: perPage, sort_by: sortField, sort_dir: sortDir,
      };
      if (search)                    params.search_query = search;
      if (status)                    params.status       = status;
      if (category)                  params.category     = category;
      if (stockFilter === "low")     params.low_stock    = true;
      if (stockFilter === "out")     params.in_stock     = false;
      if (minPrice)                  params.min_price    = Number(minPrice);
      if (maxPrice)                  params.max_price    = Number(maxPrice);
      const res = await adminProductsApi.list(params);
      setProducts(res.results ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, status, category, stockFilter, sortField, sortDir, minPrice, maxPrice]);

  useEffect(() => { load(); }, [load]);

  /* load stats */
  useEffect(() => {
    adminApi.getDashboard().then((d: any) => setStats(d)).catch(() => {});
  }, []);

  /* ── selection ── */
  const allSelected = products.length > 0 && products.every(p => selected.has(p.id));
  const someSelected = products.some(p => selected.has(p.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        products.forEach(p => next.delete(p.id));
        return next;
      });
      setAllPagesSelected(false);
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        products.forEach(p => next.add(p.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setAllPagesSelected(false);
  }

  function clearSelection() {
    setSelected(new Set());
    setAllPagesSelected(false);
  }

  /* ── sort ── */
  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  }

  /* ── bulk ── */
  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    const ids = allPagesSelected ? [] : [...selected]; // empty = all
    setBulkLoading(true);
    try {
      switch (action) {
        case "activate":    await adminProductsApi.bulkActivate(ids);    break;
        case "deactivate":  await adminProductsApi.bulkDeactivate(ids);  break;
        case "archive":     await adminProductsApi.bulkArchive(ids);     break;
        case "hardDelete":
          if (!confirm(`Permanently hard-delete ${allPagesSelected ? total : ids.length} product(s)? This CANNOT be undone.`)) { setBulkLoading(false); return; }
          await adminProductsApi.bulkHardDelete(ids);
          break;
        case "softDelete":
          if (!confirm(`Soft-delete ${allPagesSelected ? total : ids.length} product(s)?`)) { setBulkLoading(false); return; }
          await adminProductsApi.bulkDelete(ids);
          break;
      }
      clearSelection();
      showToast(`Bulk ${action} applied to ${allPagesSelected ? total : ids.length} product(s)`);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Bulk action failed", false);
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkDiscount() {
    const val = Number(discountValue);
    if (!val || val < 1 || val > 99) { showToast("Enter 1–99%", false); return; }
    setBulkLoading(true);
    setDiscountModal(false);
    try {
      await adminProductsApi.bulkDiscount([...selected], val);
      showToast(`${val}% applied to ${selected.size} product(s)`);
      clearSelection();
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Discount failed", false);
    } finally {
      setBulkLoading(false);
    }
  }

  async function quickStatus(id: string, action: "publish" | "archive" | "draft") {
    try {
      await productsApi.lifecycle(id, action);
      showToast(`Product ${action}d`);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", false);
    }
  }

  async function handleExport() {
    try {
      await productsApi.exportCsv({ status: status || undefined });
      showToast("CSV export started");
    } catch (e: any) {
      showToast(e?.message ?? "Export failed", false);
    }
  }

  async function handleEmptyStore() {
    if (emptyConfirmText !== "DELETE ALL PRODUCTS") return;
    setEmptyLoading(true);
    try {
      await adminProductsApi.emptyStore(true);
      setEmptyStoreModal(false);
      setEmptyConfirmText("");
      showToast("Store emptied — all products deleted");
      setStats(null);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Empty store failed", false);
    } finally {
      setEmptyLoading(false);
    }
  }

  const totalPages = Math.ceil(total / perPage);
  const activeFilters = [search, status, category, stockFilter, minPrice, maxPrice].filter(Boolean).length;

  /* ─────────── RENDER ─────────── */
  return (
    <div style={{ fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif", minHeight: "100vh", background: P.bg, color: P.text }}>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 10,
          padding: "13px 20px", borderRadius: 12, fontSize: 14, fontWeight: 500,
          background: toast.ok ? P.green : "#dc2626", color: "#fff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)", animation: "slideIn 0.2s ease",
          borderLeft: `4px solid ${toast.ok ? P.accent : "#fca5a5"}`,
        }}>
          <span style={{ fontSize: 16 }}>{toast.ok ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      {/* ── HOVER IMAGE PREVIEW ── */}
      {hoverImg && (
        <div style={{
          position: "fixed", zIndex: 8888, pointerEvents: "none",
          left: Math.min(hoverImg.x + 16, window.innerWidth - 280),
          top: Math.min(hoverImg.y - 20, window.innerHeight - 300),
          width: 260, height: 260, borderRadius: 16, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: `2px solid ${P.border}`,
          background: "#fff",
        }}>
          <img src={hoverImg.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 28px" }}>

        {/* ══ HEADER ══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: P.muted, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>Karabo Admin</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: P.text, letterSpacing: "-0.8px", margin: 0, lineHeight: 1.1 }}>
              Product Catalogue
            </h1>
            <p style={{ color: P.muted, fontSize: 14, margin: "4px 0 0" }}>
              {loading ? "Loading…" : `${total.toLocaleString()} product${total !== 1 ? "s" : ""} in store`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* View toggle */}
            <div style={{ display: "flex", background: "#fff", border: `1px solid ${P.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
              {(["table", "gallery"] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)} style={{
                  padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: viewMode === v ? P.green : "transparent",
                  color: viewMode === v ? "#fff" : P.sub,
                }}>
                  {v === "table" ? "☰ Table" : "⊞ Gallery"}
                </button>
              ))}
            </div>
            <button onClick={handleExport} style={outlineBtn}>↓ Export CSV</button>
            <button onClick={() => router.push("/admin/products/bulk-upload")} style={outlineBtn}>↑ Bulk Upload</button>
            <button onClick={() => router.push("/admin/products/new")} style={{ ...primaryBtn, background: P.green }}>+ New Product</button>
            <button onClick={() => setEmptyStoreModal(true)} style={{ ...outlineBtn, color: "#dc2626", borderColor: "#fca5a5", fontWeight: 700 }}>
              ☢ Empty Store
            </button>
          </div>
        </div>

        {/* ══ KPI STATS STRIP ══ */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Products", value: stats.total_products, icon: "📦", click: () => { setStatus(""); setPage(1); }, active: !status },
              { label: "Active",         value: stats.active_products, icon: "✅", click: () => { setStatus("active"); setPage(1); }, active: status === "active" },
              { label: "Low Stock",      value: stats.low_stock_products, icon: "⚠️", click: () => { setStockFilter("low"); setPage(1); }, active: stockFilter === "low" },
              { label: "Out of Stock",   value: (stats as any).out_of_stock ?? 0, icon: "🚫", click: () => { setStockFilter("out"); setPage(1); }, active: stockFilter === "out" },
            ].map((s) => (
              <button key={s.label} onClick={s.click} style={{
                background: s.active ? P.green : "#fff",
                border: `1.5px solid ${s.active ? P.green : P.border}`,
                borderRadius: 14, padding: "18px 20px",
                textAlign: "left", cursor: "pointer",
                boxShadow: s.active ? `0 4px 16px ${P.green}33` : "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
              }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.active ? "#fff" : P.text, letterSpacing: "-1px" }}>
                  {s.value?.toLocaleString() ?? "—"}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: s.active ? "rgba(255,255,255,0.7)" : P.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {s.label}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ══ FILTER BAR ══ */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${P.border}`, padding: "14px 18px", marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: P.muted, fontSize: 16 }}>⌕</span>
            <input style={{ ...filterInput, paddingLeft: 36 }}
              placeholder="Search products, SKU, brand…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>

          <select style={filterInput} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <input style={{ ...filterInput, minWidth: 160 }} placeholder="Filter by category…"
            value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} />

          <select style={filterInput} value={stockFilter} onChange={e => { setStockFilter(e.target.value as any); setPage(1); }}>
            <option value="">All Stock</option>
            <option value="low">Low Stock (&lt;10)</option>
            <option value="out">Out of Stock</option>
          </select>

          <button onClick={() => setFilterDrawer(true)} style={{
            ...outlineBtn, position: "relative",
            background: filterDrawer || activeFilters > 0 ? `${P.green}10` : "#fff",
            borderColor: activeFilters > 0 ? P.green : P.border,
            color: activeFilters > 0 ? P.green : P.sub,
          }}>
            ⊞ Advanced
            {activeFilters > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: P.green, color: "#fff", width: 18, height: 18, borderRadius: "50%", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {activeFilters}
              </span>
            )}
          </button>

          {activeFilters > 0 && (
            <button style={{ ...outlineBtn, color: P.muted }} onClick={() => { setSearch(""); setStatus(""); setCategory(""); setStockFilter(""); setMinPrice(""); setMaxPrice(""); setPage(1); }}>
              ✕ Clear all
            </button>
          )}
        </div>

        {/* ══ FLOATING BULK BAR ══ */}
        {selected.size > 0 && (
          <div style={{
            position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
            zIndex: 5000, background: P.greenDark, color: "#fff",
            borderRadius: 16, padding: "14px 24px",
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            border: `1px solid ${P.greenLight}`,
            animation: "floatUp 0.25s cubic-bezier(.22,.9,.34,1)",
            minWidth: "min(720px, 90vw)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: P.accent, color: P.greenDark, borderRadius: 8, padding: "3px 10px", fontSize: 14, fontWeight: 800 }}>
                {allPagesSelected ? total : selected.size}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>selected</span>
            </div>

            {/* Select all across pages banner */}
            {allSelected && !allPagesSelected && total > perPage && (
              <button onClick={() => setAllPagesSelected(true)} style={{ background: "none", border: `1px solid ${P.accent}66`, color: P.accentL, fontSize: 13, borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}>
                Select all {total.toLocaleString()} products →
              </button>
            )}
            {allPagesSelected && (
              <span style={{ fontSize: 13, color: P.accentL }}>All {total.toLocaleString()} products selected</span>
            )}

            <div style={{ width: 1, height: 24, background: `${P.greenLight}88` }} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "✅ Activate",   action: "activate",   color: "#4ade80" },
                { label: "⊟ Deactivate", action: "deactivate", color: "#94a3b8" },
                { label: "📦 Archive",    action: "archive",    color: "#fbbf24" },
              ].map(b => (
                <button key={b.action} disabled={bulkLoading} onClick={() => bulkAction(b.action)} style={{
                  padding: "7px 14px", borderRadius: 8, border: `1px solid ${b.color}44`,
                  background: `${b.color}18`, color: b.color, cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}>
                  {b.label}
                </button>
              ))}
              <button disabled={bulkLoading} onClick={() => setDiscountModal(true)} style={{
                padding: "7px 14px", borderRadius: 8, border: "1px solid #60a5fa44",
                background: "#60a5fa18", color: "#60a5fa", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}>
                🏷 Discount
              </button>
              <button disabled={bulkLoading} onClick={() => bulkAction("softDelete")} style={{
                padding: "7px 14px", borderRadius: 8, border: "1px solid #f9731644",
                background: "#f9731618", color: "#f97316", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}>
                🗑 Soft Delete
              </button>
              <button disabled={bulkLoading} onClick={() => bulkAction("hardDelete")} style={{
                padding: "7px 14px", borderRadius: 8, border: "1px solid #ef444444",
                background: "#ef444418", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 700,
              }}>
                ☠ Hard Delete
              </button>
            </div>

            <button onClick={clearSelection} style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 4px" }}>×</button>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", color: "#991b1b", fontSize: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠ {error}</span>
            <button onClick={load} style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", textDecoration: "underline", fontSize: 14 }}>Retry</button>
          </div>
        )}

        {/* ══ GALLERY VIEW ══ */}
        {viewMode === "gallery" && (
          <div>
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: `1px solid ${P.border}` }}>
                    <div style={{ height: 200, background: "#f5f5f4", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ padding: 14 }}>
                      <div style={{ height: 14, borderRadius: 4, background: "#f5f5f4", marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                      <div style={{ height: 12, borderRadius: 4, background: "#f5f5f4", width: "60%", animation: "pulse 1.5s ease-in-out infinite" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                {products.map(p => {
                  const cfg = STATUS_CFG[p.status ?? "draft"] ?? STATUS_CFG.draft;
                  const img = getImg(p);
                  const imgC = imgCount(p);
                  const isSel = selected.has(p.id);
                  return (
                    <div key={p.id} style={{
                      background: "#fff", borderRadius: 14, overflow: "hidden",
                      border: `2px solid ${isSel ? P.green : P.border}`,
                      boxShadow: isSel ? `0 0 0 3px ${P.green}33` : "0 2px 8px rgba(0,0,0,0.05)",
                      cursor: "pointer", transition: "all 0.2s ease", position: "relative",
                    }}
                      onClick={() => router.push(`/admin/products/${p.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "")}
                    >
                      {/* Checkbox overlay */}
                      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2 }}
                        onClick={e => { e.stopPropagation(); toggleOne(p.id); }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          background: isSel ? P.green : "rgba(255,255,255,0.9)",
                          border: `2px solid ${isSel ? P.green : P.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}>
                          {isSel && <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>✓</span>}
                        </div>
                      </div>

                      {/* Image count badge */}
                      {imgC > 0 && (
                        <div style={{
                          position: "absolute", top: 10, right: 10, zIndex: 2,
                          background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 6,
                          fontSize: 11, fontWeight: 600, padding: "2px 7px",
                          backdropFilter: "blur(4px)",
                        }}>
                          📷 {imgC}
                        </div>
                      )}

                      {/* Product image */}
                      <div style={{ height: 200, background: P.bg, overflow: "hidden", position: "relative" }}>
                        {img ? (
                          <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "")} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: P.muted, fontSize: 36 }}>□</div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: "12px 14px 14px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, marginBottom: 6 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />
                          {cfg.label}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 14, color: P.text, lineHeight: 1.3, marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {p.title || "Untitled"}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: P.green }}>R {Number(p.price ?? 0).toLocaleString()}</span>
                          <span style={{ fontSize: 12, color: p.stock === 0 ? "#dc2626" : p.stock < 10 ? "#d97706" : P.muted, fontWeight: 600 }}>
                            {p.stock === 0 ? "Out" : `${p.stock} left`}
                          </span>
                        </div>
                        {/* Quick actions */}
                        <div style={{ display: "flex", gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => router.push(`/admin/products/${p.id}`)} style={{ flex: 1, ...smBtn }}>✎ Edit</button>
                          {p.status !== "active"
                            ? <button onClick={() => quickStatus(p.id, "publish")} style={{ flex: 1, ...smBtn, color: "#15803d", borderColor: "#bbf7d0" }}>▶ Publish</button>
                            : <button onClick={() => quickStatus(p.id, "archive")} style={{ flex: 1, ...smBtn, color: "#92400e", borderColor: "#fde68a" }}>⊟ Archive</button>
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ TABLE VIEW ══ */}
        {viewMode === "table" && (
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${P.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.border}`, background: "#fafaf9" }}>
                    <th style={{ ...th, width: 44 }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer", width: 16, height: 16, accentColor: P.green }} />
                    </th>
                    <th style={{ ...th, width: 80 }}>Image</th>
                    <SortTh label="Product"    field="title"      cur={sortField} dir={sortDir} onSort={handleSort} />
                    <th style={th}>Status</th>
                    <SortTh label="Price"      field="price"      cur={sortField} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Stock"      field="stock"      cur={sortField} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Sales"      field="sales"      cur={sortField} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Created"    field="created_at" cur={sortField} dir={sortDir} onSort={handleSort} />
                    <th style={{ ...th, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${P.border}` }}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} style={{ padding: "14px 16px" }}>
                            <div style={{ height: 14, borderRadius: 4, background: P.bg, animation: "pulse 1.5s ease-in-out infinite" }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : products.length === 0 ? (
                    <tr><td colSpan={9}><div style={{ padding: "60px 20px", textAlign: "center", color: P.muted }}>
                      <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: P.sub, marginBottom: 6 }}>No products found</div>
                      <div style={{ fontSize: 13 }}>Try adjusting your filters or add new products.</div>
                    </div></td></tr>
                  ) : (
                    products.map(p => {
                      const cfg = STATUS_CFG[p.status ?? "draft"] ?? STATUS_CFG.draft;
                      const img = getImg(p);
                      const imgC = imgCount(p);
                      const isSel = selected.has(p.id);
                      return (
                        <tr key={p.id}
                          style={{ borderBottom: `1px solid ${P.border}`, transition: "background 0.12s", cursor: "pointer", background: isSel ? `${P.green}08` : "" }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#f8f7f6"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isSel ? `${P.green}08` : ""; }}
                          onClick={() => router.push(`/admin/products/${p.id}`)}>

                          {/* Checkbox */}
                          <td style={td} onClick={e => { e.stopPropagation(); toggleOne(p.id); }}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleOne(p.id)} style={{ cursor: "pointer", width: 16, height: 16, accentColor: P.green }} />
                          </td>

                          {/* Image with hover preview */}
                          <td style={td}>
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <div style={{
                                width: 64, height: 72, borderRadius: 10, overflow: "hidden",
                                background: P.bg, border: `1px solid ${P.border}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                                onMouseEnter={e => img && setHoverImg({ src: img, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoverImg(null)}
                                onMouseMove={e => img && setHoverImg({ src: img, x: e.clientX, y: e.clientY })}
                              >
                                {img
                                  ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  : <span style={{ color: P.muted, fontSize: 22 }}>□</span>
                                }
                              </div>
                              {imgC > 1 && (
                                <span style={{
                                  position: "absolute", bottom: -4, right: -4,
                                  background: P.green, color: "#fff", borderRadius: 5,
                                  fontSize: 9, fontWeight: 700, padding: "1px 5px",
                                  border: "1.5px solid #fff",
                                }}>+{imgC - 1}</span>
                              )}
                            </div>
                          </td>

                          {/* Product title */}
                          <td style={{ ...td, maxWidth: 300 }}>
                            <div style={{ fontWeight: 700, color: P.text, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 280 }}>
                              {p.title || "Untitled Product"}
                            </div>
                            <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>
                              {(p as any).sku ? `SKU: ${(p as any).sku}` : `ID: ${p.id.slice(0, 8)}…`}
                              {p.category && <span style={{ marginLeft: 6, background: P.bg, borderRadius: 4, padding: "1px 6px" }}>{p.category}</span>}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={td}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                              {cfg.label}
                            </span>
                          </td>

                          {/* Price */}
                          <td style={td}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: P.green }}>R {Number(p.price ?? 0).toLocaleString()}</div>
                            {(p as any).compare_price && (p as any).compare_price > p.price && (
                              <div style={{ fontSize: 12, color: P.muted, textDecoration: "line-through" }}>R {Number((p as any).compare_price).toLocaleString()}</div>
                            )}
                          </td>

                          {/* Stock */}
                          <td style={td}>
                            {p.stock === 0
                              ? <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "#fef2f2", color: "#dc2626" }}>Out of stock</span>
                              : p.stock < 10
                                ? <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "#fff7ed", color: "#c2410c" }}>{p.stock} left ⚠</span>
                                : <span style={{ fontSize: 14, fontWeight: 600, color: P.sub }}>{p.stock}</span>
                            }
                          </td>

                          {/* Sales */}
                          <td style={{ ...td, fontWeight: 600, color: P.sub, fontSize: 14 }}>
                            {((p as any).sales ?? 0).toLocaleString()}
                          </td>

                          {/* Created */}
                          <td style={{ ...td, fontSize: 12, color: P.muted }}>
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                          </td>

                          {/* Actions */}
                          <td style={{ ...td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                              <ActBtn onClick={() => router.push(`/admin/products/${p.id}`)} title="Edit">✎</ActBtn>
                              {p.status !== "active"
                                ? <ActBtn onClick={() => quickStatus(p.id, "publish")} color="#15803d" title="Publish">▶</ActBtn>
                                : <ActBtn onClick={() => quickStatus(p.id, "archive")} color="#92400e" title="Archive">⊟</ActBtn>
                              }
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: `1px solid ${P.border}`, flexWrap: "wrap", gap: 12, background: "#fafaf9" }}>
                <span style={{ fontSize: 13, color: P.muted }}>
                  Showing {((page - 1) * perPage + 1).toLocaleString()}–{Math.min(page * perPage, total).toLocaleString()} of {total.toLocaleString()}
                </span>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <PgBtn disabled={page <= 1} onClick={() => setPage(1)}>«</PgBtn>
                  <PgBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</PgBtn>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const n = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                    return <PgBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PgBtn>;
                  })}
                  <PgBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</PgBtn>
                  <PgBtn disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</PgBtn>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gallery pagination */}
        {viewMode === "gallery" && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 28 }}>
            <PgBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</PgBtn>
            <span style={{ padding: "7px 16px", fontSize: 13, color: P.sub }}>Page {page} of {totalPages}</span>
            <PgBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</PgBtn>
          </div>
        )}
      </div>

      {/* ══ FILTER DRAWER ══ */}
      {filterDrawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 6000, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} onClick={() => setFilterDrawer(false)} />
          <div style={{ width: 360, background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", padding: 28, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: P.text }}>Advanced Filters</h3>
              <button onClick={() => setFilterDrawer(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: P.muted }}>×</button>
            </div>
            <FilterField label="Price Range">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input style={filterInput} type="number" placeholder="Min (R)" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <input style={filterInput} type="number" placeholder="Max (R)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              </div>
            </FilterField>
            <FilterField label="Status">
              <select style={{ ...filterInput, width: "100%" }} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FilterField>
            <FilterField label="Stock Level">
              <select style={{ ...filterInput, width: "100%" }} value={stockFilter} onChange={e => setStockFilter(e.target.value as any)}>
                <option value="">Any</option>
                <option value="low">Low Stock (&lt;10)</option>
                <option value="out">Out of Stock</option>
              </select>
            </FilterField>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => { setFilterDrawer(false); setPage(1); load(); }} style={{ ...primaryBtn, flex: 1, background: P.green }}>Apply Filters</button>
              <button onClick={() => { setMinPrice(""); setMaxPrice(""); setStatus(""); setStockFilter(""); setPage(1); }} style={{ ...outlineBtn, flex: 1 }}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DISCOUNT MODAL ══ */}
      {discountModal && (
        <ModalShell title="Apply Bulk Discount" onClose={() => setDiscountModal(false)}>
          <p style={{ fontSize: 14, color: P.sub, marginBottom: 20 }}>
            Apply a percentage discount to {selected.size} product(s). This lowers the <code>price</code> field.
          </p>
          <FilterField label="Discount Percentage">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" min={1} max={99} placeholder="e.g. 20"
                value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                style={{ ...filterInput, flex: 1 }} autoFocus />
              <span style={{ fontWeight: 800, color: P.sub, fontSize: 18 }}>%</span>
            </div>
          </FilterField>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={bulkDiscount} style={{ ...primaryBtn, flex: 1, background: P.green }}>Apply Discount</button>
            <button onClick={() => setDiscountModal(false)} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
          </div>
        </ModalShell>
      )}

      {/* ══ EMPTY STORE MODAL ══ */}
      {emptyStoreModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 460, width: "90%", boxShadow: "0 24px 80px rgba(0,0,0,0.25)", border: "1px solid #fecaca" }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>☢</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#991b1b", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Empty the Entire Store</h2>
              <p style={{ fontSize: 14, color: P.sub, lineHeight: 1.6, margin: 0 }}>
                This will <strong>permanently delete ALL products</strong> from the store. This action cannot be undone. Orders and users will not be affected.
              </p>
            </div>

            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#991b1b" }}>
              ⚠ {total.toLocaleString()} products will be permanently deleted.
            </div>

            <FilterField label='Type "DELETE ALL PRODUCTS" to confirm'>
              <input
                style={{ ...filterInput, width: "100%", borderColor: emptyConfirmText === "DELETE ALL PRODUCTS" ? "#dc2626" : P.border, boxSizing: "border-box" }}
                placeholder="DELETE ALL PRODUCTS"
                value={emptyConfirmText}
                onChange={e => setEmptyConfirmText(e.target.value)}
                autoFocus
              />
            </FilterField>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                disabled={emptyConfirmText !== "DELETE ALL PRODUCTS" || emptyLoading}
                onClick={handleEmptyStore}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14,
                  background: emptyConfirmText === "DELETE ALL PRODUCTS" ? "#dc2626" : "#f1f5f9",
                  color: emptyConfirmText === "DELETE ALL PRODUCTS" ? "#fff" : P.muted,
                  cursor: emptyConfirmText === "DELETE ALL PRODUCTS" ? "pointer" : "not-allowed",
                }}>
                {emptyLoading ? "Deleting…" : "☢ Empty Store"}
              </button>
              <button onClick={() => { setEmptyStoreModal(false); setEmptyConfirmText(""); }} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse    { 0%,100%{opacity:1}  50%{opacity:0.4} }
        @keyframes slideIn  { from{transform:translateY(-12px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes floatUp  { from{transform:translateX(-50%) translateY(16px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
        select:focus, input:focus { outline: 2px solid ${P.green}; outline-offset: 0; border-color: transparent; }
        input[type=checkbox] { width:16px; height:16px; }
      `}</style>
    </div>
  );
}

/* ─────────── sub-components ─────────── */

function SortTh({ label, field, cur, dir, onSort }: { label: string; field: SortField; cur: SortField; dir: SortDir; onSort: (f: SortField) => void }) {
  const active = field === cur;
  return (
    <th style={{ ...th, cursor: "pointer", userSelect: "none", color: active ? "#1c1917" : "#57534e", whiteSpace: "nowrap" }} onClick={() => onSort(field)}>
      {label} <span style={{ opacity: active ? 1 : 0.4 }}>{active ? (dir === "asc" ? "↑" : "↓") : "↕"}</span>
    </th>
  );
}

function ActBtn({ onClick, title, color = "#57534e", children }: any) {
  return (
    <button title={title} onClick={onClick}
      style={{ padding: "5px 9px", borderRadius: 7, border: "1px solid #e7e5e4", background: "#f5f5f4", cursor: "pointer", fontSize: 13, color, lineHeight: 1, transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.background = "#e7e5e4"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#f5f5f4"; }}>
      {children}
    </button>
  );
}

function PgBtn({ children, onClick, disabled, active }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "6px 11px", minWidth: 34, borderRadius: 7,
      border: `1px solid ${active ? "#0f3f2f" : "#e7e5e4"}`,
      background: active ? "#0f3f2f" : "#fff",
      color: active ? "#fff" : disabled ? "#d6d3d1" : "#57534e",
      cursor: disabled ? "default" : "pointer", fontSize: 13, fontWeight: active ? 700 : 400,
    }}>
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 14, border: "1px solid #e7e5e4" }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>📦</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>No products found</div>
      <div style={{ fontSize: 14, color: "#a8a29e" }}>Try adjusting your filters or create a new product.</div>
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 8000 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 30, maxWidth: 420, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#a8a29e" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#57534e", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

/* ─────────── style constants ─────────── */
const th: React.CSSProperties        = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#57534e", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" };
const td: React.CSSProperties        = { padding: "12px 16px", verticalAlign: "middle" };
const filterInput: React.CSSProperties = { padding: "9px 12px", borderRadius: 9, border: "1px solid #e7e5e4", fontSize: 14, background: "#fff", color: "#1c1917", minWidth: 120 };
const primaryBtn: React.CSSProperties  = { padding: "9px 20px", borderRadius: 9, border: "none", background: "#0f3f2f", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" };
const outlineBtn: React.CSSProperties  = { padding: "9px 16px", borderRadius: 9, border: "1px solid #e7e5e4", background: "#fff", color: "#44403c", cursor: "pointer", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" };
const smBtn: React.CSSProperties       = { padding: "5px 10px", borderRadius: 7, border: "1px solid #e7e5e4", background: "#f5f5f4", cursor: "pointer", fontSize: 12, color: "#44403c", fontWeight: 500 };