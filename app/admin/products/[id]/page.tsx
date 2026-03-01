// FILE: app/admin/products/[id]/page.tsx  ──  Enterprise Product Detail
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { productsApi, adminApi } from "@/lib/api";
import type { Product, ProductImage, ProductVariant } from "@/lib/types";
import type { ProductAnalytics } from "@/lib/api";

/* ─────────── types ─────────── */
type Tab = "overview" | "edit" | "images" | "variants" | "analytics" | "danger";

/* ─────────── palette ─────────── */
const P = {
  green:      "#0f3f2f",
  greenLight: "#1b5e4a",
  greenDark:  "#0a2a1f",
  accent:     "#c8a75a",
  accentL:    "#d4b976",
  bg:         "#f5f5f4",
  card:       "#ffffff",
  border:     "#e7e5e4",
  muted:      "#a8a29e",
  text:       "#1c1917",
  sub:        "#57534e",
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
  if (p?.main_image) return p.main_image;
  if (p?.image_url)  return p.image_url;
  if (Array.isArray(p?.images) && p.images.length > 0) {
    const pri = p.images.find((i: any) => i?.is_primary);
    return pri?.image_url ?? p.images[0]?.image_url ?? p.images[0] ?? null;
  }
  return null;
}

/* ═══════════════════════════════ COMPONENT ═══════════════════════════════ */
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

  /* sticky toolbar scroll state */
  const [stickyVisible, setStickyVisible] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  /* lightbox */
  const [lightbox, setLightbox]   = useState<string | null>(null);

  /* edit form */
  const [editForm, setEditForm]   = useState<Record<string, any>>({});

  /* inventory modal */
  const [invModal, setInvModal]   = useState(false);
  const [invStock, setInvStock]   = useState("");
  const [invNote,  setInvNote]    = useState("");
  const [invMode,  setInvMode]    = useState<"set" | "adjust" | "incoming">("set");

  /* variant modal */
  const [varModal,  setVarModal]  = useState(false);
  const [varForm,   setVarForm]   = useState({ title: "", sku: "", price: "", stock: "", attributes: "" });
  const [editVarId, setEditVarId] = useState<string | null>(null);

  /* image modal */
  const [imgModal, setImgModal]   = useState(false);
  const [imgUrls,  setImgUrls]    = useState("");

  /* danger zone */
  const [dangerDeleteInput, setDangerDeleteInput] = useState("");
  const [dangerLoading,     setDangerLoading]     = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3800);
  };

  /* ── sticky scroll handler ── */
  useEffect(() => {
    const handler = () => {
      const top = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      setStickyVisible(top < 0);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* ── load ── */
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const p = await productsApi.get(id);
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
      const [analyticsRes, variantsRes] = await Promise.allSettled([
        productsApi.getAnalytics(id),
        productsApi.listVariants(id),
      ]);
      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value);
      if (variantsRes.status  === "fulfilled") setVariants(variantsRes.value ?? []);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load product", false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* ── actions ── */
  async function lifecycle(action: "publish" | "archive" | "draft" | "restore") {
    setSaving(true);
    try {
      await productsApi.lifecycle(id, action);
      showToast(`Product ${action}d successfully`);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Action failed", false);
    } finally { setSaving(false); }
  }

  async function handleDuplicate() {
    setSaving(true);
    try {
      const r = await productsApi.duplicate(id) as any;
      showToast(`Duplicated — new ID: ${r?.id}`);
    } catch (e: any) {
      showToast(e?.message ?? "Duplicate failed", false);
    } finally { setSaving(false); }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...editForm };
      ["price", "compare_price", "stock", "low_stock_threshold"].forEach(k => {
        if (payload[k] !== "" && payload[k] !== null) payload[k] = Number(payload[k]);
      });
      await productsApi.update(id, payload);
      showToast("Product updated");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Update failed", false);
    } finally { setSaving(false); }
  }

  async function updateInventory() {
    if (!invStock) return;
    setSaving(true);
    try {
      if (invMode === "set") {
        await productsApi.updateInventory(id, { stock: Number(invStock), note: invNote || "Manual update" });
      } else if (invMode === "adjust") {
        await adminApi.adjustInventory({ product_id: id, quantity: Number(invStock), note: invNote || "Manual adjustment" });
      } else {
        await adminApi.incomingInventory({ product_id: id, quantity: Number(invStock), note: invNote || "Incoming stock" });
      }
      setInvModal(false); setInvStock(""); setInvNote("");
      showToast("Inventory updated");
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Inventory update failed", false);
    } finally { setSaving(false); }
  }

  async function saveVariant() {
    if (!varForm.title || !varForm.price) { showToast("Title and price required", false); return; }
    setSaving(true);
    try {
      let attrs: Record<string, string> = {};
      try { attrs = varForm.attributes ? JSON.parse(varForm.attributes) : {}; }
      catch { showToast("Attributes must be valid JSON", false); setSaving(false); return; }
      if (editVarId) {
        await productsApi.updateVariant(editVarId, { title: varForm.title, sku: varForm.sku || undefined, price: Number(varForm.price), stock: Number(varForm.stock), attributes: attrs });
        showToast("Variant updated");
      } else {
        await productsApi.createVariant(id, { title: varForm.title, sku: varForm.sku || undefined, price: Number(varForm.price), stock: Number(varForm.stock), attributes: attrs });
        showToast("Variant created");
      }
      setVarModal(false); setVarForm({ title: "", sku: "", price: "", stock: "", attributes: "" }); setEditVarId(null);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Variant save failed", false);
    } finally { setSaving(false); }
  }

  async function deleteVariant(variantId: string) {
    if (!confirm("Delete this variant?")) return;
    try { await productsApi.deleteVariant(variantId); showToast("Variant deleted"); load(); }
    catch (e: any) { showToast(e?.message ?? "Delete failed", false); }
  }

  async function toggleVariant(variantId: string, active: boolean) {
    try { await productsApi.updateVariant(variantId, { is_active: !active } as any); showToast(`Variant ${active ? "deactivated" : "activated"}`); load(); }
    catch (e: any) { showToast(e?.message ?? "Failed", false); }
  }

  async function addImageUrls() {
    const urls = imgUrls.split("\n").map(u => u.trim()).filter(Boolean);
    if (!urls.length) { showToast("Enter at least one URL", false); return; }
    setSaving(true);
    try {
      await productsApi.bulkAddImages(id, { images: urls });
      setImgModal(false); setImgUrls("");
      showToast(`${urls.length} image(s) added`);
      load();
    } catch (e: any) {
      showToast(e?.message ?? "Image add failed", false);
    } finally { setSaving(false); }
  }

  async function setImagePrimary(imageId: string) {
    try { await productsApi.setImagePrimary(imageId); showToast("Primary image set"); load(); }
    catch (e: any) { showToast(e?.message ?? "Failed", false); }
  }

  async function setImagePosition(imageId: string, position: number) {
    try { await productsApi.setImagePosition(imageId, position); load(); }
    catch {}
  }

  async function deleteImage(imageId: string) {
    if (!confirm("Remove this image?")) return;
    try { await productsApi.deleteImage(imageId); showToast("Image removed"); load(); }
    catch (e: any) { showToast(e?.message ?? "Failed", false); }
  }

  async function handleSoftDelete() {
    if (!confirm("Soft delete this product? It can be restored later.")) return;
    try {
      await productsApi.softDelete(id);
      showToast("Product soft-deleted");
      setTimeout(() => router.push("/admin/products"), 1200);
    } catch (e: any) { showToast(e?.message ?? "Delete failed", false); }
  }

  async function handleHardDelete() {
    if (!product) return;
    if (dangerDeleteInput !== product.title) return;
    setDangerLoading(true);
    try {
      await productsApi.hardDelete(id);
      showToast("Product permanently deleted");
      setTimeout(() => router.push("/admin/products"), 1200);
    } catch (e: any) {
      showToast(e?.message ?? "Hard delete failed", false);
      setDangerLoading(false);
    }
  }

  /* ── loading / not found ── */
  if (loading) return <LoadingSkeleton />;
  if (!product) return (
    <div style={{ padding: 64, textAlign: "center", fontFamily: "DM Sans, system-ui" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: P.text }}>Product not found</div>
      <button onClick={() => router.push("/admin/products")} style={{ ...outlineBtn, marginTop: 18 }}>← Back to Products</button>
    </div>
  );

  const cfg    = STATUS_CFG[product.status] ?? STATUS_CFG.draft;
  const images: ProductImage[] = (product as any).images ?? [];
  const mainImg = getImg(product);
  const pricing = (product as any).pricing_status ?? "unpriced";
  const isUnpriced = !product.price || product.price === 0 || pricing === "unpriced";

  /* ─────────── RENDER ─────────── */
  return (
    <div style={{ fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif", background: P.bg, minHeight: "100vh", color: P.text }}>

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

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9990, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12 }} />
          <button style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "#fff", fontSize: 32, cursor: "pointer" }} onClick={() => setLightbox(null)}>×</button>
        </div>
      )}

      {/* ── STICKY TOOLBAR (appears on scroll) ── */}
      {stickyVisible && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 5000,
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${P.border}`, padding: "10px 28px",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)", animation: "slideIn 0.2s ease",
        }}>
          <button onClick={() => router.push("/admin/products")} style={{ ...ghostBtn, fontSize: 13 }}>← Products</button>
          <div style={{ fontSize: 14, fontWeight: 700, color: P.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.title}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />
            {cfg.label}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {product.status !== "active" && <button onClick={() => lifecycle("publish")} disabled={saving} style={{ ...stickyPrimaryBtn }}>▶ Publish</button>}
            {product.status === "active"  && <button onClick={() => lifecycle("archive")} disabled={saving} style={{ ...stickyPrimaryBtn, background: "#d97706" }}>⊟ Archive</button>}
            <button onClick={() => setTab("edit")} style={stickyOutlineBtn}>✎ Edit</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 28px" }}>

        {/* ── BREADCRUMB ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: P.muted }}>
          <button onClick={() => router.push("/admin")} style={crumbBtn}>Admin</button>
          <span>›</span>
          <button onClick={() => router.push("/admin/products")} style={crumbBtn}>Products</button>
          <span>›</span>
          <span style={{ color: P.text, fontWeight: 600, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.title}</span>
        </div>

        {/* ── MAIN HEADER ── */}
        <div ref={headerRef} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 20, marginBottom: 24, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            {/* Pricing status banner */}
            {isUnpriced && (
              <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <span style={{ fontWeight: 600, color: "#854d0e" }}>This product has no price set.</span>
                <button onClick={() => setTab("edit")} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid #fbbf24", background: "#fffbeb", color: "#92400e", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  Set Price →
                </button>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: P.text, letterSpacing: "-0.8px", margin: 0, lineHeight: 1.1, wordBreak: "break-word" }}>{product.title}</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 700, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
                {cfg.label}
              </span>
            </div>
            <p style={{ color: P.muted, fontSize: 13, margin: 0 }}>
              ID: <code style={{ background: P.bg, padding: "1px 7px", borderRadius: 5, fontSize: 12 }}>{product.id}</code>
              {product.sku && <> · SKU: <code style={{ background: P.bg, padding: "1px 7px", borderRadius: 5, fontSize: 12 }}>{product.sku}</code></>}
              {product.brand && <> · {product.brand}</>}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {product.status !== "active" && <button onClick={() => lifecycle("publish")} disabled={saving} style={{ ...primaryBtn, background: "#15803d" }}>▶ Publish</button>}
            {product.status === "active"  && <button onClick={() => lifecycle("archive")} disabled={saving} style={{ ...primaryBtn, background: "#d97706" }}>⊟ Archive</button>}
            <button onClick={() => lifecycle("draft")} disabled={saving || product.status === "draft"} style={outlineBtn}>Draft</button>
            <button onClick={handleDuplicate} disabled={saving} style={outlineBtn}>⎘ Duplicate</button>
          </div>
        </div>

        {/* ── HERO LAYOUT: Image sidebar + stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginBottom: 24, alignItems: "start" }}>

          {/* Primary image + thumbnail strip */}
          <div>
            <div style={{
              background: "#fff", borderRadius: 16, overflow: "hidden",
              border: `1px solid ${P.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}>
              <div style={{ aspectRatio: "1/1", overflow: "hidden", cursor: mainImg ? "zoom-in" : "default", background: P.bg }} onClick={() => mainImg && setLightbox(mainImg)}>
                {mainImg
                  ? <img src={mainImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "")} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: P.muted }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🖼</div>
                      <div style={{ fontSize: 13 }}>No image</div>
                    </div>
                }
              </div>
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div style={{ padding: "10px 10px", display: "flex", gap: 6, overflowX: "auto", background: "#fafaf9", borderTop: `1px solid ${P.border}` }}>
                  {[...images].sort((a, b) => a.position - b.position).map(img => (
                    <div key={img.id} style={{
                      width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, cursor: "pointer",
                      border: `2px solid ${img.is_primary ? P.green : P.border}`,
                      opacity: img.is_primary ? 1 : 0.7, transition: "all 0.2s",
                    }}
                      onClick={() => setLightbox(img.image_url)}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = img.is_primary ? "1" : "0.7")}
                    >
                      <img src={img.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setTab("images")} style={{ width: "100%", ...outlineBtn, marginTop: 10, justifyContent: "center", fontSize: 13 }}>
              🖼 Manage Images ({images.length})
            </button>
          </div>

          {/* Stats + quick info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {analytics && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Revenue Est.",  value: `R ${Number(analytics.revenue_estimate ?? 0).toLocaleString()}`, icon: "💰", color: P.green },
                  { label: "Units Sold",    value: analytics.sales ?? 0,                                            icon: "📦", color: P.greenLight },
                  { label: "In Stock",      value: analytics.stock ?? product.stock ?? 0,                          icon: "🏪", color: analytics.stock === 0 ? "#dc2626" : P.green },
                  { label: "Avg Rating",    value: analytics.rating ? `${analytics.rating}/5 ⭐` : "—",            icon: "⭐", color: "#d97706" },
                  { label: "Reviews",       value: analytics.rating_number ?? 0,                                   icon: "💬", color: "#7c3aed" },
                  { label: "Variants",      value: variants.length,                                                icon: "🔀", color: P.sub },
                ].map(s => (
                  <div key={s.label} style={{ background: "#fff", border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: P.muted, marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Price card */}
            <div style={{ background: P.greenDark, borderRadius: 14, padding: "18px 22px", color: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Selling Price</div>
              <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1px", color: P.accentL }}>
                R {Number(product.price ?? 0).toLocaleString()}
              </div>
              {product.compare_price && product.compare_price > product.price && (
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textDecoration: "line-through", marginTop: 2 }}>
                  R {Number(product.compare_price).toLocaleString()} compare price
                </div>
              )}
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button onClick={() => setInvModal(true)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📦 Adjust Stock</button>
                <button onClick={() => setTab("edit")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✎ Edit Price</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "#fff", border: `1px solid ${P.border}`, borderRadius: 12, padding: 4, overflowX: "auto", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          {([
            { key: "overview",  label: "Overview" },
            { key: "edit",      label: "✎ Edit" },
            { key: "images",    label: `🖼 Images (${images.length})` },
            { key: "variants",  label: `🔀 Variants (${variants.length})` },
            { key: "analytics", label: "📊 Analytics" },
            { key: "danger",    label: "☢ Danger Zone" },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: tab === t.key ? 700 : 400, whiteSpace: "nowrap",
              background: tab === t.key ? (t.key === "danger" ? "#dc2626" : P.green) : "transparent",
              color: tab === t.key ? "#fff" : t.key === "danger" ? "#dc2626" : P.sub,
              transition: "all 0.15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════ OVERVIEW TAB ══════════ */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="Product Info">
              <InfoGrid rows={[
                ["Title",            product.title],
                ["Price",            `R ${Number(product.price).toLocaleString()}`],
                ["Compare Price",    product.compare_price ? `R ${Number(product.compare_price).toLocaleString()}` : "—"],
                ["Stock",            product.stock],
                ["Low Stock At",     (product as any).low_stock_threshold ?? "—"],
                ["In Stock",         product.in_stock ? "✅ Yes" : "❌ No"],
                ["SKU",              product.sku ?? "—"],
                ["Brand",            product.brand ?? "—"],
              ]} />
            </Card>
            <Card title="Classification">
              <InfoGrid rows={[
                ["Category",         product.category ?? "—"],
                ["Main Category",    (product as any).main_category ?? "—"],
                ["Store",            (product as any).store ?? "—"],
                ["Parent ASIN",      (product as any).parent_asin ?? "—"],
                ["Status",           product.status],
                ["Pricing Status",   pricing],
                ["Created",          product.created_at ? new Date(product.created_at).toLocaleDateString("en-ZA") : "—"],
                ["Updated",          product.updated_at ? new Date(product.updated_at).toLocaleDateString("en-ZA") : "—"],
              ]} />
            </Card>
            {(product.short_description || product.description) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Card title="Description">
                  {product.short_description && <p style={{ fontSize: 14, color: P.sub, marginBottom: 10, fontWeight: 600, lineHeight: 1.6 }}>{product.short_description}</p>}
                  {product.description && <p style={{ fontSize: 13, color: P.muted, lineHeight: 1.8, margin: 0 }}>{product.description}</p>}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ══════════ EDIT TAB ══════════ */}
        {tab === "edit" && (
          <div style={{ display: "grid", gap: 16 }}>
            <Card title="Basic Info">
              <div style={{ display: "grid", gap: 14 }}>
                <FF label="Title *">
                  <input style={inp} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Product name" />
                </FF>
                <FF label="Short Description">
                  <input style={inp} value={editForm.short_description} onChange={e => setEditForm(p => ({ ...p, short_description: e.target.value }))} />
                </FF>
                <FF label="Description">
                  <textarea style={{ ...inp, minHeight: 100, resize: "vertical" }} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                </FF>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FF label="Category"><input style={inp} value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} /></FF>
                  <FF label="Brand"><input style={inp} value={editForm.brand} onChange={e => setEditForm(p => ({ ...p, brand: e.target.value }))} /></FF>
                  <FF label="Store"><input style={inp} value={editForm.store} onChange={e => setEditForm(p => ({ ...p, store: e.target.value }))} /></FF>
                  <FF label="SKU"><input style={inp} value={editForm.sku} onChange={e => setEditForm(p => ({ ...p, sku: e.target.value }))} /></FF>
                </div>
              </div>
            </Card>
            <Card title="Pricing">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="Price (R) *">
                  <input type="number" style={inp} value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} min={0} step={0.01} />
                </FF>
                <FF label="Compare Price (R)">
                  <input type="number" style={inp} value={editForm.compare_price} onChange={e => setEditForm(p => ({ ...p, compare_price: e.target.value }))} min={0} step={0.01} />
                </FF>
              </div>
            </Card>
            <Card title="Inventory">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="Stock Quantity">
                  <input type="number" style={inp} value={editForm.stock} onChange={e => setEditForm(p => ({ ...p, stock: e.target.value }))} min={0} />
                </FF>
                <FF label="Low Stock Threshold">
                  <input type="number" style={inp} value={editForm.low_stock_threshold} onChange={e => setEditForm(p => ({ ...p, low_stock_threshold: e.target.value }))} min={0} />
                </FF>
              </div>
            </Card>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveEdit} disabled={saving} style={{ ...primaryBtn, background: P.green }}>
                {saving ? "Saving…" : "💾 Save Changes"}
              </button>
              <button onClick={load} style={outlineBtn}>Discard</button>
            </div>
          </div>
        )}

        {/* ══════════ IMAGES TAB ══════════ */}
        {tab === "images" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: P.sub, margin: 0 }}>{images.length} image{images.length !== 1 ? "s" : ""} · Click to zoom · ★ to set primary</p>
              <button onClick={() => setImgModal(true)} style={{ ...primaryBtn, background: P.green }}>+ Add Image URLs</button>
            </div>

            {images.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 20px", background: "#fff", borderRadius: 14, border: `1px solid ${P.border}` }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🖼</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: P.sub, marginBottom: 6 }}>No images yet</div>
                <div style={{ fontSize: 13, color: P.muted, marginBottom: 16 }}>Add product images by providing image URLs.</div>
                <button onClick={() => setImgModal(true)} style={{ ...primaryBtn, background: P.green }}>+ Add Image URLs</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 18 }}>
                {[...images].sort((a, b) => a.position - b.position).map((img, idx) => (
                  <div key={img.id} style={{
                    background: "#fff", borderRadius: 14, overflow: "hidden",
                    border: `2.5px solid ${img.is_primary ? P.green : P.border}`,
                    boxShadow: img.is_primary ? `0 0 0 3px ${P.green}22` : "0 2px 8px rgba(0,0,0,0.05)",
                    position: "relative", transition: "all 0.2s",
                  }}>
                    {/* Primary badge */}
                    {img.is_primary && (
                      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, background: P.green, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 99, letterSpacing: "0.05em" }}>
                        ★ PRIMARY
                      </div>
                    )}
                    {/* Position badge */}
                    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6 }}>
                      #{idx + 1}
                    </div>

                    {/* Image */}
                    <div style={{ aspectRatio: "1/1", overflow: "hidden", cursor: "zoom-in" }} onClick={() => setLightbox(img.image_url)}>
                      <img src={img.image_url} alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "")}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>

                    {/* Actions */}
                    <div style={{ padding: "10px 10px 12px", display: "grid", gap: 6 }}>
                      {/* Copy URL */}
                      <button onClick={() => { navigator.clipboard.writeText(img.image_url); showToast("URL copied"); }}
                        style={{ ...smBtn, width: "100%", fontSize: 12 }}>📋 Copy URL</button>
                      <div style={{ display: "flex", gap: 5 }}>
                        {!img.is_primary && (
                          <button onClick={() => setImagePrimary(img.id)}
                            style={{ flex: 1, ...smBtn, color: "#92400e", borderColor: "#fde68a", background: "#fffbeb", fontWeight: 700 }}>
                            ★ Primary
                          </button>
                        )}
                        <button onClick={() => setImagePosition(img.id, Math.max(0, img.position - 1))}
                          style={{ ...smBtn, padding: "5px 8px" }} title="Move left">↑</button>
                        <button onClick={() => setImagePosition(img.id, img.position + 1)}
                          style={{ ...smBtn, padding: "5px 8px" }} title="Move right">↓</button>
                        <button onClick={() => deleteImage(img.id)}
                          style={{ ...smBtn, padding: "5px 8px", color: "#dc2626", borderColor: "#fca5a5" }} title="Delete">🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ VARIANTS TAB ══════════ */}
        {tab === "variants" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: P.sub, margin: 0 }}>{variants.length} variant{variants.length !== 1 ? "s" : ""}</p>
              <button onClick={() => { setEditVarId(null); setVarForm({ title: "", sku: "", price: "", stock: "", attributes: "" }); setVarModal(true); }} style={{ ...primaryBtn, background: P.green }}>
                + Add Variant
              </button>
            </div>
            {variants.length === 0 ? (
              <Empty icon="🔀" title="No variants" desc="Add size, color, or other variants for this product." />
            ) : (
              <Card title="">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                      {["Title", "SKU", "Attributes", "Price", "Stock", "Active", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: P.sub, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map(v => (
                      <tr key={v.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                        <td style={vtd}><span style={{ fontWeight: 700, color: P.text }}>{v.title}</span></td>
                        <td style={vtd}><span style={{ color: P.muted }}>{v.sku ?? "—"}</span></td>
                        <td style={vtd}>
                          {Object.entries(v.attributes ?? {}).map(([k, val]) => (
                            <span key={k} style={{ display: "inline-block", padding: "2px 8px", background: P.bg, borderRadius: 99, fontSize: 11, marginRight: 4, marginBottom: 2 }}>{k}: {val as string}</span>
                          ))}
                        </td>
                        <td style={vtd}><span style={{ fontWeight: 700, color: P.green }}>R {Number(v.price).toLocaleString()}</span></td>
                        <td style={vtd}>
                          <span style={{ color: v.stock === 0 ? "#dc2626" : v.stock < 10 ? "#d97706" : "#15803d", fontWeight: 700 }}>{v.stock}</span>
                        </td>
                        <td style={vtd}>
                          <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: v.is_active ? "#dcfce7" : P.bg, color: v.is_active ? "#15803d" : P.muted }}>
                            {v.is_active ? "Active" : "Off"}
                          </span>
                        </td>
                        <td style={vtd}>
                          <div style={{ display: "flex", gap: 5 }}>
                            <VBtn onClick={() => { setEditVarId(v.id); setVarForm({ title: v.title, sku: v.sku ?? "", price: String(v.price), stock: String(v.stock), attributes: JSON.stringify(v.attributes, null, 2) }); setVarModal(true); }}>Edit</VBtn>
                            <VBtn onClick={() => toggleVariant(v.id, v.is_active)} color={v.is_active ? "#d97706" : "#15803d"}>{v.is_active ? "Deactivate" : "Activate"}</VBtn>
                            <VBtn onClick={() => deleteVariant(v.id)} color="#dc2626">Delete</VBtn>
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

        {/* ══════════ ANALYTICS TAB ══════════ */}
        {tab === "analytics" && (
          !analytics
            ? <Empty icon="📊" title="Analytics unavailable" desc="Analytics data could not be loaded for this product." />
            : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
                  {[
                    { l: "Total Sales",   v: analytics.sales ?? 0 },
                    { l: "Revenue Est.",  v: `R ${Number(analytics.revenue_estimate ?? 0).toLocaleString()}` },
                    { l: "Current Stock", v: analytics.stock ?? 0 },
                    { l: "Avg Rating",    v: analytics.rating ? `${analytics.rating}/5` : "—" },
                    { l: "Review Count",  v: analytics.rating_number ?? 0 },
                  ].map(s => (
                    <div key={s.l} style={{ background: "#fff", border: `1px solid ${P.border}`, borderRadius: 12, padding: "16px 18px" }}>
                      <div style={{ fontSize: 11, color: P.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{s.l}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: P.text, letterSpacing: "-1px" }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {analytics.inventory_history && analytics.inventory_history.length > 0 && (
                  <Card title="Inventory History">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                          {["Type", "Before", "Change", "After", "Note", "Date"].map(h => (
                            <th key={h} style={{ padding: "9px 12px", fontSize: 11, fontWeight: 700, color: P.sub, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...analytics.inventory_history].reverse().map((e, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${P.border}` }}>
                            <td style={vtd}><span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: e.type === "incoming" ? "#dcfce7" : P.bg, color: e.type === "incoming" ? "#15803d" : P.sub }}>{e.type}</span></td>
                            <td style={vtd}><span style={{ color: P.muted }}>{e.before}</span></td>
                            <td style={vtd}><span style={{ fontWeight: 700, color: e.change >= 0 ? "#15803d" : "#dc2626" }}>{e.change >= 0 ? "+" : ""}{e.change}</span></td>
                            <td style={vtd}><span style={{ fontWeight: 700 }}>{e.after}</span></td>
                            <td style={vtd}><span style={{ color: P.muted }}>{e.note ?? "—"}</span></td>
                            <td style={vtd}><span style={{ color: P.muted, fontSize: 12 }}>{new Date(e.created_at).toLocaleString()}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}
              </div>
            )
        )}

        {/* ══════════ DANGER ZONE TAB ══════════ */}
        {tab === "danger" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${P.border}`, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: P.muted, margin: "0 0 18px" }}>Lifecycle Management</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {product.status !== "active" && (
                  <button onClick={() => lifecycle("publish")} disabled={saving} style={{ ...primaryBtn, background: "#15803d" }}>▶ Publish Product</button>
                )}
                <button onClick={() => lifecycle("archive")} disabled={saving || product.status === "archived"} style={{ ...primaryBtn, background: "#d97706" }}>⊟ Archive</button>
                <button onClick={() => lifecycle("draft")} disabled={saving || product.status === "draft"} style={outlineBtn}>📋 Move to Draft</button>
                {(product as any).is_deleted && (
                  <button onClick={() => lifecycle("restore")} disabled={saving} style={{ ...primaryBtn, background: "#15803d" }}>♻ Restore</button>
                )}
              </div>
            </div>

            {/* Soft Delete */}
            <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>🗑</span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#92400e", margin: "0 0 4px" }}>Soft Delete</h3>
                  <p style={{ fontSize: 14, color: "#b45309", margin: 0, lineHeight: 1.6 }}>
                    Hides this product from the storefront and all public listings. The data is retained and can be restored later from this page.
                  </p>
                </div>
              </div>
              <button onClick={handleSoftDelete} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#f97316", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                🗑 Soft Delete Product
              </button>
            </div>

            {/* Hard Delete */}
            <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
                <span style={{ fontSize: 28 }}>☠</span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#991b1b", margin: "0 0 4px" }}>Permanent Delete</h3>
                  <p style={{ fontSize: 14, color: "#b91c1c", margin: 0, lineHeight: 1.6 }}>
                    Permanently and irreversibly deletes this product, all its images, variants, and inventory history. <strong>This cannot be undone.</strong>
                  </p>
                </div>
              </div>
              <FF label={`Type the product title to confirm: "${product.title}"`}>
                <input
                  style={{ ...inp, borderColor: dangerDeleteInput === product.title ? "#dc2626" : P.border, maxWidth: 480, display: "block" }}
                  placeholder={product.title}
                  value={dangerDeleteInput}
                  onChange={e => setDangerDeleteInput(e.target.value)}
                />
              </FF>
              <button
                disabled={dangerDeleteInput !== product.title || dangerLoading}
                onClick={handleHardDelete}
                style={{
                  marginTop: 14, padding: "10px 22px", borderRadius: 9, border: "none", fontWeight: 800, fontSize: 14,
                  background: dangerDeleteInput === product.title ? "#dc2626" : "#f1f5f9",
                  color: dangerDeleteInput === product.title ? "#fff" : P.muted,
                  cursor: dangerDeleteInput === product.title ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}>
                {dangerLoading ? "Deleting…" : "☠ Permanently Delete Product"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ INVENTORY MODAL ══ */}
      {invModal && (
        <ModalShell title="Update Inventory" onClose={() => setInvModal(false)}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["set", "adjust", "incoming"] as const).map(m => (
              <button key={m} onClick={() => setInvMode(m)} style={{
                flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                background: invMode === m ? P.green : P.bg,
                color: invMode === m ? "#fff" : P.sub,
                cursor: "pointer", fontSize: 13, fontWeight: invMode === m ? 700 : 400, textTransform: "capitalize",
              }}>{m}</button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: P.muted, marginBottom: 14 }}>
            {invMode === "set" ? "Overwrite stock to this exact value." : invMode === "adjust" ? "Add or subtract from current stock (e.g. -10 or +20)." : "Record incoming stock received."}
          </p>
          <FF label={invMode === "set" ? "New Stock Value" : invMode === "adjust" ? "Adjustment (+ or -)" : "Incoming Quantity"}>
            <input type="number" style={{ ...inp, width: "100%" }} value={invStock} onChange={e => setInvStock(e.target.value)} placeholder={invMode === "adjust" ? "-10 or +50" : "e.g. 50"} autoFocus />
          </FF>
          <FF label="Note (optional)">
            <input style={{ ...inp, width: "100%" }} value={invNote} onChange={e => setInvNote(e.target.value)} placeholder="Reason for update" />
          </FF>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={updateInventory} disabled={!invStock || saving} style={{ ...primaryBtn, flex: 1, background: P.green }}>{saving ? "Saving…" : "Update"}</button>
            <button onClick={() => setInvModal(false)} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
          </div>
        </ModalShell>
      )}

      {/* ══ VARIANT MODAL ══ */}
      {varModal && (
        <ModalShell title={editVarId ? "Edit Variant" : "Add Variant"} onClose={() => setVarModal(false)}>
          <FF label="Title *"><input style={{ ...inp, width: "100%" }} value={varForm.title} onChange={e => setVarForm(p => ({ ...p, title: e.target.value }))} autoFocus /></FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FF label="Price (R) *"><input type="number" style={{ ...inp, width: "100%" }} value={varForm.price} onChange={e => setVarForm(p => ({ ...p, price: e.target.value }))} min={0} /></FF>
            <FF label="Stock"><input type="number" style={{ ...inp, width: "100%" }} value={varForm.stock} onChange={e => setVarForm(p => ({ ...p, stock: e.target.value }))} min={0} /></FF>
          </div>
          <FF label="SKU"><input style={{ ...inp, width: "100%" }} value={varForm.sku} onChange={e => setVarForm(p => ({ ...p, sku: e.target.value }))} placeholder="Optional" /></FF>
          <FF label='Attributes (JSON e.g. {"color":"red"})'>
            <textarea style={{ ...inp, minHeight: 70, resize: "vertical", fontFamily: "monospace", fontSize: 12, width: "100%" }} value={varForm.attributes} onChange={e => setVarForm(p => ({ ...p, attributes: e.target.value }))} />
          </FF>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={saveVariant} disabled={saving} style={{ ...primaryBtn, flex: 1, background: P.green }}>{saving ? "Saving…" : editVarId ? "Update Variant" : "Create Variant"}</button>
            <button onClick={() => setVarModal(false)} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
          </div>
        </ModalShell>
      )}

      {/* ══ IMAGE ADD MODAL ══ */}
      {imgModal && (
        <ModalShell title="Add Image URLs" onClose={() => setImgModal(false)}>
          <p style={{ fontSize: 13, color: P.sub, marginBottom: 12 }}>Enter one image URL per line. They will be appended to the existing gallery.</p>
          <textarea
            style={{ ...inp, minHeight: 130, resize: "vertical", fontFamily: "monospace", fontSize: 12, width: "100%" }}
            value={imgUrls}
            onChange={e => setImgUrls(e.target.value)}
            placeholder={"https://cdn.example.com/img1.jpg\nhttps://cdn.example.com/img2.jpg"}
            autoFocus />
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={addImageUrls} disabled={saving} style={{ ...primaryBtn, flex: 1, background: P.green }}>{saving ? "Adding…" : "Add Images"}</button>
            <button onClick={() => setImgModal(false)} style={{ ...outlineBtn, flex: 1 }}>Cancel</button>
          </div>
        </ModalShell>
      )}

      <style>{`
        @keyframes slideIn { from{transform:translateY(-12px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        select:focus, input:focus, textarea:focus { outline: 2px solid #0f3f2f; outline-offset: 0; border-color: transparent; }
      `}</style>
    </div>
  );
}

/* ─────────── sub-components ─────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid #e7e5e4`, borderRadius: 14, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      {title && <h3 style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px" }}>{title}</h3>}
      {children}
    </div>
  );
}

function InfoGrid({ rows }: { rows: [any, any][] }) {
  return (
    <div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f4", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#a8a29e", flexShrink: 0 }}>{k}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1c1917", textAlign: "right", wordBreak: "break-all" }}>{String(v ?? "—")}</span>
        </div>
      ))}
    </div>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#57534e", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 8000 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, maxWidth: 460, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#a8a29e", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ textAlign: "center", padding: "70px 20px", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14 }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#a8a29e" }}>{desc}</div>
    </div>
  );
}

function VBtn({ onClick, color = "#57534e", children }: any) {
  return (
    <button onClick={onClick} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${color}33`, background: `${color}0d`, color, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{children}</button>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 40, fontFamily: "DM Sans, system-ui", maxWidth: 1200, margin: "0 auto" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: 18, borderRadius: 6, background: "#f5f5f4", marginBottom: 14, width: `${85 - i * 8}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

/* ─────────── style constants ─────────── */
const inp: React.CSSProperties        = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #e7e5e4", fontSize: 14, boxSizing: "border-box", background: "#fff", color: "#1c1917" };
const primaryBtn: React.CSSProperties  = { padding: "9px 20px", borderRadius: 9, border: "none", background: "#0f3f2f", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" };
const outlineBtn: React.CSSProperties  = { padding: "9px 16px", borderRadius: 9, border: "1px solid #e7e5e4", background: "#fff", color: "#44403c", cursor: "pointer", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" };
const smBtn: React.CSSProperties       = { padding: "6px 10px", borderRadius: 7, border: "1px solid #e7e5e4", background: "#f5f5f4", cursor: "pointer", fontSize: 12, color: "#44403c", fontWeight: 500 };
const ghostBtn: React.CSSProperties    = { background: "none", border: "none", color: "#a8a29e", cursor: "pointer", fontSize: 14, padding: 0, fontWeight: 500 };
const crumbBtn: React.CSSProperties    = { background: "none", border: "none", color: "#a8a29e", cursor: "pointer", fontSize: 13, padding: 0, fontWeight: 500, textDecoration: "underline" };
const stickyPrimaryBtn: React.CSSProperties = { padding: "7px 16px", borderRadius: 8, border: "none", background: "#0f3f2f", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 };
const stickyOutlineBtn: React.CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff", color: "#44403c", cursor: "pointer", fontSize: 13, fontWeight: 500 };
const vtd: React.CSSProperties          = { padding: "10px 12px", verticalAlign: "middle" };