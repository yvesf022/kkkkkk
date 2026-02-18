"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { productsApi, adminApi } from "@/lib/api";

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStock, setNewStock] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [p, a, v] = await Promise.all([
        productsApi.get(id),
        productsApi.getAnalytics(id),
        productsApi.listVariants(id),
      ]);
      setProduct(p);
      setAnalytics(a);
      setVariants(v || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function showMsg(text: string, ok = true) {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 4000);
  }

  async function updateStatus(status: string) {
    setSaving(true);
    try {
      await adminApi.updateProductStatus(id, status as any);
      showMsg(`Status updated to ${status}`);
      load();
    } catch (err: any) {
      showMsg(err?.message ?? "Failed to update status", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSoftDelete() {
    if (!confirm("Soft delete this product? It can be restored later.")) return;
    try {
      await productsApi.softDelete(id);
      showMsg("Product soft deleted");
      load();
    } catch (err: any) {
      showMsg(err?.message ?? "Delete failed", false);
    }
  }

  async function handleDuplicate() {
    try {
      const result = await productsApi.duplicate(id);
      showMsg(`Duplicated! New ID: ${result.id}`);
    } catch (err: any) {
      showMsg(err?.message ?? "Duplicate failed", false);
    }
  }

  async function updateInventory() {
    if (!newStock) return;
    setSaving(true);
    try {
      await productsApi.updateInventory(id, {
        stock: Number(newStock),
        note: stockNote || "Manual update from admin panel",
      });
      setNewStock("");
      setStockNote("");
      showMsg("Stock updated");
      load();
    } catch (err: any) {
      showMsg(err?.message ?? "Stock update failed", false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 32, color: "#64748b" }}>Loading...</div>;
  if (!product) return <div style={{ padding: 32, color: "#ef4444" }}>Product not found</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <button onClick={() => router.back()} style={ghostBtn}>
            Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{product.title}</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>ID: {product.id}</p>
        </div>
        <span style={{
          padding: "4px 12px",
          borderRadius: 99,
          fontSize: 13,
          fontWeight: 600,
          background: product.status === "active" ? "#dcfce7" : "#f1f5f9",
          color: product.status === "active" ? "#166534" : "#475569",
          alignSelf: "flex-start",
          marginTop: 8,
        }}>
          {product.status}
        </span>
      </div>

      {/* MESSAGE BANNER */}
      {message && (
        <div style={{
          marginBottom: 16,
          padding: "10px 16px",
          borderRadius: 8,
          fontSize: 14,
          background: message.ok ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${message.ok ? "#bbf7d0" : "#fecaca"}`,
          color: message.ok ? "#166534" : "#991b1b",
        }}>
          {message.text}
        </div>
      )}

      {/* PRODUCT INFO */}
      <div style={card}>
        <h3 style={sectionTitle}>Product Info</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 14 }}>
          <Row label="Price" value={product.price != null ? `R ${Number(product.price).toLocaleString()}` : "-"} />
          <Row label="Stock" value={product.stock ?? "-"} />
          <Row label="Category" value={product.category ?? "-"} />
          <Row label="Store" value={product.store ?? "-"} />
          <Row label="SKU" value={product.sku ?? "-"} />
          <Row label="Brand" value={product.brand ?? "-"} />
        </div>
      </div>

      {/* STATUS CONTROLS */}
      <div style={card}>
        <h3 style={sectionTitle}>Status Controls</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => updateStatus("active")} disabled={saving} style={greenBtn}>
            Publish
          </button>
          <button onClick={() => updateStatus("draft")} disabled={saving} style={btn}>
            Draft
          </button>
          <button onClick={() => updateStatus("archived")} disabled={saving} style={btn}>
            Archive
          </button>
          <button onClick={() => updateStatus("discontinued")} disabled={saving} style={btn}>
            Discontinue
          </button>
          <button onClick={handleDuplicate} style={btn}>
            Duplicate
          </button>
          <button onClick={handleSoftDelete} style={{ ...btn, color: "#dc2626", borderColor: "#fca5a5" }}>
            Soft Delete
          </button>
        </div>
      </div>

      {/* INVENTORY */}
      <div style={card}>
        <h3 style={sectionTitle}>Update Inventory</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={label}>New Stock Value</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              style={input}
            />
          </div>
          <div>
            <label style={label}>Note (optional)</label>
            <input
              type="text"
              placeholder="Reason for update"
              value={stockNote}
              onChange={(e) => setStockNote(e.target.value)}
              style={{ ...input, width: 220 }}
            />
          </div>
          <button onClick={updateInventory} disabled={!newStock || saving} style={greenBtn}>
            {saving ? "Saving..." : "Update Stock"}
          </button>
        </div>
      </div>

      {/* VARIANTS */}
      <div style={card}>
        <h3 style={sectionTitle}>Variants ({variants.length})</h3>
        {variants.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 14 }}>No variants for this product.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={th}>Title</th>
                <th style={th}>SKU</th>
                <th style={th}>Price</th>
                <th style={th}>Stock</th>
                <th style={th}>Active</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={td}>{v.title}</td>
                  <td style={td}>{v.sku ?? "-"}</td>
                  <td style={td}>{v.price != null ? `R ${Number(v.price).toLocaleString()}` : "-"}</td>
                  <td style={td}>{v.stock}</td>
                  <td style={td}>{v.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ANALYTICS */}
      {analytics && (
        <div style={card}>
          <h3 style={sectionTitle}>Analytics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
            {[
              { label: "Sales", value: analytics.sales ?? 0 },
              { label: "Revenue Est.", value: analytics.revenue_estimate != null ? `R ${Number(analytics.revenue_estimate).toLocaleString()}` : "-" },
              { label: "Rating", value: analytics.rating != null ? `${analytics.rating} / 5` : "-" },
              { label: "Reviews", value: analytics.rating_number ?? 0 },
              { label: "Stock", value: analytics.stock ?? 0 },
            ].map((s) => (
              <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b", marginRight: 8 }}>{label}:</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 14,
  color: "#0f172a",
};

const btn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 13,
};

const greenBtn: React.CSSProperties = {
  ...btn,
  background: "#dcfce7",
  borderColor: "#86efac",
  fontWeight: 600,
  color: "#166534",
};

const ghostBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
};

const input: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  display: "block",
  width: 140,
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#64748b",
  marginBottom: 4,
};

const th: React.CSSProperties = {
  padding: "8px 12px",
  fontWeight: 600,
  color: "#475569",
  fontSize: 13,
};

const td: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
};