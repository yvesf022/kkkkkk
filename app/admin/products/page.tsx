"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { productsApi, adminProductsApi, bulkUploadApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";

/* ── helpers ── */
function statusColor(s: string) {
  switch (s) {
    case "active":       return { bg: "#dcfce7", color: "#15803d", dot: "#22c55e" };
    case "draft":        return { bg: "#fef9c3", color: "#a16207", dot: "#eab308" };
    case "archived":     return { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" };
    case "discontinued": return { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" };
    default:             return { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" };
  }
}

function stockColor(stock: number | null | undefined) {
  if (stock == null) return "#94a3b8";
  if (stock === 0)   return "#ef4444";
  if (stock < 10)    return "#f59e0b";
  return "#22c55e";
}

export default function AdminProductsPage() {
  const [products, setProducts]       = useState<ProductListItem[]>([]);
  const [selected, setSelected]       = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [status, setStatus]           = useState("");
  const [store, setStore]             = useState("");
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [uploading, setUploading]     = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [imgErrors, setImgErrors]     = useState<Record<string, boolean>>({});
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const perPage                       = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminProductsApi.list({
        page, per_page: perPage,
        search: search || undefined,
        status: status || undefined,
        store:  store  || undefined,
      });
      setProducts(data.results || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, store]);

  useEffect(() => { load(); }, [load]);

  const toggle    = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === products.length ? [] : products.map(p => p.id));

  async function bulkAction(fn: (ids: string[]) => Promise<any>) {
    await fn(selected);
    setSelected([]);
    load();
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const r = await bulkUploadApi.upload(file) as any;
      setUploadResult({ ok: true, msg: `✓ ${r?.created ?? "?"} created · ${r?.updated ?? "?"} updated · ${r?.errors ?? 0} errors` });
      load();
    } catch (err: any) {
      setUploadResult({ ok: false, msg: `Upload failed: ${err?.message ?? "Unknown error"}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const totalPages = Math.ceil(total / perPage);
  const allSelected = products.length > 0 && selected.length === products.length;

  /* ── image src helper: try thumbnail → image_url → first of images[] ── */
  function getImage(p: ProductListItem): string | null {
    return (p as any).thumbnail
      || (p as any).image_url
      || (p as any).images?.[0]?.url
      || (p as any).images?.[0]
      || null;
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>

      {/* ══ PAGE HEADER ══ */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Products
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            {total.toLocaleString()} products in catalogue
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => productsApi.exportCsv()} style={ghostBtn}>
            ↓ Export CSV
          </button>
          <label style={uploading ? { ...ghostBtn, opacity: 0.5, cursor: "not-allowed" } : ghostBtn}>
            {uploading ? "Uploading…" : "↑ Bulk CSV"}
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} disabled={uploading} onChange={handleCsvUpload} />
          </label>
          <Link href="/admin/products/bulk-upload" style={ghostBtn}>
            Bulk Upload
          </Link>
          <Link href="/admin/products/new" style={primaryBtn}>
            + Add Product
          </Link>
        </div>
      </div>

      {/* ══ UPLOAD BANNER ══ */}
      {uploadResult && (
        <div style={{
          marginBottom: 16, padding: "12px 16px", borderRadius: 10,
          background: uploadResult.ok ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${uploadResult.ok ? "#bbf7d0" : "#fecaca"}`,
          color: uploadResult.ok ? "#166534" : "#991b1b",
          fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{uploadResult.msg}</span>
          <button onClick={() => setUploadResult(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: "inherit", padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* ══ FILTER BAR ══ */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 15, pointerEvents: "none" }}>🔍</span>
          <input
            placeholder="Search products…"
            value={search}
            onChange={e => { setPage(1); setSearch(e.target.value); }}
            style={{ ...filterInput, paddingLeft: 36, width: "100%" }}
          />
        </div>

        <select value={status} onChange={e => { setPage(1); setStatus(e.target.value); }} style={filterInput}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="discontinued">Discontinued</option>
        </select>

        <input
          placeholder="Store ID"
          value={store}
          onChange={e => { setPage(1); setStore(e.target.value); }}
          style={{ ...filterInput, width: 130 }}
        />

        {(search || status || store) && (
          <button onClick={() => { setSearch(""); setStatus(""); setStore(""); setPage(1); }} style={ghostBtn}>
            Clear
          </button>
        )}
      </div>

      {/* ══ BULK ACTION BAR ══ */}
      {selected.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", padding: "10px 16px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8", marginRight: 4 }}>
            {selected.length} selected
          </span>
          <button onClick={() => bulkAction(adminProductsApi.bulkActivate)}   style={bulkBtn("#16a34a")}>Activate</button>
          <button onClick={() => bulkAction(adminProductsApi.bulkDeactivate)} style={bulkBtn("#d97706")}>Deactivate</button>
          <button onClick={() => bulkAction(adminProductsApi.bulkArchive)}    style={bulkBtn("#475569")}>Archive</button>
          <button
            onClick={async () => { if (!confirm(`Delete ${selected.length} products?`)) return; await bulkAction(adminProductsApi.bulkDelete); }}
            style={bulkBtn("#dc2626")}
          >
            Delete
          </button>
          <button onClick={() => setSelected([])} style={{ ...ghostBtn, marginLeft: "auto" }}>Cancel</button>
        </div>
      )}

      {/* ══ PRODUCT TABLE ══ */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>

        {/* Stats strip */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #f1f5f9" }}>
          {[
            { label: "Total",        val: total },
            { label: "Active",       val: products.filter(p => p.status === "active").length },
            { label: "Draft",        val: products.filter(p => p.status === "draft").length },
            { label: "Low Stock",    val: products.filter(p => (p.stock ?? 999) < 10 && (p.stock ?? 999) > 0).length },
            { label: "Out of Stock", val: products.filter(p => p.stock === 0).length },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "14px 18px", borderRight: i < 4 ? "1px solid #f1f5f9" : "none", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p style={{ color: "#64748b", fontSize: 15, fontWeight: 600 }}>No products found</p>
            <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>Try adjusting your filters or add a new product</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#f8fafc", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>
                  <th style={{ ...th, width: 48 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer", width: 16, height: 16 }} />
                  </th>
                  <th style={{ ...th, width: 64 }}>Image</th>
                  <th style={th}>Product</th>
                  <th style={{ ...th, textAlign: "right" }}>Price</th>
                  <th style={{ ...th, textAlign: "center" }}>Stock</th>
                  <th style={{ ...th, textAlign: "center" }}>Status</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p, i) => {
                  const imgSrc  = getImage(p);
                  const hasErr  = imgErrors[p.id];
                  const sc      = statusColor(p.status);
                  const isSelected = selected.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isSelected ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#fafafa",
                        transition: "background 0.12s",
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ ...td, width: 48 }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggle(p.id)} style={{ cursor: "pointer", width: 16, height: 16 }} />
                      </td>

                      {/* Image */}
                      <td style={{ ...td, width: 64 }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 10,
                          overflow: "hidden", flexShrink: 0,
                          background: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          position: "relative",
                        }}>
                          {imgSrc && !hasErr ? (
                            <img
                              src={imgSrc}
                              alt={p.title}
                              onError={() => setImgErrors(e => ({ ...e, [p.id]: true }))}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: 22 }}>🛍️</span>
                          )}
                        </div>
                      </td>

                      {/* Title + ID */}
                      <td style={td}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", marginBottom: 3, lineHeight: 1.3 }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
                          ID: {p.id.slice(0, 12)}…
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ ...td, textAlign: "right" }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                          {p.price != null ? `R ${Number(p.price).toLocaleString()}` : "—"}
                        </span>
                      </td>

                      {/* Stock */}
                      <td style={{ ...td, textAlign: "center" }}>
                        <span style={{
                          fontWeight: 700, fontSize: 14,
                          color: stockColor(p.stock),
                        }}>
                          {p.stock == null ? "—" : p.stock === 0 ? "Out" : p.stock}
                        </span>
                        {p.stock != null && p.stock > 0 && p.stock < 10 && (
                          <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>Low</div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td style={{ ...td, textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 10px", borderRadius: 99,
                          fontSize: 12, fontWeight: 600,
                          background: sc.bg, color: sc.color,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                          {p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <Link
                            href={`/store/product/${p.id}`}
                            target="_blank"
                            style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, color: "#475569", textDecoration: "none", background: "#f8fafc" }}
                          >
                            View
                          </Link>
                          <Link
                            href={`/admin/products/${p.id}`}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 12, color: "#fff", background: "#0f172a", textDecoration: "none", fontWeight: 600 }}
                          >
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ PAGINATION ══ */}
        {totalPages > 1 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()} products
            </span>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                style={pageBtn(page === 1)}
              >«</button>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={pageBtn(page === 1)}
              >‹ Prev</button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      ...pageBtn(false),
                      background: p === page ? "#0f172a" : "#f8fafc",
                      color:      p === page ? "#fff"    : "#475569",
                      borderColor: p === page ? "#0f172a" : "#e2e8f0",
                      fontWeight: p === page ? 700 : 400,
                    }}
                  >{p}</button>
                );
              })}

              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                style={pageBtn(page === totalPages)}
              >Next ›</button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                style={pageBtn(page === totalPages)}
              >»</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        tr:hover { background: #f8fafc !important; }
      `}</style>
    </div>
  );
}

/* ── Style constants ── */

const filterInput: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 9,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  background: "#fff",
  outline: "none",
  color: "#0f172a",
};

const primaryBtn: React.CSSProperties = {
  padding: "9px 18px", borderRadius: 9,
  border: "none", background: "#0f172a", color: "#fff",
  cursor: "pointer", fontSize: 14, fontWeight: 700,
  textDecoration: "none", display: "inline-flex",
  alignItems: "center", whiteSpace: "nowrap",
};

const ghostBtn: React.CSSProperties = {
  padding: "9px 14px", borderRadius: 9,
  border: "1px solid #e2e8f0", background: "#f8fafc",
  cursor: "pointer", fontSize: 13, color: "#475569",
  textDecoration: "none", display: "inline-flex",
  alignItems: "center", whiteSpace: "nowrap",
};

const bulkBtn = (color: string): React.CSSProperties => ({
  padding: "6px 14px", borderRadius: 7,
  border: `1px solid ${color}20`,
  background: `${color}10`, color,
  cursor: "pointer", fontSize: 13, fontWeight: 600,
});

const pageBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 11px", borderRadius: 7,
  border: "1px solid #e2e8f0", background: "#f8fafc",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 13, color: disabled ? "#cbd5e1" : "#475569",
  opacity: disabled ? 0.5 : 1,
});

const th: React.CSSProperties = {
  padding: "11px 14px", fontWeight: 700,
  textAlign: "left", whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "middle",
};