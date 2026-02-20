// FILE: app/admin/products/[id]/page.tsx  (Admin Product DETAIL)
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { productsApi, adminProductsApi, adminApi } from "@/lib/api";
import type { Product, ProductImage } from "@/lib/types";
import type { ProductAnalytics, ProductVariant } from "@/lib/api";

type Tab = "overview" | "variants" | "images" | "analytics" | "edit";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  active:       { label: "Active",       bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  draft:        { label: "Draft",        bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  archived:     { label: "Archived",     bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  inactive:     { label: "Inactive",     bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
  discontinued: { label: "Discontinued", bg: "#f3e8ff", color: "#7e22ce", dot: "#a855f7" },
};

export default function AdminProductDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params?.id as string;

  const [product,   setProduct]   = useState<Product | null>(null);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [variants,  setVariants]  = useState<ProductVariant[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<Tab>("overview");
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [saving,    setSaving]    = useState(false);

  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const [invModal, setInvModal]   = useState(false);
  const [invStock,  setInvStock]  = useState("");
  const [invNote,   setInvNote]   = useState("");
  const [invMode,   setInvMode]   = useState<"set" | "adjust" | "incoming">("set");

  const [varModal,  setVarModal]  = useState(false);
  const [varForm,   setVarForm]   = useState({ title: "", sku: "", price: "", stock: "", attributes: "" });
  const [editVarId, setEditVarId] = useState<string | null>(null);

  const [imgModal, setImgModal]   = useState(false);
  const [imgUrls,  setImgUrls]    = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // FIX: use productsApi.getAdmin() which hits the same endpoint but is
      // semantically correct for admin context. Also load analytics + variants
      // in parallel for speed.
      const [p, a, v] = await Promise.all([
        productsApi.get(id),          // GET /api/products/{id}
        productsApi.getAnalytics(id), // GET /api/products/admin/{id}/analytics
        productsApi.listVariants(id), // GET /api/products/{id}/variants
      ]);
      setProduct(p);
      setEditForm({
        title:               p.title ?? "",
        short_description:   p.short_description ?? "",
        description:         p.description ?? "",
        price:               p.price ?? "",
        compare_price:       p.compare_price ?? "",
        stock:               p.stock ?? 0,
        sku:                 p.sku ?? "",
        brand:               p.brand ?? "",
        category:            p.category ?? "",
        store:               (p as any).store ?? "",
        low_stock_threshold: (p as any).low_stock_threshold ?? 10,
      });
      setAnalytics(a);
      setVariants(v ?? []);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load product", false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function lifecycle(action: "publish" | "archive" | "draft" | "restore") {
    setSaving(true);
    try {
      await productsApi.lifecycle(id, action);
      showToast(`Product ${action}d successfully`);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Action failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    setSaving(true);
    try {
      const r = await productsApi.duplicate(id) as any;
      showToast(`Duplicated — new ID: ${r?.id}`);
    } catch (e: any) {
      showToast(e?.message ?? "Duplicate failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSoftDelete() {
    if (!confirm("Soft delete this product? It can be restored later.")) return;
    try {
      await productsApi.softDelete(id);
      showToast("Product deleted");
      setTimeout(() => router.push("/admin/products"), 1200);
    } catch (e: any) {
      showToast(e?.message ?? "Delete failed", false);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...editForm };
      ["price", "compare_price", "stock", "low_stock_threshold"].forEach((k) => {
        if (payload[k] !== "" && payload[k] !== null) payload[k] = Number(payload[k]);
      });
      // FIX: productsApi.update() hits PATCH /api/products/admin/{id} — correct
      await productsApi.update(id, payload);
      showToast("Product updated");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Update failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function updateInventory() {
    if (!invStock) return;
    setSaving(true);
    try {
      if (invMode === "set") {
        // FIX: PATCH /api/products/{id}/inventory — set absolute stock value
        await productsApi.updateInventory(id, { stock: Number(invStock), note: invNote || "Manual update" });
      } else if (invMode === "adjust") {
        // FIX: use adminApi.adjustInventory which hits POST /api/admin/inventory/adjust
        await adminApi.adjustInventory({ product_id: id, quantity: Number(invStock), note: invNote || "Manual adjustment" });
      } else {
        // FIX: use adminApi.incomingInventory which hits POST /api/admin/inventory/incoming
        await adminApi.incomingInventory({ product_id: id, quantity: Number(invStock), note: invNote || "Incoming stock" });
      }
      setInvModal(false);
      setInvStock("");
      setInvNote("");
      showToast("Inventory updated");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Inventory update failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function saveVariant() {
    if (!varForm.title || !varForm.price) { showToast("Title and price required", false); return; }
    setSaving(true);
    try {
      let attrs: Record<string, string> = {};
      try {
        attrs = varForm.attributes ? JSON.parse(varForm.attributes) : {};
      } catch {
        showToast("Attributes must be valid JSON", false);
        setSaving(false);
        return;
      }
      if (editVarId) {
        await productsApi.updateVariant(editVarId, {
          title: varForm.title, sku: varForm.sku || undefined,
          price: Number(varForm.price), stock: Number(varForm.stock), attributes: attrs,
        });
        showToast("Variant updated");
      } else {
        await productsApi.createVariant(id, {
          title: varForm.title, sku: varForm.sku || undefined,
          price: Number(varForm.price), stock: Number(varForm.stock), attributes: attrs,
        });
        showToast("Variant created");
      }
      setVarModal(false);
      setVarForm({ title: "", sku: "", price: "", stock: "", attributes: "" });
      setEditVarId(null);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Variant save failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteVariant(variantId: string) {
    if (!confirm("Delete this variant?")) return;
    try {
      await productsApi.deleteVariant(variantId);
      showToast("Variant deleted");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Delete failed", false);
    }
  }

  async function toggleVariant(variantId: string, active: boolean) {
    try {
      await productsApi.updateVariant(variantId, { is_active: !active });
      showToast(`Variant ${active ? "deactivated" : "activated"}`);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", false);
    }
  }

  async function addImageUrls() {
    const urls = imgUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) { showToast("Enter at least one URL", false); return; }
    setSaving(true);
    try {
      await productsApi.bulkAddImages(id, { images: urls });
      setImgModal(false);
      setImgUrls("");
      showToast(`${urls.length} image(s) added`);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Image add failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function setImagePrimary(imageId: string) {
    try {
      await productsApi.setImagePrimary(imageId);
      showToast("Primary image updated");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Failed", false);
    }
  }

  async function setImagePosition(imageId: string, position: number) {
    try {
      await productsApi.setImagePosition(imageId, position);
      load();
    } catch {}
  }

  if (loading) return <LoadingSkeleton />;
  if (!product) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Product not found</div>
      <button onClick={() => router.push("/admin/products")} style={{ ...outlineBtn, marginTop: 16 }}>← Back to Products</button>
    </div>
  );

  const cfg = STATUS_CONFIG[product.status] ?? STATUS_CONFIG.draft;
  const images: ProductImage[] = (product as any).images ?? [];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: toast.ok ? "#0f172a" : "#dc2626", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", animation: "slideIn 0.2s ease" }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.push("/admin/products")} style={ghostBtn}>← Products</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12, flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", margin: 0, wordBreak: "break-word" }}>{product.title}</h1>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                  {cfg.label}
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                ID: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>{product.id}</code>
                {product.sku && <> · SKU: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>{product.sku}</code></>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {product.status !== "active" && (
                <button onClick={() => lifecycle("publish")} disabled={saving} style={greenBtn}>▶ Publish</button>
              )}
              {product.status === "active" && (
                <button onClick={() => lifecycle("archive")} disabled={saving} style={yellowBtn}>⊟ Archive</button>
              )}
              <button onClick={() => lifecycle("draft")} disabled={saving || product.status === "draft"} style={outlineBtn}>Draft</button>
              <button onClick={handleDuplicate} disabled={saving} style={outlineBtn}>⎘ Duplicate</button>
              <button onClick={handleSoftDelete} style={{ ...outlineBtn, color: "#dc2626", borderColor: "#fca5a5" }}>🗑 Delete</button>
            </div>
          </div>
        </div>

        {/* STATS STRIP */}
        {analytics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Revenue Est.", value: `R ${Number(analytics.revenue_estimate ?? 0).toLocaleString()}`, icon: "💰" },
              { label: "Units Sold",   value: analytics.sales ?? 0,                                            icon: "📦" },
              { label: "Stock",        value: analytics.stock ?? 0,                                            icon: "🏪" },
              { label: "Rating",       value: analytics.rating ? `${analytics.rating}/5` : "—",               icon: "⭐" },
              { label: "Reviews",      value: analytics.rating_number ?? 0,                                   icon: "💬" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 4, overflowX: "auto" }}>
          {(["overview", "edit", "variants", "images", "analytics"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: tab === t ? "#0f172a" : "transparent", color: tab === t ? "#fff" : "#64748b", cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 600 : 400, whiteSpace: "nowrap", textTransform: "capitalize" }}>
              {t === "analytics" ? "📊 Analytics" : t === "images" ? `🖼 Images (${images.length})` : t === "variants" ? `🔀 Variants (${variants.length})` : t === "edit" ? "✎ Edit" : "Overview"}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="Product Info">
              <InfoGrid rows={[
                ["Title",         product.title],
                ["Price",         `R ${Number(product.price).toLocaleString()}`],
                ["Compare Price", product.compare_price ? `R ${Number(product.compare_price).toLocaleString()}` : "—"],
                ["Stock",         product.stock],
                ["Low Stock At",  (product as any).low_stock_threshold ?? "—"],
                ["In Stock",      product.in_stock ? "Yes" : "No"],
                ["SKU",           product.sku ?? "—"],
                ["Brand",         product.brand ?? "—"],
              ]} />
            </Card>
            <Card title="Classification">
              <InfoGrid rows={[
                ["Category",      product.category ?? "—"],
                ["Main Category", (product as any).main_category ?? "—"],
                ["Store",         (product as any).store ?? "—"],
                ["Store ID",      (product as any).store_id ?? "—"],
                ["Parent ASIN",   (product as any).parent_asin ?? "—"],
                ["Status",        product.status],
                ["Created",       product.created_at ? new Date(product.created_at).toLocaleDateString() : "—"],
                ["Updated",       product.updated_at ? new Date(product.updated_at).toLocaleDateString() : "—"],
              ]} />
            </Card>
            {(product.short_description || product.description) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Card title="Description">
                  {product.short_description && <p style={{ fontSize: 14, color: "#374151", marginBottom: 12, fontWeight: 500 }}>{product.short_description}</p>}
                  {product.description && <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>{product.description}</p>}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* EDIT */}
        {tab === "edit" && (
          <div style={{ display: "grid", gap: 16 }}>
            <Card title="Basic Info">
              <div style={{ display: "grid", gap: 14 }}>
                <FormField label="Title *">
                  <input style={inputStyle} value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Product name" />
                </FormField>
                <FormField label="Short Description">
                  <input style={inputStyle} value={editForm.short_description} onChange={(e) => setEditForm((p) => ({ ...p, short_description: e.target.value }))} />
                </FormField>
                <FormField label="Description">
                  <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                </FormField>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FormField label="Category"><input style={inputStyle} value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))} /></FormField>
                  <FormField label="Brand"><input style={inputStyle} value={editForm.brand} onChange={(e) => setEditForm((p) => ({ ...p, brand: e.target.value }))} /></FormField>
                  <FormField label="Store ID"><input style={inputStyle} value={editForm.store} onChange={(e) => setEditForm((p) => ({ ...p, store: e.target.value }))} /></FormField>
                  <FormField label="SKU"><input style={inputStyle} value={editForm.sku} onChange={(e) => setEditForm((p) => ({ ...p, sku: e.target.value }))} /></FormField>
                </div>
              </div>
            </Card>
            <Card title="Pricing">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Price (R) *">
                  <input type="number" style={inputStyle} value={editForm.price} onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} min={0} step={0.01} />
                </FormField>
                <FormField label="Compare Price (R)">
                  <input type="number" style={inputStyle} value={editForm.compare_price} onChange={(e) => setEditForm((p) => ({ ...p, compare_price: e.target.value }))} min={0} step={0.01} />
                </FormField>
              </div>
            </Card>
            <Card title="Inventory">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Stock Quantity">
                  <input type="number" style={inputStyle} value={editForm.stock} onChange={(e) => setEditForm((p) => ({ ...p, stock: e.target.value }))} min={0} />
                </FormField>
                <FormField label="Low Stock Threshold">
                  <input type="number" style={inputStyle} value={editForm.low_stock_threshold} onChange={(e) => setEditForm((p) => ({ ...p, low_stock_threshold: e.target.value }))} min={0} />
                </FormField>
              </div>
            </Card>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveEdit} disabled={saving} style={primaryBtn}>{saving ? "Saving…" : "Save Changes"}</button>
              <button onClick={() => load()} style={outlineBtn}>Discard</button>
            </div>
          </div>
        )}

        {/* VARIANTS */}
        {tab === "variants" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: "#64748b" }}>{variants.length} variant{variants.length !== 1 ? "s" : ""}</p>
              <button onClick={() => { setEditVarId(null); setVarForm({ title: "", sku: "", price: "", stock: "", attributes: "" }); setVarModal(true); }} style={primaryBtn}>+ Add Variant</button>
            </div>
            {variants.length === 0 ? (
              <EmptyState icon="🔀" title="No variants" description="Add size, color, or other variants for this product." />
            ) : (
              <Card title="">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Title", "SKU", "Attributes", "Price", "Stock", "Active", "Actions"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{v.title}</td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>{v.sku ?? "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {Object.entries(v.attributes ?? {}).map(([k, val]) => (
                            <span key={k} style={{ display: "inline-block", padding: "2px 8px", background: "#f1f5f9", borderRadius: 99, fontSize: 11, marginRight: 4 }}>{k}: {val as string}</span>
                          ))}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>R {Number(v.price).toLocaleString()}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ color: v.stock === 0 ? "#dc2626" : v.stock < 10 ? "#d97706" : "#15803d", fontWeight: 600 }}>{v.stock}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: v.is_active ? "#dcfce7" : "#f1f5f9", color: v.is_active ? "#15803d" : "#64748b" }}>
                            {v.is_active ? "Yes" : "No"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <SmBtn onClick={() => { setEditVarId(v.id); setVarForm({ title: v.title, sku: v.sku ?? "", price: String(v.price), stock: String(v.stock), attributes: JSON.stringify(v.attributes, null, 2) }); setVarModal(true); }}>Edit</SmBtn>
                            <SmBtn onClick={() => toggleVariant(v.id, v.is_active)} color={v.is_active ? "#d97706" : "#15803d"}>{v.is_active ? "Deactivate" : "Activate"}</SmBtn>
                            <SmBtn onClick={() => deleteVariant(v.id)} color="#dc2626">Delete</SmBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {/* IMAGES */}
        {tab === "images" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: "#64748b" }}>{images.length} image{images.length !== 1 ? "s" : ""}</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setInvModal(true)} style={outlineBtn}>📦 Update Inventory</button>
                <button onClick={() => setImgModal(true)} style={primaryBtn}>+ Add Images</button>
              </div>
            </div>
            {images.length === 0 ? (
              <EmptyState icon="🖼" title="No images" description="Add product images by providing image URLs." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
                {[...images].sort((a, b) => a.position - b.position).map((img) => (
                  <div key={img.id} style={{ background: "#fff", border: `2px solid ${img.is_primary ? "#0f172a" : "#e2e8f0"}`, borderRadius: 12, overflow: "hidden", position: "relative" }}>
                    <img src={img.image_url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                    {img.is_primary && (
                      <div style={{ position: "absolute", top: 8, left: 8, background: "#0f172a", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>PRIMARY</div>
                    )}
                    <div style={{ padding: "8px 10px", display: "flex", gap: 6, justifyContent: "space-between" }}>
                      {!img.is_primary && <button onClick={() => setImagePrimary(img.id)} style={{ flex: 1, ...smBtnStyle }}>★ Set Primary</button>}
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setImagePosition(img.id, Math.max(0, img.position - 1))} style={smBtnStyle} title="Move up">↑</button>
                        <button onClick={() => setImagePosition(img.id, img.position + 1)} style={smBtnStyle} title="Move down">↓</button>
                      </div>
                    </div>
                    <div style={{ padding: "0 10px 8px", fontSize: 11, color: "#94a3b8" }}>Position {img.position}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && analytics && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { l: "Total Sales",   v: analytics.sales ?? 0 },
                { l: "Revenue Est.",  v: `R ${Number(analytics.revenue_estimate ?? 0).toLocaleString()}` },
                { l: "Current Stock", v: analytics.stock ?? 0 },
                { l: "Avg Rating",    v: analytics.rating ? `${analytics.rating}/5` : "—" },
                { l: "Review Count",  v: analytics.rating_number ?? 0 },
              ].map((s) => (
                <div key={s.l} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>{s.v}</div>
                </div>
              ))}
            </div>
            {analytics.inventory_history && analytics.inventory_history.length > 0 && (
              <Card title="Inventory History">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Type", "Before", "Change", "After", "Note", "Date"].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...analytics.inventory_history].reverse().map((e, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: e.type === "incoming" ? "#dcfce7" : "#f1f5f9", color: e.type === "incoming" ? "#15803d" : "#475569" }}>{e.type}</span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{e.before}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: e.change >= 0 ? "#15803d" : "#dc2626" }}>{e.change >= 0 ? "+" : ""}{e.change}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{e.after}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{e.note ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 12 }}>{new Date(e.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* INVENTORY MODAL */}
      {invModal && (
        <Modal title="Update Inventory" onClose={() => setInvModal(false)}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["set", "adjust", "incoming"] as const).map((m) => (
              <button key={m} onClick={() => setInvMode(m)}
                style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", background: invMode === m ? "#0f172a" : "#f1f5f9", color: invMode === m ? "#fff" : "#475569", cursor: "pointer", fontSize: 13, fontWeight: invMode === m ? 600 : 400, textTransform: "capitalize" }}>
                {m}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
            {invMode === "set" ? "Overwrite stock to this exact value." : invMode === "adjust" ? "Add or subtract from current stock (e.g. -10 or +20)." : "Record incoming stock received."}
          </p>
          <FormField label={invMode === "set" ? "New Stock Value" : invMode === "adjust" ? "Adjustment (+ or -)" : "Incoming Quantity"}>
            <input type="number" style={inputStyle} value={invStock} onChange={(e) => setInvStock(e.target.value)} placeholder={invMode === "adjust" ? "-10 or +50" : "e.g. 50"} autoFocus />
          </FormField>
          <FormField label="Note (optional)">
            <input style={inputStyle} value={invNote} onChange={(e) => setInvNote(e.target.value)} placeholder="Reason for update" />
          </FormField>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={updateInventory} disabled={!invStock || saving} style={{ ...primaryBtn, flex: 1 }}>{saving ? "Saving…" : "Update"}</button>
            <button onClick={() => setInvModal(false)} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* VARIANT MODAL */}
      {varModal && (
        <Modal title={editVarId ? "Edit Variant" : "Add Variant"} onClose={() => setVarModal(false)}>
          <FormField label="Title *">
            <input style={inputStyle} value={varForm.title} onChange={(e) => setVarForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Red / XL" autoFocus />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Price (R) *">
              <input type="number" style={inputStyle} value={varForm.price} onChange={(e) => setVarForm((p) => ({ ...p, price: e.target.value }))} min={0} />
            </FormField>
            <FormField label="Stock">
              <input type="number" style={inputStyle} value={varForm.stock} onChange={(e) => setVarForm((p) => ({ ...p, stock: e.target.value }))} min={0} />
            </FormField>
          </div>
          <FormField label="SKU">
            <input style={inputStyle} value={varForm.sku} onChange={(e) => setVarForm((p) => ({ ...p, sku: e.target.value }))} placeholder="Optional" />
          </FormField>
          <FormField label='Attributes (JSON e.g. {"color":"red"})'>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={varForm.attributes} onChange={(e) => setVarForm((p) => ({ ...p, attributes: e.target.value }))} placeholder='{"color":"red","size":"XL"}' />
          </FormField>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={saveVariant} disabled={saving} style={{ ...primaryBtn, flex: 1 }}>{saving ? "Saving…" : editVarId ? "Update Variant" : "Create Variant"}</button>
            <button onClick={() => setVarModal(false)} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* IMAGE MODAL */}
      {imgModal && (
        <Modal title="Add Images (URLs)" onClose={() => setImgModal(false)}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Enter one image URL per line.</p>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={imgUrls} onChange={(e) => setImgUrls(e.target.value)} placeholder={"https://cdn.example.com/img1.jpg\nhttps://cdn.example.com/img2.jpg"} autoFocus />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={addImageUrls} disabled={saving} style={{ ...primaryBtn, flex: 1 }}>{saving ? "Adding…" : "Add Images"}</button>
            <button onClick={() => setImgModal(false)} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes slideIn { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        select:focus, input:focus, textarea:focus { outline: 2px solid #0f172a; outline-offset: 0; border-color: transparent; }
      `}</style>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
      {title && <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</h3>}
      {children}
    </div>
  );
}
function InfoGrid({ rows }: { rows: [any, any][] }) {
  return (
    <div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f8fafc", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#94a3b8", flexShrink: 0 }}>{k}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right", wordBreak: "break-all" }}>{String(v ?? "—")}</span>
        </div>
      ))}
    </div>
  );
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>{description}</div>
    </div>
  );
}
function SmBtn({ onClick, color = "#475569", children }: any) {
  return (
    <button onClick={onClick} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${color}33`, background: `${color}0d`, color, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{children}</button>
  );
}
function LoadingSkeleton() {
  return (
    <div style={{ padding: 32, fontFamily: "system-ui" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: 20, borderRadius: 6, background: "#f1f5f9", marginBottom: 12, width: `${80 - i * 10}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box", background: "#fff" };
const smBtnStyle: React.CSSProperties = { padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 12, color: "#475569" };
const primaryBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const outlineBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 14, fontWeight: 500 };
const greenBtn:   React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const yellowBtn:  React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "none", background: "#d97706", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const ghostBtn:   React.CSSProperties = { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0 };