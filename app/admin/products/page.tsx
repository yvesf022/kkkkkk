"use client";

import { useEffect, useState, useRef } from "react";
import { productsApi, adminProductsApi, bulkUploadApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import Link from "next/link";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [store, setStore] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const perPage = 20;

  async function load() {
    setLoading(true);
    try {
      const data = await adminProductsApi.list({
        page,
        per_page: perPage,
        search: search || undefined,
        status: status || undefined,
        store: store || undefined,
      });
      setProducts(data.results || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, store]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selected.length === products.length) {
      setSelected([]);
    } else {
      setSelected(products.map((p) => p.id));
    }
  }

  async function bulkDelete() {
    if (!confirm("Delete selected products?")) return;
    await adminProductsApi.bulkDelete(selected);
    setSelected([]);
    load();
  }

  async function bulkActivate() {
    await adminProductsApi.bulkActivate(selected);
    setSelected([]);
    load();
  }

  async function bulkDeactivate() {
    await adminProductsApi.bulkDeactivate(selected);
    setSelected([]);
    load();
  }

  async function bulkArchive() {
    await adminProductsApi.bulkArchive(selected);
    setSelected([]);
    load();
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    try {
      const result = await bulkUploadApi.upload(file) as any;
      setUploadResult(
        `Upload complete - ${result?.created ?? "?"} created, ${result?.updated ?? "?"} updated, ${result?.errors ?? 0} errors`
      );
      load();
    } catch (err: any) {
      setUploadResult(`Upload failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 30, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Product Management</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>{total} products total</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/admin/products/bulk-upload" style={secondaryBtn}>
            Full Bulk Upload
          </Link>

          <Link href="/admin/products/new" style={primaryBtn}>
            + Add Product
          </Link>

          <label style={uploading ? { ...secondaryBtn, opacity: 0.6, cursor: "not-allowed" } : secondaryBtn}>
            {uploading ? "Uploading..." : "Bulk Upload CSV"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              disabled={uploading}
              onChange={handleCsvUpload}
            />
          </label>

          <button onClick={() => productsApi.exportCsv()} style={secondaryBtn}>
            Export CSV
          </button>
        </div>
      </div>

      {/* UPLOAD RESULT BANNER */}
      {uploadResult && (
        <div style={{
          marginBottom: 16,
          padding: "10px 16px",
          borderRadius: 8,
          background: uploadResult.startsWith("Upload complete") ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${uploadResult.startsWith("Upload complete") ? "#bbf7d0" : "#fecaca"}`,
          color: uploadResult.startsWith("Upload complete") ? "#166534" : "#991b1b",
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span>{uploadResult}</span>
          <button
            onClick={() => setUploadResult(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit" }}
          >
            x
          </button>
        </div>
      )}

      {/* FILTERS */}
      <div style={filtersWrap}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          style={input}
        />

        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          style={input}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="discontinued">Discontinued</option>
        </select>

        <input
          placeholder="Store ID"
          value={store}
          onChange={(e) => { setPage(1); setStore(e.target.value); }}
          style={input}
        />
      </div>

      {/* BULK ACTIONS */}
      {selected.length > 0 && (
        <div style={bulkBar}>
          <span style={{ fontSize: 14, color: "#475569" }}>{selected.length} selected</span>
          <button onClick={bulkActivate} style={btn}>Activate</button>
          <button onClick={bulkDeactivate} style={btn}>Deactivate</button>
          <button onClick={bulkArchive} style={btn}>Archive</button>
          <button onClick={bulkDelete} style={{ ...btn, color: "#dc2626", borderColor: "#fca5a5" }}>
            Delete
          </button>
        </div>
      )}

      {/* TABLE */}
      <div style={card}>
        {loading ? (
          <div style={{ color: "#64748b", padding: 20 }}>Loading...</div>
        ) : products.length === 0 ? (
          <div style={{ color: "#64748b", padding: 20 }}>No products found</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 13, borderBottom: "1px solid #e2e8f0" }}>
                <th style={th}>
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selected.length === products.length}
                    onChange={toggleAll}
                  />
                </th>
                <th style={th}>Title</th>
                <th style={th}>Price</th>
                <th style={th}>Stock</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>

            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td style={td}>{p.title}</td>
                  <td style={td}>{p.price != null ? `R ${p.price.toLocaleString()}` : "-"}</td>
                  <td style={td}>{p.stock ?? "-"}</td>
                  <td style={td}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 99,
                      fontSize: 12,
                      background: p.status === "active" ? "#dcfce7" : "#f1f5f9",
                      color: p.status === "active" ? "#166534" : "#475569",
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={td}>
                    <Link href={`/admin/products/${p.id}`} style={{ color: "#3b82f6", textDecoration: "none", fontSize: 13 }}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <button disabled={page === 1} onClick={() => setPage(page - 1)} style={btn}>
              Previous
            </button>
            <span style={{ margin: "0 4px", fontSize: 14, color: "#64748b" }}>
              Page {page} of {totalPages}
            </span>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} style={btn}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const filtersWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginBottom: 20,
  flexWrap: "wrap",
};

const input: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 14,
};

const btn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 13,
};

const primaryBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

const secondaryBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 14,
  display: "inline-block",
};

const card: React.CSSProperties = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};

const bulkBar: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  alignItems: "center",
  padding: "10px 16px",
  background: "#f8fafc",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};

const th: React.CSSProperties = {
  padding: "10px 12px",
  fontWeight: 600,
  color: "#475569",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
};