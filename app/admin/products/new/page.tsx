"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";

export default function NewProductPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    compare_price: "",
    stock: "",
    sku: "",
    category: "",
    brand: "",
    store: "",
    status: "draft",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      setError("A valid price is required.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        compare_price: form.compare_price ? Number(form.compare_price) : undefined,
        stock: form.stock ? Number(form.stock) : 0,
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || undefined,
        brand: form.brand.trim() || undefined,
        store: form.store.trim() || undefined,
        status: form.status,
      };

      const created = await productsApi.create(payload) as any;
      // Navigate to the product detail page so they can add images/variants
      router.push(`/admin/products/${created?.id ?? ""}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => router.back()} style={ghostBtn}>
          Back
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>New Product</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          Fill in the details below. You can add images and variants after saving.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div style={errorBanner}>{error}</div>
      )}

      <form onSubmit={handleSubmit}>

        {/* BASIC INFO */}
        <div style={card}>
          <h3 style={sectionTitle}>Basic Info</h3>

          <Field label="Title *">
            <input
              style={input}
              placeholder="Product name"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>

          <Field label="Description">
            <textarea
              style={{ ...input, height: 100, resize: "vertical" }}
              placeholder="Product description..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Category">
              <input
                style={input}
                placeholder="e.g. Electronics"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              />
            </Field>
            <Field label="Brand">
              <input
                style={input}
                placeholder="e.g. Samsung"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Store ID">
            <input
              style={input}
              placeholder="Store identifier"
              value={form.store}
              onChange={(e) => set("store", e.target.value)}
            />
          </Field>
        </div>

        {/* PRICING */}
        <div style={card}>
          <h3 style={sectionTitle}>Pricing</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Price (R) *">
              <input
                style={input}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </Field>
            <Field label="Compare Price (R)">
              <input
                style={input}
                type="number"
                min="0"
                step="0.01"
                placeholder="Original / crossed-out price"
                value={form.compare_price}
                onChange={(e) => set("compare_price", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* INVENTORY */}
        <div style={card}>
          <h3 style={sectionTitle}>Inventory</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Stock Quantity">
              <input
                style={input}
                type="number"
                min="0"
                placeholder="0"
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </Field>
            <Field label="SKU">
              <input
                style={input}
                placeholder="Stock keeping unit"
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* STATUS */}
        <div style={card}>
          <h3 style={sectionTitle}>Status</h3>
          <Field label="Initial Status">
            <select
              style={input}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="draft">Draft (not visible to customers)</option>
              <option value="active">Active (live immediately)</option>
            </select>
          </Field>
        </div>

        {/* SUBMIT */}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="submit"
            disabled={saving}
            style={primaryBtn}
          >
            {saving ? "Creating..." : "Create Product"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={secondaryBtn}
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
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
  marginBottom: 16,
  color: "#0f172a",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  boxSizing: "border-box",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6,
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 14,
};

const ghostBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
};

const errorBanner: React.CSSProperties = {
  marginBottom: 16,
  padding: "10px 16px",
  borderRadius: 8,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  fontSize: 14,
};