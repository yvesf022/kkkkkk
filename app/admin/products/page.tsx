// FILE: app/admin/products/page.tsx  (Admin Product LIST)
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminProductsApi, productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

type SortField = "title" | "price" | "stock" | "sales" | "created_at";
type SortDir = "asc" | "desc";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  active:       { label: "Active",       bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  draft:        { label: "Draft",        bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  archived:     { label: "Archived",     bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  inactive:     { label: "Inactive",     bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
  discontinued: { label: "Discontinued", bg: "#f3e8ff", color: "#7e22ce", dot: "#a855f7" },
};

export default function AdminProductsPage() {
  const router = useRouter();

  const [products, setProducts]       = useState<ProductListItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [search, setSearch]           = useState("");
  const [status, setStatus]           = useState("");
  const [category, setCategory]       = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "low" | "out">(""); 
  const [page, setPage]               = useState(1);
  const [perPage]                     = useState(20);

  const [sortField, setSortField]     = useState<SortField>("created_at");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");

  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  const [discountModal, setDiscountModal] = useState(false);
  const [discountValue, setDiscountValue] = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page,
        per_page: perPage,
        sort_by: sortField,
        sort_dir: sortDir,
      };
      if (search)      params.search_query = search;
      if (status)      params.status = status;
      if (category)    params.category = category;
      if (stockFilter === "low") params.low_stock = true;
      if (stockFilter === "out") params.in_stock = false;

      // FIX: use adminProductsApi.list() which hits /api/products/admin/list
      // This returns admin-visible products including drafts/archived.
      // productsApi.list() only returns public/active products.
      const res = await adminProductsApi.list(params);
      setProducts(res.results ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, status, category, stockFilter, sortField, sortDir]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    const ids = [...selected];
    setBulkLoading(true);
    try {
      switch (action) {
        case "activate":   await adminProductsApi.bulkActivate(ids);   break;
        case "deactivate": await adminProductsApi.bulkDeactivate(ids); break;
        case "archive":    await adminProductsApi.bulkArchive(ids);    break;
        case "delete":
          if (!confirm(`Permanently delete ${ids.length} product(s)?`)) { setBulkLoading(false); return; }
          await adminProductsApi.bulkDelete(ids);
          break;
      }
      setSelected(new Set());
      showToast(`Bulk ${action} applied to ${ids.length} product(s)`);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Bulk action failed", false);
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkDiscount() {
    const val = Number(discountValue);
    if (!val || val < 1 || val > 99) { showToast("Enter a valid discount (1–99%)", false); return; }
    setBulkLoading(true);
    setDiscountModal(false);
    try {
      await adminProductsApi.bulkDiscount([...selected], val);
      showToast(`${val}% discount applied to ${selected.size} product(s)`);
      setSelected(new Set());
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

  const totalPages = Math.ceil(total / perPage);

  // FIX: robust image resolution — handles all possible field names from the backend
  function getProductImage(p: ProductListItem): string | null {
    return (p as any).main_image
      ?? (p as any).image_url
      ?? (p as any).primary_image
      ?? (Array.isArray((p as any).images) && (p as any).images.length > 0
          ? (p as any).images[0]?.image_url ?? (p as any).images[0]
          : null)
      ?? null;
  }

  const stockLabel = (p: ProductListItem) => {
    const stock = p.stock ?? 0;
    if (stock === 0)  return <span style={stockBadge("#fef2f2","#dc2626")}>Out of stock</span>;
    if (stock < 10)   return <span style={stockBadge("#fff7ed","#c2410c")}>{stock} left</span>;
    return <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{stock}</span>;
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: toast.ok ? "#0f172a" : "#dc2626", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", animation: "slideIn 0.2s ease" }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px" }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>Products</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {loading ? "Loading…" : `${total.toLocaleString()} product${total !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => router.push("/admin/products/bulk-upload")} style={outlineBtn}>↑ Bulk Upload</button>
            <button onClick={() => router.push("/admin/products/new")} style={primaryBtn}>+ New Product</button>
          </div>
        </div>

        {/* FILTERS */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 15 }}>⌕</span>
            <input style={{ ...filterInput, paddingLeft: 34 }} placeholder="Search products…" value={search} onChange={(e) => handleSearch(e.target.value)} />
          </div>
          <select style={filterInput} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <input style={filterInput} placeholder="Filter by category…" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} />
          <select style={filterInput} value={stockFilter} onChange={(e) => { setStockFilter(e.target.value as any); setPage(1); }}>
            <option value="">All Stock</option>
            <option value="low">Low Stock (&lt;10)</option>
            <option value="out">Out of Stock</option>
          </select>
          {(search || status || category || stockFilter) && (
            <button style={{ ...outlineBtn, color: "#64748b", borderColor: "#e2e8f0" }} onClick={() => { setSearch(""); setStatus(""); setCategory(""); setStockFilter(""); setPage(1); }}>Clear</button>
          )}
        </div>

        {/* BULK BAR */}
        {selected.size > 0 && (
          <div style={{ background: "#0f172a", color: "#fff", borderRadius: 10, padding: "12px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{selected.size} selected</span>
            <div style={{ height: 20, width: 1, background: "#334155" }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "Activate",   action: "activate",   color: "#22c55e" },
                { label: "Deactivate", action: "deactivate", color: "#94a3b8" },
                { label: "Archive",    action: "archive",    color: "#f59e0b" },
              ].map((b) => (
                <button key={b.action} disabled={bulkLoading} onClick={() => bulkAction(b.action)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${b.color}33`, background: `${b.color}18`, color: b.color, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                  {b.label}
                </button>
              ))}
              <button disabled={bulkLoading} onClick={() => setDiscountModal(true)}
                style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #60a5fa33", background: "#60a5fa18", color: "#60a5fa", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                Apply Discount
              </button>
              <button disabled={bulkLoading} onClick={() => bulkAction("delete")}
                style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #ef444433", background: "#ef444418", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                Delete
              </button>
            </div>
            <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#991b1b", fontSize: 14, marginBottom: 16 }}>
            {error} — <button onClick={load} style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
          </div>
        )}

        {/* TABLE */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ ...th, width: 44 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer", accentColor: "#0f172a" }} />
                  </th>
                  <th style={{ ...th, width: 60 }}>Image</th>
                  <SortHeader label="Product" field="title" current={sortField} dir={sortDir} onSort={handleSort} />
                  <th style={th}>Status</th>
                  <SortHeader label="Price" field="price" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Stock" field="stock" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Sales" field="sales" current={sortField} dir={sortDir} onSort={handleSort} />
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} style={{ padding: "14px 16px" }}>
                          <div style={{ height: 14, borderRadius: 4, background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#475569", marginBottom: 6 }}>No products found</div>
                      <div style={{ fontSize: 13 }}>Try adjusting your filters or create a new product.</div>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const cfg = STATUS_CONFIG[p.status ?? "draft"] ?? STATUS_CONFIG.draft;
                    const imgSrc = getProductImage(p);
                    return (
                      <tr key={p.id}
                        style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.12s", cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        onClick={() => router.push(`/admin/products/${p.id}`)}>
                        <td style={td} onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} style={{ cursor: "pointer", accentColor: "#0f172a" }} />
                        </td>
                        <td style={td}>
                          <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {imgSrc ? (
                              <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <span style={{ fontSize: 18, color: "#cbd5e1" }}>□</span>
                            )}
                          </div>
                        </td>
                        {/* FIX: always show title — was sometimes blank if title field had different casing */}
                        <td style={{ ...td, maxWidth: 280 }}>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>
                            {p.title || (p as any).name || "Untitled Product"}
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                            {(p as any).sku ? `SKU: ${(p as any).sku}` : `ID: ${p.id.slice(0, 8)}…`}
                            {p.category && ` · ${p.category}`}
                          </div>
                        </td>
                        <td style={td}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                            {cfg.label}
                          </span>
                        </td>
                        <td style={td}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>R {Number(p.price ?? 0).toLocaleString()}</div>
                          {(p as any).compare_price && (p as any).compare_price > p.price && (
                            <div style={{ fontSize: 12, color: "#94a3b8", textDecoration: "line-through" }}>R {Number((p as any).compare_price).toLocaleString()}</div>
                          )}
                        </td>
                        <td style={td}>{stockLabel(p)}</td>
                        {/* FIX: safely access sales — field may be missing on some items */}
                        <td style={{ ...td, fontWeight: 600, color: "#475569", fontSize: 14 }}>
                          {((p as any).sales ?? 0).toLocaleString()}
                        </td>
                        <td style={{ ...td, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <ActionButton onClick={() => router.push(`/admin/products/${p.id}`)} title="Edit">✎</ActionButton>
                            {p.status !== "active" && (
                              <ActionButton onClick={() => quickStatus(p.id, "publish")} title="Publish" color="#15803d">▶</ActionButton>
                            )}
                            {p.status === "active" && (
                              <ActionButton onClick={() => quickStatus(p.id, "archive")} title="Archive" color="#92400e">⊟</ActionButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <PageBtn disabled={page <= 1} onClick={() => setPage(1)}>«</PageBtn>
                <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</PageBtn>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  return <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>;
                })}
                <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</PageBtn>
                <PageBtn disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</PageBtn>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DISCOUNT MODAL */}
      {discountModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setDiscountModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>Apply Bulk Discount</h3>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>Apply a percentage discount to {selected.size} selected product(s).</p>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Discount Percentage</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <input type="number" min={1} max={99} placeholder="e.g. 20" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 15, outline: "none" }} autoFocus />
              <span style={{ fontWeight: 700, color: "#475569" }}>%</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={bulkDiscount} style={{ ...primaryBtn, flex: 1 }}>Apply Discount</button>
              <button onClick={() => setDiscountModal(false)} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
        input[type=checkbox]{ width:16px; height:16px; }
        select:focus, input:focus { outline: 2px solid #0f172a; outline-offset: 0px; border-color: transparent; }
      `}</style>
    </div>
  );
}

function SortHeader({ label, field, current, dir, onSort }: { label: string; field: SortField; current: SortField; dir: SortDir; onSort: (f: SortField) => void }) {
  const active = field === current;
  return (
    <th style={{ ...th, cursor: "pointer", userSelect: "none", color: active ? "#0f172a" : "#475569", whiteSpace: "nowrap" }} onClick={() => onSort(field)}>
      {label} {active ? (dir === "asc" ? " ↑" : " ↓") : " ↕"}
    </th>
  );
}

function ActionButton({ onClick, title, color = "#475569", children }: any) {
  return (
    <button title={title} onClick={onClick}
      style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13, color, lineHeight: 1 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; }}>
      {children}
    </button>
  );
}

function PageBtn({ children, onClick, disabled, active }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "5px 10px", minWidth: 32, borderRadius: 6, border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`, background: active ? "#0f172a" : "#fff", color: active ? "#fff" : disabled ? "#cbd5e1" : "#475569", cursor: disabled ? "default" : "pointer", fontSize: 13, fontWeight: active ? 700 : 400 }}>
      {children}
    </button>
  );
}

const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "12px 16px", verticalAlign: "middle" };
const filterInput: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, background: "#fff", color: "#0f172a", minWidth: 120 };
const primaryBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const outlineBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 14, fontWeight: 500 };
function stockBadge(bg: string, color: string): React.CSSProperties {
  return { display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: bg, color };
}