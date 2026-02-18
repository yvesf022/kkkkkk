"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

/* =====================================================
   TYPES
===================================================== */

type FilterState = {
  search: string;
  status: string;
  category: string;
  store: string;
};

/* =====================================================
   HELPERS
===================================================== */

function fmtMoney(n?: number) {
  if (n == null) return "—";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

function fmt(n?: number) {
  return n != null ? n.toLocaleString() : "—";
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: "Active", bg: "#dcfce7", color: "#166534" },
  inactive: { label: "Inactive", bg: "#f1f5f9", color: "#64748b" },
  archived: { label: "Archived", bg: "#fef3c7", color: "#92400e" },
  draft: { label: "Draft", bg: "#e0e7ff", color: "#3730a3" },
  discontinued: { label: "Discontinued", bg: "#fee2e2", color: "#991b1b" },
};

/* =====================================================
   PAGE
===================================================== */

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    category: "",
    store: "",
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  /* ─── LOAD PRODUCTS ─── */

  async function loadProducts() {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        limit,
        offset: (page - 1) * limit,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.store) params.store = filters.store;

      const data = await productsApi.list(params);
      setProducts(data.results || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [page, filters]);

  /* ─── SELECTION ─── */

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  }

  /* ─── ACTIONS ─── */

  function handleCreate() {
    router.push("/admin/products/new");
  }

  function handleBulkUpload() {
    router.push("/admin/products/bulk-upload");
  }

  function handleRowClick(id: string) {
    router.push(`/admin/products/${id}`);
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      toast.error("No products selected");
      return;
    }
    if (!confirm(`Delete ${selectedIds.length} products?`)) return;

    try {
      // You'll need to implement this API call
      // await productsApi.bulkDelete(selectedIds);
      toast.success(`${selectedIds.length} products deleted`);
      setSelectedIds([]);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Bulk delete failed");
    }
  }

  /* ─── RENDER ─── */

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={pageWrap}>
      {/* HEADER */}
      <div style={headerBlock}>
        <div>
          <h1 style={pageTitle}>Products</h1>
          <p style={pageSub}>
            {total} total products · {selectedIds.length} selected
          </p>
        </div>
        <div style={headerActions}>
          <button style={ghostBtn} onClick={handleBulkUpload}>
            ⬆ Bulk Upload
          </button>
          <button style={primaryBtn} onClick={handleCreate}>
            + New Product
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div style={filterBar}>
        <div style={searchBox}>
          <span style={searchIcon}>🔍</span>
          <input
            style={searchInput}
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
          />
        </div>

        <select
          style={filterSelect}
          value={filters.status}
          onChange={(e) => {
            setFilters({ ...filters, status: e.target.value });
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="discontinued">Discontinued</option>
        </select>

        <select
          style={filterSelect}
          value={filters.category}
          onChange={(e) => {
            setFilters({ ...filters, category: e.target.value });
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {/* Add your categories here */}
        </select>

        {selectedIds.length > 0 && (
          <button style={dangerBtn} onClick={handleBulkDelete}>
            🗑 Delete ({selectedIds.length})
          </button>
        )}
      </div>

      {/* TABLE */}
      <div style={tableCard}>
        {loading ? (
          <div style={loadingWrap}>
            <div style={spinner} />
            <p style={{ color: "#64748b", marginTop: 16 }}>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
              No products found
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
              {filters.search || filters.status || filters.category
                ? "Try adjusting your filters"
                : "Create your first product to get started"}
            </p>
            {!filters.search && !filters.status && !filters.category && (
              <button style={primaryBtn} onClick={handleCreate}>
                + Create Product
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>
                      <input
                        type="checkbox"
                        checked={
                          products.length > 0 &&
                          selectedIds.length === products.length
                        }
                        onChange={toggleSelectAll}
                        style={checkbox}
                      />
                    </th>
                    <th style={th}>Product</th>
                    <th style={th}>Price</th>
                    <th style={th}>Stock</th>
                    <th style={th}>Status</th>
                    <th style={th}>Category</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const status = STATUS_META[product.status] || STATUS_META.inactive;
                    return (
                      <tr
                        key={product.id}
                        style={tableRow}
                        onClick={(e) => {
                          // Don't navigate if clicking checkbox or buttons
                          const target = e.target as HTMLElement;
                          if (
                            target.tagName === "INPUT" ||
                            target.tagName === "BUTTON" ||
                            target.closest("button")
                          ) {
                            return;
                          }
                          handleRowClick(product.id);
                        }}
                      >
                        <td style={td}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={checkbox}
                          />
                        </td>
                        <td style={td}>
                          <div style={productCell}>
                            <div style={productThumb}>
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.title}
                                  style={thumbImg}
                                />
                              ) : (
                                <div style={thumbPlaceholder}>📦</div>
                              )}
                            </div>
                            <div>
                              <div style={productTitle}>{product.title}</div>
                              <div style={productSKU}>
                                {product.sku || `ID: ${product.id.slice(0, 8)}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          <div style={priceCell}>
                            {fmtMoney(product.price)}
                            {product.compare_price && product.compare_price > product.price && (
                              <div style={comparePrice}>
                                {fmtMoney(product.compare_price)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={td}>
                          <div
                            style={{
                              ...stockBadge,
                              background:
                                product.stock === 0
                                  ? "#fee2e2"
                                  : product.stock < 10
                                  ? "#fef3c7"
                                  : "#dcfce7",
                              color:
                                product.stock === 0
                                  ? "#991b1b"
                                  : product.stock < 10
                                  ? "#92400e"
                                  : "#166534",
                            }}
                          >
                            {fmt(product.stock)}
                          </div>
                        </td>
                        <td style={td}>
                          <div
                            style={{
                              ...statusBadge,
                              background: status.bg,
                              color: status.color,
                            }}
                          >
                            {status.label}
                          </div>
                        </td>
                        <td style={td}>
                          <div style={categoryCell}>
                            {product.main_category || "—"}
                          </div>
                        </td>
                        <td style={td}>
                          <button
                            style={editBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(product.id);
                            }}
                          >
                            Edit →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div style={paginationWrap}>
                <div style={paginationInfo}>
                  Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
                </div>
                <div style={paginationControls}>
                  <button
                    style={pageBtn}
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    ← Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        style={{
                          ...pageBtn,
                          ...(page === pageNum ? pageBtnActive : {}),
                        }}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    style={pageBtn}
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   STYLES
===================================================== */

const pageWrap: React.CSSProperties = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "24px 24px 80px",
  fontFamily: "'DM Sans', system-ui, sans-serif",
};

const headerBlock: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 24,
  gap: 20,
  flexWrap: "wrap",
};

const pageTitle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.02em",
  marginBottom: 4,
};

const pageSub: React.CSSProperties = {
  fontSize: 14,
  color: "#64748b",
  fontWeight: 500,
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  background: "transparent",
  color: "#64748b",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "1.5px solid #fee2e2",
  background: "#fff",
  color: "#ef4444",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const filterBar: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginBottom: 20,
  flexWrap: "wrap",
};

const searchBox: React.CSSProperties = {
  flex: 1,
  minWidth: 300,
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const searchIcon: React.CSSProperties = {
  position: "absolute",
  left: 14,
  fontSize: 16,
  pointerEvents: "none",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px 10px 42px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  color: "#1e293b",
  background: "#fff",
  fontFamily: "inherit",
};

const filterSelect: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  color: "#1e293b",
  background: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const tableCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  overflow: "hidden",
};

const loadingWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 80,
};

const spinner: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "3px solid #e2e8f0",
  borderTop: "3px solid #0f172a",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const emptyState: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: 80,
  textAlign: "center",
};

const tableWrap: React.CSSProperties = {
  overflowX: "auto",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const th: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
  color: "#1e293b",
};

const tableRow: React.CSSProperties = {
  cursor: "pointer",
  transition: "background 0.15s",
};

const checkbox: React.CSSProperties = {
  width: 16,
  height: 16,
  cursor: "pointer",
};

const productCell: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const productThumb: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 8,
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  flexShrink: 0,
};

const thumbImg: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const thumbPlaceholder: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
  fontSize: 20,
};

const productTitle: React.CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 2,
};

const productSKU: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  fontFamily: "'DM Mono', monospace",
};

const priceCell: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const comparePrice: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  textDecoration: "line-through",
};

const stockBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 800,
};

const statusBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 800,
};

const categoryCell: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
};

const editBtn: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const paginationWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderTop: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const paginationInfo: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  fontWeight: 600,
};

const paginationControls: React.CSSProperties = {
  display: "flex",
  gap: 6,
};

const pageBtn: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#64748b",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const pageBtnActive: React.CSSProperties = {
  background: "#0f172a",
  color: "#fff",
  border: "1px solid #0f172a",
};