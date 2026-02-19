"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { productsApi, adminApi } from "@/lib/api";
import type { Store } from "@/lib/types";

type Step = "basic" | "pricing" | "inventory" | "images" | "review";
const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "basic",     label: "Basic Info",  icon: "1" },
  { key: "pricing",   label: "Pricing",     icon: "2" },
  { key: "inventory", label: "Inventory",   icon: "3" },
  { key: "images",    label: "Images",      icon: "4" },
  { key: "review",    label: "Review",      icon: "5" },
];

type Form = {
  title:             string;
  short_description: string;
  description:       string;
  category:          string;
  brand:             string;
  store:             string;
  sku:               string;
  price:             string;
  compare_price:     string;
  status:            string;
  stock:             string;
  low_stock_threshold: string;
  image_urls:        string;
};

const INIT: Form = {
  title: "", short_description: "", description: "",
  category: "", brand: "", store: "", sku: "",
  price: "", compare_price: "",
  status: "draft", stock: "0", low_stock_threshold: "10",
  image_urls: "",
};

export default function NewProductPage() {
  const router = useRouter();

  const [step,    setStep]    = useState<Step>("basic");
  const [form,    setForm]    = useState<Form>(INIT);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Partial<Record<keyof Form, string>>>({});
  const [stores,  setStores]  = useState<Store[]>([]);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [created, setCreated] = useState<{ id: string; title: string } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    adminApi.listStores().then((r: any) => setStores(r ?? [])).catch(() => {});
  }, []);

  function set(field: keyof Form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  const stepIndex   = STEPS.findIndex((s) => s.key === step);
  const isFirst     = stepIndex === 0;
  const isLast      = stepIndex === STEPS.length - 1;
  const isReview    = step === "review";

  function validateStep(s: Step): boolean {
    const errs: Partial<Record<keyof Form, string>> = {};
    if (s === "basic") {
      if (!form.title.trim()) errs.title = "Title is required";
    }
    if (s === "pricing") {
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) errs.price = "Valid price required";
      if (form.compare_price && isNaN(Number(form.compare_price))) errs.compare_price = "Invalid compare price";
    }
    if (s === "inventory") {
      if (form.stock !== "" && isNaN(Number(form.stock))) errs.stock = "Must be a number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    const i = STEPS.findIndex((s) => s.key === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].key);
  }

  function prev() {
    const i = STEPS.findIndex((s) => s.key === step);
    if (i > 0) setStep(STEPS[i - 1].key);
  }

  async function handleSubmit() {
    if (!validateStep("basic") || !validateStep("pricing") || !validateStep("inventory")) {
      showToast("Please fix errors before submitting", false);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title:             form.title.trim(),
        short_description: form.short_description.trim() || undefined,
        description:       form.description.trim() || undefined,
        category:          form.category.trim() || undefined,
        brand:             form.brand.trim() || undefined,
        store:             form.store.trim() || undefined,
        sku:               form.sku.trim() || undefined,
        price:             Number(form.price),
        compare_price:     form.compare_price ? Number(form.compare_price) : undefined,
        status:            form.status,
        stock:             form.stock !== "" ? Number(form.stock) : 0,
        low_stock_threshold: form.low_stock_threshold ? Number(form.low_stock_threshold) : 10,
      };

      const result = await productsApi.create(payload) as any;
      const newId = result?.id ?? "";

      // Add images if any provided
      const urls = form.image_urls.split("\n").map((u) => u.trim()).filter(Boolean);
      if (urls.length > 0 && newId) {
        try {
          await productsApi.bulkAddImages(newId, { images: urls });
        } catch {}
      }

      setCreated({ id: newId, title: result?.title ?? form.title });
      showToast("Product created successfully!");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to create product", false);
    } finally {
      setSaving(false);
    }
  }

  const completionPct = Math.round(
    (Object.entries(form).filter(([k, v]) =>
      v !== "" && v !== "0" && v !== "draft" && k !== "low_stock_threshold" && k !== "image_urls"
    ).length / 10) * 100
  );

  // ── SUCCESS SCREEN ────────────────────────────────────
  if (created) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Product Created!</h2>
          <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28 }}>
            <strong style={{ color: "#0f172a" }}>{created.title}</strong> has been created successfully.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push(`/admin/products/${created.id}`)} style={primaryBtn}>
              Open Product →
            </button>
            <button onClick={() => { setForm(INIT); setStep("basic"); setCreated(null); }} style={outlineBtn}>
              Create Another
            </button>
            <button onClick={() => router.push("/admin/products")} style={outlineBtn}>
              Back to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: toast.ok ? "#0f172a" : "#dc2626", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", animation: "slideIn 0.2s ease" }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px" }}>
        {/* ── HEADER ── */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => router.push("/admin/products")} style={ghostBtn}>← Products</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>New Product</h1>
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Fill in product details. You can always update later.</p>
            </div>
            {/* Completion bar */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Completeness {completionPct}%</div>
              <div style={{ width: 160, height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${completionPct}%`, height: "100%", background: completionPct > 70 ? "#22c55e" : completionPct > 40 ? "#f59e0b" : "#94a3b8", borderRadius: 99, transition: "width 0.3s" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP PROGRESS ── */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28, overflowX: "auto" }}>
          {STEPS.map((s, i) => {
            const done    = STEPS.findIndex((x) => x.key === step) > i;
            const current = s.key === step;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => setStep(s.key)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", flex: 1, padding: "8px 4px" }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: current ? "#0f172a" : done ? "#22c55e" : "#e2e8f0",
                    color: current || done ? "#fff" : "#94a3b8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: done ? 16 : 13, fontWeight: 700, transition: "all 0.2s",
                  }}>
                    {done ? "✓" : s.icon}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: current ? 700 : 400, color: current ? "#0f172a" : done ? "#22c55e" : "#94a3b8", whiteSpace: "nowrap" }}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{ height: 2, flex: 1, background: done ? "#22c55e" : "#e2e8f0", marginBottom: 20, transition: "background 0.3s" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── STEP CONTENT ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28, marginBottom: 20 }}>

          {/* BASIC INFO */}
          {step === "basic" && (
            <div>
              <StepTitle title="Basic Information" desc="Name, description and classification" />
              <Field label="Product Title *" error={errors.title}>
                <input style={err(errors.title)} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Sony WH-1000XM5 Wireless Headphones" autoFocus />
              </Field>
              <Field label="Short Description">
                <input style={inputStyle} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="One-line summary for product cards" />
              </Field>
              <Field label="Full Description">
                <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Detailed product description, features, and benefits…" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Category">
                  <input style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Electronics" />
                </Field>
                <Field label="Brand">
                  <input style={inputStyle} value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Sony" />
                </Field>
                <Field label="Store">
                  {stores.length > 0 ? (
                    <select style={inputStyle} value={form.store} onChange={(e) => set("store", e.target.value)}>
                      <option value="">— Select store —</option>
                      {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : (
                    <input style={inputStyle} value={form.store} onChange={(e) => set("store", e.target.value)} placeholder="Store ID" />
                  )}
                </Field>
                <Field label="SKU">
                  <input style={inputStyle} value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Stock-keeping unit" />
                </Field>
              </div>
            </div>
          )}

          {/* PRICING */}
          {step === "pricing" && (
            <div>
              <StepTitle title="Pricing" desc="Set the selling price and optional compare price" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Selling Price (R) *" error={errors.price}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontWeight: 600 }}>R</span>
                    <input type="number" style={{ ...err(errors.price), paddingLeft: 26 }} value={form.price} onChange={(e) => set("price", e.target.value)} min={0} step={0.01} placeholder="0.00" autoFocus />
                  </div>
                </Field>
                <Field label="Compare Price (R)" error={errors.compare_price}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontWeight: 600 }}>R</span>
                    <input type="number" style={{ ...err(errors.compare_price), paddingLeft: 26 }} value={form.compare_price} onChange={(e) => set("compare_price", e.target.value)} min={0} step={0.01} placeholder="Crossed-out price" />
                  </div>
                </Field>
              </div>

              {/* Discount preview */}
              {form.price && form.compare_price && Number(form.compare_price) > Number(form.price) && (
                <div style={{ marginTop: 4, padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                  <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                    🏷 {Math.round((1 - Number(form.price) / Number(form.compare_price)) * 100)}% discount — customers save R {(Number(form.compare_price) - Number(form.price)).toLocaleString()}
                  </span>
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <Field label="Initial Status">
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { v: "draft",  label: "Draft",  desc: "Hidden from store",  icon: "📝" },
                      { v: "active", label: "Active", desc: "Live immediately",   icon: "✅" },
                    ].map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => set("status", o.v)}
                        style={{ flex: 1, padding: "14px 16px", borderRadius: 10, border: `2px solid ${form.status === o.v ? "#0f172a" : "#e2e8f0"}`, background: form.status === o.v ? "#0f172a" : "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{o.icon}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: form.status === o.v ? "#fff" : "#0f172a" }}>{o.label}</div>
                        <div style={{ fontSize: 12, color: form.status === o.v ? "#94a3b8" : "#94a3b8" }}>{o.desc}</div>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {step === "inventory" && (
            <div>
              <StepTitle title="Inventory" desc="Set initial stock levels" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Initial Stock Quantity" error={errors.stock}>
                  <input type="number" style={err(errors.stock)} value={form.stock} onChange={(e) => set("stock", e.target.value)} min={0} placeholder="0" autoFocus />
                </Field>
                <Field label="Low Stock Threshold">
                  <input type="number" style={inputStyle} value={form.low_stock_threshold} onChange={(e) => set("low_stock_threshold", e.target.value)} min={0} placeholder="10" />
                </Field>
              </div>
              <div style={{ marginTop: 8, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  💡 You can also adjust inventory later from the product detail page using "Set", "Adjust", or "Incoming" modes.
                </p>
              </div>
            </div>
          )}

          {/* IMAGES */}
          {step === "images" && (
            <div>
              <StepTitle title="Product Images" desc="Add image URLs (one per line) — you can also add/manage images after creating the product" />
              <Field label="Image URLs (optional)">
                <textarea
                  style={{ ...inputStyle, minHeight: 130, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
                  value={form.image_urls}
                  onChange={(e) => set("image_urls", e.target.value)}
                  placeholder={"https://cdn.example.com/product-1.jpg\nhttps://cdn.example.com/product-2.jpg"}
                />
              </Field>
              {/* Preview thumbnails */}
              {form.image_urls && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  {form.image_urls.split("\n").filter((u) => u.trim().startsWith("http")).map((url, i) => (
                    <div key={i} style={{ width: 80, height: 80, borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden", background: "#f1f5f9" }}>
                      <img src={url.trim()} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEW */}
          {step === "review" && (
            <div>
              <StepTitle title="Review & Create" desc="Confirm product details before creating" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <ReviewSection title="Basic Info" items={[
                  ["Title",       form.title || "—"],
                  ["Category",    form.category || "—"],
                  ["Brand",       form.brand || "—"],
                  ["SKU",         form.sku || "—"],
                  ["Store",       form.store || "—"],
                ]} />
                <ReviewSection title="Pricing & Status" items={[
                  ["Price",           form.price ? `R ${Number(form.price).toLocaleString()}` : "—"],
                  ["Compare Price",   form.compare_price ? `R ${Number(form.compare_price).toLocaleString()}` : "—"],
                  ["Status",          form.status],
                  ["Stock",           form.stock || "0"],
                  ["Low Stock At",    form.low_stock_threshold || "10"],
                ]} />
              </div>
              {form.description && (
                <div style={{ marginTop: 16, padding: 14, background: "#f8fafc", borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" }}>Description</div>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>{form.description.slice(0, 200)}{form.description.length > 200 ? "…" : ""}</p>
                </div>
              )}
              {form.image_urls && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" }}>Images</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {form.image_urls.split("\n").filter((u) => u.trim().startsWith("http")).slice(0, 5).map((url, i) => (
                      <div key={i} style={{ width: 60, height: 60, borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden", background: "#f1f5f9" }}>
                        <img src={url.trim()} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── NAV BUTTONS ── */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            {!isFirst && (
              <button onClick={prev} style={outlineBtn}>← Back</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => router.push("/admin/products")} style={{ ...outlineBtn, color: "#64748b" }}>Cancel</button>
            {!isLast ? (
              <button onClick={next} style={primaryBtn}>Continue →</button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtn, background: saving ? "#475569" : "#0f172a", minWidth: 140 }}>
                {saving ? "Creating…" : "🚀 Create Product"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
        select:focus, input:focus, textarea:focus { outline: 2px solid #0f172a; outline-offset: 0; border-color: transparent; }
      `}</style>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function StepTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{desc}</p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: error ? "#dc2626" : "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function ReviewSection({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      {items.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{k}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box", background: "#fff" };
function err(e?: string): React.CSSProperties { return { ...inputStyle, borderColor: e ? "#fca5a5" : "#e2e8f0" }; }
const primaryBtn: React.CSSProperties = { padding: "10px 22px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const outlineBtn: React.CSSProperties = { padding: "10px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 14, fontWeight: 500 };
const ghostBtn:   React.CSSProperties = { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0 };