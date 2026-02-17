"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { productsApi } from "@/lib/api";
import type { Product } from "@/lib/types";

/* =====================================================
   TYPES
===================================================== */

type Variant = {
  id: string;
  title: string;
  sku?: string;
  attributes: Record<string, string>;
  price: number;
  compare_price?: number;
  stock: number;
  in_stock: boolean;
  image_url?: string;
  is_active: boolean;
  created_at: string;
};

type InventoryEntry = {
  type: string;
  before: number;
  change: number;
  after: number;
  note?: string;
  created_at: string;
};

type ProductAnalytics = {
  sales: number;
  revenue_estimate: number;
  rating: number;
  rating_number: number;
  stock: number;
  inventory_history: InventoryEntry[];
};

type ImageObj = {
  id: string;
  url: string;
  position: number;
  is_primary: boolean;
};

type Tab = "info" | "pricing" | "images" | "variants" | "inventory" | "analytics";

/* =====================================================
   HELPERS
===================================================== */

function fmt(n?: number) {
  return n != null ? n.toLocaleString() : "—";
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtMoney(n?: number) {
  if (n == null) return "—";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  active:       { label: "Active",       dot: "#22c55e" },
  inactive:     { label: "Inactive",     dot: "#94a3b8" },
  archived:     { label: "Archived",     dot: "#f59e0b" },
  draft:        { label: "Draft",        dot: "#6366f1" },
  discontinued: { label: "Discontinued", dot: "#ef4444" },
};

/* =====================================================
   PAGE
===================================================== */

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newVariant, setNewVariant] = useState(false);
  const [variantForm, setVariantForm] = useState({
    title: "", sku: "", price: "", stock: "0",
    attributes: "{}", image_url: "",
  });
  const [inventoryForm, setInventoryForm] = useState({
    stock: "", note: "", type: "manual", reference: "",
  });

  /* ─── LOAD ─── */

  async function load() {
    try {
      const [prod, anal, vars] = await Promise.all([
        productsApi.getAdmin(id),
        productsApi.getAnalytics(id),
        productsApi.listVariants(id),
      ]);
      setProduct(prod);
      setAnalytics(anal);
      setVariants(vars || []);
      if (prod.stock != null)
        setInventoryForm((f) => ({ ...f, stock: String(prod.stock) }));
    } catch {
      toast.error("Failed to load product");
      router.replace("/admin/products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  /* ─── SAVE ─── */

  async function handleSave() {
    if (!product) return;
    setSaving(true);
    try {
      await productsApi.update(product.id, {
        title: product.title,
        short_description: product.short_description,
        description: product.description,
        price: product.price,
        compare_price: product.compare_price,
        stock: product.stock,
        category: product.category,
        main_category: product.main_category,
        brand: product.brand,
        sku: product.sku,
        store: product.store,
        low_stock_threshold: product.low_stock_threshold,
      });
      toast.success("Saved");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* ─── LIFECYCLE ─── */

  async function lifecycle(action: "publish" | "archive" | "draft" | "discontinue") {
    try {
      await productsApi.lifecycle(id, action);
      toast.success(`Product ${action}d`);
      await load();
    } catch (err: any) {
      toast.error(err.message || `${action} failed`);
    }
  }

  async function handleSoftDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await productsApi.softDelete(id);
      toast.success("Product deleted");
      router.replace("/admin/products");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  async function handleDuplicate() {
    try {
      const res = await productsApi.duplicate(id);
      toast.success("Duplicated as draft");
      router.push(`/admin/products/${res.id}`);
    } catch (err: any) {
      toast.error(err.message || "Duplicate failed");
    }
  }

  /* ─── IMAGES ─── */

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    setUploading(true);
    try {
      await productsApi.uploadImage(product.id, file);
      toast.success("Image uploaded");
      await load();
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  }

  async function handleDeleteImage(imageId: string) {
    try {
      await productsApi.deleteImage(imageId);
      toast.success("Image removed");
      await load();
    } catch { toast.error("Delete failed"); }
  }

  async function handleSetPrimary(imageId: string) {
    try {
      await productsApi.setImagePrimary(imageId);
      toast.success("Primary image set");
      await load();
    } catch { toast.error("Failed"); }
  }

  /* ─── VARIANTS ─── */

  async function handleCreateVariant() {
    try {
      let attrs = {};
      try { attrs = JSON.parse(variantForm.attributes); } catch {}
      await productsApi.createVariant(id, {
        title: variantForm.title,
        sku: variantForm.sku || undefined,
        price: parseFloat(variantForm.price),
        stock: parseInt(variantForm.stock),
        attributes: attrs,
        image_url: variantForm.image_url || undefined,
      });
      toast.success("Variant created");
      setNewVariant(false);
      setVariantForm({ title: "", sku: "", price: "", stock: "0", attributes: "{}", image_url: "" });
      await load();
    } catch (err: any) { toast.error(err.message || "Failed"); }
  }

  async function handleDeleteVariant(vid: string) {
    try {
      await productsApi.deleteVariant(vid);
      toast.success("Variant removed");
      await load();
    } catch { toast.error("Failed"); }
  }

  /* ─── INVENTORY ─── */

  async function handleInventoryUpdate() {
    try {
      await productsApi.updateInventory(id, {
        stock: parseInt(inventoryForm.stock),
        note: inventoryForm.note,
        type: inventoryForm.type,
        reference: inventoryForm.reference,
      });
      toast.success("Inventory updated");
      await load();
    } catch (err: any) { toast.error(err.message || "Failed"); }
  }

  /* ─── RENDER ─── */

  if (loading) return (
    <div style={loadingWrap}>
      <div style={spinner} />
      <p style={{ color: "#64748b", fontSize: 14 }}>Loading product…</p>
    </div>
  );
  if (!product) return null;

  const statusMeta = STATUS_META[product.status] || STATUS_META.inactive;
  const images: ImageObj[] = (product.images || []) as any;

  return (
    <div style={pageWrap}>

      {/* ── TOPBAR ── */}
      <div style={topbar}>
        <button style={backBtn} onClick={() => router.push("/admin/products")}>
          ← Products
        </button>

        <div style={topbarCenter}>
          <span style={{ ...statusDot, background: statusMeta.dot }} />
          <span style={statusLabel}>{statusMeta.label}</span>
          <span style={productIdChip}>#{product.id.slice(0, 8)}</span>
        </div>

        <div style={topbarActions}>
          {product.status !== "active" && (
            <ActionBtn label="Publish" color="#22c55e" onClick={() => lifecycle("publish")} />
          )}
          {product.status !== "draft" && (
            <ActionBtn label="Draft" color="#6366f1" onClick={() => lifecycle("draft")} />
          )}
          {product.status !== "archived" && (
            <ActionBtn label="Archive" color="#f59e0b" onClick={() => lifecycle("archive")} />
          )}
          <ActionBtn label="Duplicate" color="#0ea5e9" onClick={handleDuplicate} />
          <ActionBtn
            label={confirmDelete ? "Confirm Delete" : "Delete"}
            color="#ef4444"
            onClick={handleSoftDelete}
          />
        </div>
      </div>

      {/* ── TITLE BLOCK ── */}
      <div style={titleBlock}>
        <div style={mainImageThumb}>
          {images[0] ? (
            <img src={images[0].url} alt="" style={thumbImg} />
          ) : (
            <div style={thumbPlaceholder}>📦</div>
          )}
        </div>
        <div>
          <h1 style={titleText}>{product.title}</h1>
          <p style={titleSub}>
            {product.brand && <span style={pill}>{product.brand}</span>}
            {product.store && <span style={pill}>{product.store}</span>}
            {product.category && <span style={pill}>{product.category}</span>}
            {product.sku && <span style={{ ...pill, background: "#f1f5f9", color: "#475569" }}>SKU: {product.sku}</span>}
          </p>
        </div>
      </div>

      {/* ── STAT STRIP ── */}
      <div style={statStrip}>
        <StatCard label="Price" value={fmtMoney(product.price)} accent="#0f172a" />
        <StatCard label="Stock" value={fmt(product.stock)} accent={product.stock === 0 ? "#ef4444" : product.stock <= (product.low_stock_threshold || 10) ? "#f59e0b" : "#22c55e"} />
        <StatCard label="Sales" value={fmt(analytics?.sales)} accent="#6366f1" />
        <StatCard label="Revenue" value={fmtMoney(analytics?.revenue_estimate)} accent="#0ea5e9" />
        <StatCard label="Rating" value={analytics?.rating ? `${analytics.rating} ★` : "—"} accent="#f59e0b" />
        <StatCard label="Variants" value={String(variants.length)} accent="#8b5cf6" />
      </div>

      {/* ── TABS ── */}
      <div style={tabBar}>
        {(["info", "pricing", "images", "variants", "inventory", "analytics"] as Tab[]).map((t) => (
          <button
            key={t}
            style={{ ...tabBtn, ...(activeTab === t ? tabBtnActive : {}) }}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={tabContent}>

        {/* INFO */}
        {activeTab === "info" && (
          <div style={card}>
            <SectionTitle>Product Information</SectionTitle>
            <div style={grid2}>
              <Field label="Title" value={product.title}
                onChange={(v) => setProduct({ ...product, title: v })} />
              <Field label="Brand" value={product.brand || ""}
                onChange={(v) => setProduct({ ...product, brand: v })} />
              <Field label="SKU" value={product.sku || ""}
                onChange={(v) => setProduct({ ...product, sku: v })} />
              <Field label="Store" value={product.store || ""}
                onChange={(v) => setProduct({ ...product, store: v })} />
              <Field label="Category" value={product.category || ""}
                onChange={(v) => setProduct({ ...product, category: v })} />
              <Field label="Main Category" value={product.main_category || ""}
                onChange={(v) => setProduct({ ...product, main_category: v })} />
            </div>
            <Field label="Short Description" value={product.short_description || ""}
              onChange={(v) => setProduct({ ...product, short_description: v })} />
            <FieldArea label="Description" value={product.description || ""}
              onChange={(v) => setProduct({ ...product, description: v })} />
            <SaveRow saving={saving} onSave={handleSave} />
          </div>
        )}

        {/* PRICING */}
        {activeTab === "pricing" && (
          <div style={card}>
            <SectionTitle>Pricing & Stock</SectionTitle>
            <div style={grid2}>
              <Field label="Price (R)" type="number" value={String(product.price)}
                onChange={(v) => setProduct({ ...product, price: Number(v) })} />
              <Field label="Compare Price (R)" type="number" value={String(product.compare_price || "")}
                onChange={(v) => setProduct({ ...product, compare_price: v ? Number(v) : undefined })} />
              <Field label="Stock" type="number" value={String(product.stock)}
                onChange={(v) => setProduct({ ...product, stock: Number(v) })} />
              <Field label="Low Stock Alert Threshold" type="number" value={String(product.low_stock_threshold || 10)}
                onChange={(v) => setProduct({ ...product, low_stock_threshold: Number(v) })} />
            </div>
            {product.compare_price && product.compare_price > product.price && (
              <div style={discountBadge}>
                {Math.round((1 - product.price / product.compare_price) * 100)}% off
              </div>
            )}
            <SaveRow saving={saving} onSave={handleSave} />
          </div>
        )}

        {/* IMAGES */}
        {activeTab === "images" && (
          <div style={card}>
            <SectionTitle>Image Management</SectionTitle>
            <label style={uploadZone}>
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: "none" }} />
              <span style={{ fontSize: 28 }}>📁</span>
              <span style={{ fontWeight: 700, color: "#1e293b" }}>
                {uploading ? "Uploading…" : "Click to upload image"}
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>JPG, PNG, WEBP</span>
            </label>

            {images.length === 0 && (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: 32 }}>No images yet</p>
            )}

            <div style={imageGrid}>
              {images.map((img) => (
                <div key={img.id} style={{ ...imageCard, ...(img.is_primary ? imagePrimaryBorder : {}) }}>
                  {img.is_primary && <div style={primaryBadge}>Primary</div>}
                  <img src={img.url} alt="" style={imgThumb} />
                  <div style={imageActions}>
                    {!img.is_primary && (
                      <button style={imgActBtn} onClick={() => handleSetPrimary(img.id)}>
                        ⭐ Set Primary
                      </button>
                    )}
                    <button style={{ ...imgActBtn, color: "#ef4444" }} onClick={() => handleDeleteImage(img.id)}>
                      🗑 Remove
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 4 }}>
                    Position {img.position}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VARIANTS */}
        {activeTab === "variants" && (
          <div style={card}>
            <div style={sectionRow}>
              <SectionTitle>Variants ({variants.length})</SectionTitle>
              <button style={addBtn} onClick={() => setNewVariant(!newVariant)}>
                {newVariant ? "✕ Cancel" : "+ Add Variant"}
              </button>
            </div>

            {newVariant && (
              <div style={variantFormBox}>
                <h4 style={{ fontWeight: 800, marginBottom: 12, color: "#1e293b" }}>New Variant</h4>
                <div style={grid2}>
                  <Field label="Title (e.g. Red / XL)" value={variantForm.title}
                    onChange={(v) => setVariantForm({ ...variantForm, title: v })} />
                  <Field label="SKU" value={variantForm.sku}
                    onChange={(v) => setVariantForm({ ...variantForm, sku: v })} />
                  <Field label="Price (R)" type="number" value={variantForm.price}
                    onChange={(v) => setVariantForm({ ...variantForm, price: v })} />
                  <Field label="Stock" type="number" value={variantForm.stock}
                    onChange={(v) => setVariantForm({ ...variantForm, stock: v })} />
                </div>
                <Field label='Attributes JSON (e.g. {"color":"Red","size":"XL"})' value={variantForm.attributes}
                  onChange={(v) => setVariantForm({ ...variantForm, attributes: v })} />
                <Field label="Image URL (optional)" value={variantForm.image_url}
                  onChange={(v) => setVariantForm({ ...variantForm, image_url: v })} />
                <button style={saveBtn} onClick={handleCreateVariant}>Create Variant</button>
              </div>
            )}

            {variants.length === 0 && !newVariant && (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: 32 }}>
                No variants. Add size, color, or any option.
              </p>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              {variants.map((v) => (
                <div key={v.id} style={variantRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {v.image_url && (
                      <img src={v.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 800, color: "#1e293b" }}>{v.title}</div>
                      {v.sku && <div style={{ fontSize: 12, color: "#64748b" }}>SKU: {v.sku}</div>}
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(" · ")}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900, color: "#0f172a" }}>{fmtMoney(v.price)}</div>
                      <div style={{ fontSize: 12, color: v.stock === 0 ? "#ef4444" : "#22c55e" }}>
                        {v.stock} in stock
                      </div>
                    </div>
                    <span style={{
                      ...statusDot,
                      background: v.is_active ? "#22c55e" : "#ef4444",
                      width: 8, height: 8,
                    }} />
                    <button style={dangerSmBtn} onClick={() => handleDeleteVariant(v.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {activeTab === "inventory" && (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={card}>
              <SectionTitle>Update Stock</SectionTitle>
              <div style={grid2}>
                <Field label="New Stock Quantity" type="number" value={inventoryForm.stock}
                  onChange={(v) => setInventoryForm({ ...inventoryForm, stock: v })} />
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Adjustment Type</label>
                  <select
                    value={inventoryForm.type}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, type: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="manual">Manual</option>
                    <option value="incoming">Incoming Stock</option>
                    <option value="correction">Correction</option>
                    <option value="return">Return</option>
                  </select>
                </div>
                <Field label="Reference (PO#, etc)" value={inventoryForm.reference}
                  onChange={(v) => setInventoryForm({ ...inventoryForm, reference: v })} />
                <Field label="Note" value={inventoryForm.note}
                  onChange={(v) => setInventoryForm({ ...inventoryForm, note: v })} />
              </div>
              <button style={saveBtn} onClick={handleInventoryUpdate}>Update Inventory</button>
            </div>

            <div style={card}>
              <SectionTitle>Adjustment History</SectionTitle>
              {!analytics?.inventory_history?.length ? (
                <p style={{ color: "#94a3b8" }}>No adjustments yet.</p>
              ) : (
                <div style={histTable}>
                  <div style={histHeader}>
                    <span>Type</span><span>Before</span><span>Change</span><span>After</span><span>Note</span><span>Date</span>
                  </div>
                  {analytics.inventory_history.map((h, i) => (
                    <div key={i} style={histRow}>
                      <span style={{ ...typePill, background: h.change > 0 ? "#dcfce7" : "#fee2e2", color: h.change > 0 ? "#166534" : "#991b1b" }}>
                        {h.type}
                      </span>
                      <span>{h.before}</span>
                      <span style={{ fontWeight: 700, color: h.change > 0 ? "#22c55e" : "#ef4444" }}>
                        {h.change > 0 ? `+${h.change}` : h.change}
                      </span>
                      <span style={{ fontWeight: 700 }}>{h.after}</span>
                      <span style={{ color: "#64748b", fontSize: 12 }}>{h.note || "—"}</span>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>{fmtDate(h.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={grid4}>
              <BigStat label="Total Sales" value={fmt(analytics?.sales)} />
              <BigStat label="Est. Revenue" value={fmtMoney(analytics?.revenue_estimate)} />
              <BigStat label="Rating" value={analytics?.rating ? `${analytics.rating} ★` : "—"} />
              <BigStat label="Reviews" value={fmt(analytics?.rating_number)} />
            </div>

            <div style={card}>
              <SectionTitle>Product Details</SectionTitle>
              <div style={detailGrid}>
                <DetailRow label="Created" value={fmtDate(product.created_at)} />
                <DetailRow label="Last Updated" value={fmtDate(product.updated_at)} />
                <DetailRow label="Parent ASIN" value={product.parent_asin || "—"} />
                <DetailRow label="Soft Deleted" value={product.is_deleted ? "Yes" : "No"} />
                <DetailRow label="Status" value={product.status} />
                <DetailRow label="Images" value={String(images.length)} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* =====================================================
   SUB-COMPONENTS
===================================================== */

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent, fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, textAlign: "center" as const }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" as const, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{value}</span>
    </div>
  );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      style={{
        padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${color}`,
        background: "transparent", color, fontWeight: 800, fontSize: 12, cursor: "pointer",
        transition: "all 0.15s",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", marginBottom: 20, letterSpacing: "-0.01em" }}>{children}</h2>;
}

function Field({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function FieldArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, resize: "vertical" as const }} />
    </div>
  );
}

function SaveRow({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
      <button style={saveBtn} onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

/* =====================================================
   STYLES
===================================================== */

const pageWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "24px 24px 80px",
  fontFamily: "'DM Sans', system-ui, sans-serif",
};

const loadingWrap: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", height: 320, gap: 16,
};

const spinner: React.CSSProperties = {
  width: 36, height: 36,
  border: "3px solid #e2e8f0",
  borderTop: "3px solid #0f172a",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const topbar: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  marginBottom: 24, flexWrap: "wrap" as const, gap: 12,
};

const backBtn: React.CSSProperties = {
  background: "none", border: "none", fontSize: 13, fontWeight: 700,
  color: "#64748b", cursor: "pointer", padding: "6px 0",
};

const topbarCenter: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
};

const topbarActions: React.CSSProperties = {
  display: "flex", gap: 8, flexWrap: "wrap" as const,
};

const statusDot: React.CSSProperties = {
  width: 10, height: 10, borderRadius: "50%", display: "inline-block",
};

const statusLabel: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: "#374151",
};

const productIdChip: React.CSSProperties = {
  fontSize: 11, background: "#f1f5f9", color: "#64748b",
  padding: "3px 8px", borderRadius: 6, fontFamily: "'DM Mono', monospace",
};

const titleBlock: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 20, marginBottom: 24,
};

const mainImageThumb: React.CSSProperties = {
  width: 72, height: 72, borderRadius: 12, overflow: "hidden",
  border: "1px solid #e2e8f0", flexShrink: 0,
};

const thumbImg: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const thumbPlaceholder: React.CSSProperties = {
  width: "100%", height: "100%", display: "flex",
  alignItems: "center", justifyContent: "center",
  background: "#f8fafc", fontSize: 28,
};

const titleText: React.CSSProperties = {
  fontSize: 22, fontWeight: 900, color: "#0f172a",
  letterSpacing: "-0.02em", marginBottom: 8,
};

const titleSub: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" as const };

const pill: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
  background: "#0f172a", color: "#fff",
};

const statStrip: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 12, marginBottom: 24,
};

const statCard: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "16px 18px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

const tabBar: React.CSSProperties = {
  display: "flex", gap: 4, marginBottom: 20,
  background: "#f1f5f9", borderRadius: 12, padding: 4,
  overflowX: "auto" as const,
};

const tabBtn: React.CSSProperties = {
  padding: "8px 18px", borderRadius: 8, border: "none",
  background: "transparent", fontWeight: 700, fontSize: 13,
  color: "#64748b", cursor: "pointer", whiteSpace: "nowrap" as const,
};

const tabBtnActive: React.CSSProperties = {
  background: "#fff", color: "#0f172a",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const tabContent: React.CSSProperties = { minHeight: 400 };

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 16, padding: 24,
  border: "1px solid #e2e8f0",
};

const grid2: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px",
};

const grid4: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#64748b",
  marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", fontSize: 14, color: "#1e293b",
  background: "#fafafa", boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "auto" as any,
};

const saveBtn: React.CSSProperties = {
  padding: "10px 24px", borderRadius: 10, border: "none",
  background: "#0f172a", color: "#fff", fontWeight: 800,
  fontSize: 14, cursor: "pointer",
};

const sectionRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
};

const addBtn: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 8,
  border: "1.5px solid #0f172a",
  background: "transparent", color: "#0f172a",
  fontWeight: 800, fontSize: 12, cursor: "pointer",
};

const variantFormBox: React.CSSProperties = {
  background: "#f8fafc", borderRadius: 12, padding: 20,
  marginBottom: 20, border: "1px solid #e2e8f0",
};

const variantRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: 16, borderRadius: 12, border: "1.5px solid #e2e8f0",
  background: "#fafafa",
};

const dangerSmBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: "1px solid #fee2e2", background: "#fff",
  color: "#ef4444", fontWeight: 900, cursor: "pointer", fontSize: 12,
};

const uploadZone: React.CSSProperties = {
  display: "flex", flexDirection: "column" as const, alignItems: "center",
  gap: 8, padding: "28px 20px", borderRadius: 12,
  border: "2px dashed #cbd5e1", cursor: "pointer",
  marginBottom: 24, background: "#f8fafc",
};

const imageGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: 16,
};

const imageCard: React.CSSProperties = {
  borderRadius: 12, overflow: "hidden",
  border: "1.5px solid #e2e8f0", background: "#fafafa", position: "relative" as const,
};

const imagePrimaryBorder: React.CSSProperties = {
  border: "2px solid #22c55e",
};

const primaryBadge: React.CSSProperties = {
  position: "absolute" as const, top: 6, left: 6,
  background: "#22c55e", color: "#fff",
  fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
};

const imgThumb: React.CSSProperties = {
  width: "100%", height: 120, objectFit: "cover" as const,
};

const imageActions: React.CSSProperties = {
  display: "flex", flexDirection: "column" as const, gap: 4, padding: "8px 8px 4px",
};

const imgActBtn: React.CSSProperties = {
  background: "none", border: "none", fontSize: 11, fontWeight: 700,
  cursor: "pointer", color: "#475569", textAlign: "left" as const,
};

const discountBadge: React.CSSProperties = {
  display: "inline-block",
  background: "#dcfce7", color: "#166534",
  fontWeight: 800, fontSize: 13, padding: "6px 14px",
  borderRadius: 20, marginBottom: 16,
};

const histTable: React.CSSProperties = { display: "grid", gap: 0 };

const histHeader: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "100px 80px 80px 80px 1fr 120px",
  padding: "8px 0", borderBottom: "2px solid #f1f5f9",
  fontSize: 11, fontWeight: 800, color: "#94a3b8",
  textTransform: "uppercase" as const, letterSpacing: "0.05em",
};

const histRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "100px 80px 80px 80px 1fr 120px",
  padding: "12px 0", borderBottom: "1px solid #f1f5f9",
  alignItems: "center",
};

const typePill: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, padding: "3px 8px",
  borderRadius: 20, display: "inline-block",
};

const detailGrid: React.CSSProperties = { display: "grid", gap: 0 };
