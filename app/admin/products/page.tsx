"use client";

import { useEffect, useState } from "react";
import { productsApi, adminProductsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [store, setStore] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

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
  }, [page, search, status, store]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
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

  const totalPages = Math.ceil(total / perPage);

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>
          Product Management
        </h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          {total} products total
        </p>
      </div>

      {/* FILTERS */}
      <div style={filtersWrap}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={input}
        />

        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
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
          onChange={(e) => {
            setPage(1);
            setStore(e.target.value);
          }}
          style={input}
        />

        <button onClick={() => productsApi.exportCsv()} style={btn}>
          Export CSV
        </button>
      </div>

      {/* BULK ACTIONS */}
      {selected.length > 0 && (
        <div style={bulkBar}>
          <span>{selected.length} selected</span>

          <button onClick={bulkActivate} style={btn}>
            Activate
          </button>
          <button onClick={bulkDeactivate} style={btn}>
            Deactivate
          </button>
          <button onClick={bulkArchive} style={btn}>
            Archive
          </button>
          <button
            onClick={bulkDelete}
            style={{ ...btn, color: "#dc2626" }}
          >
            Delete
          </button>
        </div>
      )}

      {/* TABLE */}
      <div style={card}>
        {loading ? (
          <div>Loading...</div>
        ) : products.length === 0 ? (
          <div>No products found</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 13 }}>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      products.length > 0 &&
                      selected.length === products.length
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th>Title</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>

                  <td>{p.title}</td>
                  <td>{p.price?.toLocaleString()}</td>
                  <td>{p.stock}</td>
                  <td>{p.status}</td>
                  <td>
                    <a href={`/admin/products/${p.id}`}>
                      Manage →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{ marginTop: 20 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={btn}
            >
              Previous
            </button>

            <span style={{ margin: "0 12px" }}>
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              style={btn}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- UI ---------------- */

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
};

const btn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
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
};


