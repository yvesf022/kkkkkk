// FILE: app/admin/products/bulk-upload/page.tsx  (Admin BULK UPLOAD)
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { bulkUploadApi } from "@/lib/api";

type ValidationResult = {
  total_rows: number;
  valid:      boolean;
  errors:     { row: number; field: string; error: string }[];
  warnings:   { row: number; field: string; warning: string }[];
};

type PreviewRow = {
  title:        string;
  price:        string;
  category:     string;
  stock:        string;
  parent_asin?: string;
  store?:       string;
};

type PreviewResult = {
  total_rows: number;
  preview:    PreviewRow[];
};

type UploadResult = {
  // Backend returns: upload_id, total, successful, failed, status, errors (list)
  upload_id?:  string;
  total?:      number;
  successful?: number;
  failed?:     number;
  status?:     string;
  errors?:     { row: number; title: string; error: string }[];
  message?:    string;
};

type Phase = "idle" | "validating" | "previewing" | "uploading" | "done" | "error";

export default function BulkUploadPage() {
  const router = useRouter();

  const [file,       setFile]       = useState<File | null>(null);
  const [drag,       setDrag]       = useState(false);
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [progress,   setProgress]   = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview,    setPreview]    = useState<PreviewResult | null>(null);
  const [uploadRes,  setUploadRes]  = useState<UploadResult | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<"errors" | "warnings">("errors");
  // FIX #7: Track whether the format guide is collapsed (so it can always be accessed)
  const [guideOpen,  setGuideOpen]  = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  function clearState() {
    setValidation(null);
    setPreview(null);
    setUploadRes(null);
    setErrorMsg(null);
    setProgress(0);
    setPhase("idle");
  }

  function handleFileChange(f: File | null) {
    if (!f) return;
    if (!f.name.endsWith(".csv")) { setErrorMsg("Only CSV files are supported"); return; }
    setFile(f);
    clearState();
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  }, []);

  const simulateProgress = (target: number, duration: number, cb?: () => void) => {
    const step = target / (duration / 50);
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + step, target);
        if (next >= target) { clearInterval(interval); cb?.(); }
        return next;
      });
    }, 50);
  };

  async function validate() {
    if (!file) return;
    setPhase("validating");
    setProgress(0);
    setErrorMsg(null);
    simulateProgress(85, 1200);
    try {
      const data = await bulkUploadApi.validate(file) as ValidationResult;
      setProgress(100);
      setValidation(data);
      setPhase("idle");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Validation failed");
      setPhase("error");
    }
  }

  async function previewFile() {
    if (!file) return;
    setPhase("previewing");
    setProgress(0);
    setErrorMsg(null);
    simulateProgress(80, 1000);
    try {
      const data = await bulkUploadApi.preview(file) as PreviewResult;
      setProgress(100);
      setPreview(data);
      setPhase("idle");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Preview failed");
      setPhase("error");
    }
  }

  async function upload() {
    if (!file) return;
    if (!confirm(`Import all products from "${file.name}"? This will create or update products.`)) return;
    setPhase("uploading");
    setProgress(0);
    setErrorMsg(null);
    simulateProgress(90, 3000);
    try {
      const result = await bulkUploadApi.upload(file) as UploadResult;
      setProgress(100);
      setUploadRes(result);
      setPhase("done");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Upload failed");
      setPhase("error");
    }
  }

  const isWorking = phase === "validating" || phase === "previewing" || phase === "uploading";
  const phaseLabel: Record<Phase, string> = {
    idle:       "",
    validating: "Validating CSV…",
    previewing: "Loading preview…",
    uploading:  "Uploading products…",
    done:       "Upload complete",
    error:      "Something went wrong",
  };

  if (phase === "done" && uploadRes) {
    const hasErrors = (uploadRes.failed ?? 0) > 0;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{hasErrors ? "⚠️" : "🎉"}</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Upload Complete</h2>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
            {[
              { label: "Imported", value: uploadRes.successful ?? 0, color: "#15803d", bg: "#dcfce7" },
              { label: "Total",    value: uploadRes.total     ?? 0, color: "#1d4ed8", bg: "#dbeafe" },
              { label: "Failed",   value: uploadRes.failed    ?? 0, color: "#dc2626", bg: "#fee2e2" },
            ].map((s) => (
              <div key={s.label} style={{ padding: "14px 24px", borderRadius: 12, background: s.bg, minWidth: 100 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {uploadRes.message && <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>{uploadRes.message}</p>}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/admin/products")} style={primaryBtn}>View Products →</button>
            <button onClick={() => { setFile(null); clearState(); }} style={outlineBtn}>Upload Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => router.push("/admin/products")} style={ghostBtn}>← Products</button>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginTop: 10 }}>Bulk Upload Products</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Upload a CSV to create or update products. Validate and preview before importing.</p>
        </div>

        {/* CSV FORMAT GUIDE — Always visible, collapsible, Amazon-level field reference */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
          <button
            onClick={() => setGuideOpen(o => !o)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>📋 CSV Format Guide — Full Product Specification</span>
            <span style={{ fontSize: 18, color: "#94a3b8", lineHeight: 1 }}>{guideOpen ? "▲" : "▼"}</span>
          </button>
          {guideOpen && (
            <div style={{ padding: "0 20px 20px", overflowX: "auto" }}>
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #86efac", fontSize: 13, color: "#15803d" }}>
                <strong>✓ Lenient upload policy:</strong> Only <strong>title</strong> and <strong>price</strong> are required. All other fields are optional — missing or invalid values are simply set to defaults. Products are always imported regardless of optional field issues.
              </div>

              <h4 style={sectionHead}>Core Fields</h4>
              <GuideTable rows={[
                ["title",              "★ Required", "string",  "Sony WH-1000XM5 Wireless Headphones",          "Full product name — include brand, model and variant for best search results."],
                ["price",              "★ Required", "number",  "1499.99",                                      "Selling price in store currency (no symbol). Decimals allowed."],
                ["compare_price",      "Optional",   "number",  "1999.99",                                      "Original/crossed-out price. Must be higher than price to display a discount badge."],
                ["stock",              "Optional",   "integer", "50",                                           "Units in stock. Defaults to 0."],
                ["status",             "Optional",   "string",  "active",                                       "active | draft | inactive | archived | discontinued. Defaults to draft."],
                ["sku",                "Optional",   "string",  "SONY-WH1000XM5-BLK",                          "Stock-keeping unit. Must be unique per product if provided."],
              ]} />

              <h4 style={{ ...sectionHead, marginTop: 16 }}>Identity & Categorisation</h4>
              <GuideTable rows={[
                ["brand",              "Optional",   "string",  "Sony",                                         "Brand or manufacturer name."],
                ["category",           "Optional",   "string",  "Electronics > Audio > Headphones",             "Category path. Use > for hierarchy levels."],
                ["main_category",      "Optional",   "string",  "Electronics",                                  "Top-level category for navigation menus."],
                ["store",              "Optional",   "string",  "main-store",                                   "Store slug or ID the product belongs to."],
                ["parent_asin",        "Optional",   "string",  "B09XS7JWHH",                                   "Amazon ASIN or parent product ID for grouping variants together."],
                ["tags",               "Optional",   "string",  "wireless,noise-cancelling,premium",            "Comma-separated tags for search and filtering."],
              ]} />

              <h4 style={{ ...sectionHead, marginTop: 16 }}>Descriptions & Content</h4>
              <GuideTable rows={[
                ["short_description",  "Optional",   "string",  "Industry-leading noise cancellation",          "One-line summary shown on product cards and search results."],
                ["description",        "Optional",   "string",  "Experience the next level of silence...",      "Full product description. HTML supported — wrap in quotes if it contains commas."],
                ["features",           "Optional",   "string",  "30hr battery|Multipoint|LDAC",                 "Pipe-separated (|) feature bullet points shown on the product page."],
                ["bullet_1",           "Optional",   "string",  "Up to 30-hour battery life",                   "Individual bullet points. bullet_1 through bullet_5 supported."],
                ["bullet_2",           "Optional",   "string",  "Industry-leading noise cancellation",          ""],
                ["bullet_3",           "Optional",   "string",  "Crystal clear hands-free calling",             ""],
              ]} />

              <h4 style={{ ...sectionHead, marginTop: 16 }}>Physical Attributes & Dimensions</h4>
              <GuideTable rows={[
                ["weight",             "Optional",   "number",  "0.254",                                        "Product weight in kg. Used for shipping cost calculation."],
                ["weight_unit",        "Optional",   "string",  "kg",                                           "kg | g | lb | oz. Defaults to kg."],
                ["length",             "Optional",   "number",  "18.5",                                         "Product length in cm."],
                ["width",              "Optional",   "number",  "16.0",                                         "Product width in cm."],
                ["height",             "Optional",   "number",  "8.5",                                          "Product height / depth in cm."],
                ["dimension_unit",     "Optional",   "string",  "cm",                                           "cm | mm | in. Defaults to cm."],
                ["color",              "Optional",   "string",  "Midnight Black",                               "Primary colour — used for filtering and variant labelling."],
                ["size",               "Optional",   "string",  "One Size",                                     "Size label (e.g. S / M / L / XL or 42 for shoes)."],
                ["material",           "Optional",   "string",  "Aluminium, Synthetic Leather",                 "Material composition."],
                ["package_contents",   "Optional",   "string",  "Headphones, USB-C cable, Case",                "What is in the box, comma-separated."],
              ]} />

              <h4 style={{ ...sectionHead, marginTop: 16 }}>Images (up to 8 per product)</h4>
              <GuideTable rows={[
                ["image_url",          "Optional",   "URL",     "https://cdn.example.com/product-main.jpg",     "Main product image. Must be a publicly accessible HTTPS URL."],
                ["image_url_2",        "Optional",   "URL",     "https://cdn.example.com/product-side.jpg",     "Second product image."],
                ["image_url_3",        "Optional",   "URL",     "https://cdn.example.com/product-back.jpg",     "Third product image."],
                ["image_url_4",        "Optional",   "URL",     "https://cdn.example.com/product-detail.jpg",   "Fourth product image (close-up / detail shot)."],
                ["image_url_5",        "Optional",   "URL",     "https://cdn.example.com/lifestyle.jpg",        "Fifth image (lifestyle / in-use)."],
                ["image_url_6",        "Optional",   "URL",     "https://cdn.example.com/angle.jpg",            "Sixth image."],
                ["image_url_7",        "Optional",   "URL",     "https://cdn.example.com/scale.jpg",            "Seventh image."],
                ["image_url_8",        "Optional",   "URL",     "https://cdn.example.com/packaging.jpg",        "Eighth image (packaging shot)."],
              ]} />

              <h4 style={{ ...sectionHead, marginTop: 16 }}>Technical Specifications</h4>
              <GuideTable rows={[
                ["spec_connectivity",  "Optional",   "string",  "Bluetooth 5.2, NFC, 3.5mm jack",               "Any spec_* column becomes a labelled spec row on the product page."],
                ["spec_battery_life",  "Optional",   "string",  "Up to 30 hours (ANC on)",                      "Column name after spec_ is displayed as the label (e.g. Battery Life)."],
                ["spec_driver_size",   "Optional",   "string",  "40mm",                                         "Add as many spec_* columns as your product needs."],
                ["model_number",       "Optional",   "string",  "WH-1000XM5/B",                                 "Manufacturer model number."],
                ["part_number",        "Optional",   "string",  "WH1000XM5B",                                   "Manufacturer part number / MPN."],
                ["country_of_origin",  "Optional",   "string",  "Japan",                                        "Country of manufacture."],
                ["warranty",           "Optional",   "string",  "1 year manufacturer warranty",                 "Warranty description shown on the product page."],
              ]} />

              <h4 style={{ ...sectionHead, marginTop: 16 }}>Inventory & Fulfilment</h4>
              <GuideTable rows={[
                ["low_stock_threshold","Optional",   "integer", "5",                                            "Admin low-stock alert threshold."],
                ["fulfillment_type",   "Optional",   "string",  "merchant",                                     "merchant | dropship | print-on-demand"],
                ["supplier",           "Optional",   "string",  "Sony Africa",                                  "Supplier name for internal reference."],
                ["lead_time_days",     "Optional",   "integer", "3",                                            "Days between order and dispatch."],
                ["min_order_qty",      "Optional",   "integer", "1",                                            "Minimum order quantity."],
                ["max_order_qty",      "Optional",   "integer", "5",                                            "Maximum quantity per order."],
              ]} />

              <h4 style={{ ...sectionHead, marginTop: 16 }}>Pricing & Tax</h4>
              <GuideTable rows={[
                ["cost_price",         "Optional",   "number",  "800.00",                                       "Wholesale / cost price. Never shown publicly — used for margin reporting."],
                ["tax_class",          "Optional",   "string",  "standard",                                     "standard | zero-rated | exempt"],
                ["vat_included",       "Optional",   "boolean", "true",                                         "Whether the listed price already includes VAT."],
              ]} />

              <div style={{ marginTop: 18, padding: "12px 16px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
                <strong>Minimal valid example (header + 2 data rows):</strong>
                <div style={{ marginTop: 8, overflowX: "auto" }}>
                  <code style={{ fontFamily: "monospace", fontSize: 12, display: "block", whiteSpace: "pre", lineHeight: 1.9, background: "#fefce8", padding: "10px 12px", borderRadius: 6 }}>
{`title,price,stock,category,brand,sku,image_url,weight,color,description
Sony WH-1000XM5,1499.99,50,Electronics,Sony,SONY-WH5-BLK,https://cdn.example.com/wh5.jpg,0.254,Black,Best noise-cancelling headphones
Samsung Galaxy S24,18999.00,20,Smartphones,Samsung,SAMS-S24,https://cdn.example.com/s24.jpg,,,Latest Samsung flagship`}
                  </code>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: "10px 14px", background: "#eff6ff", borderRadius: 8, border: "1px solid #93c5fd", fontSize: 13, color: "#1d4ed8" }}>
                <strong>💡 Tips:</strong> Wrap fields containing commas in double quotes. Leave a cell empty to use the default. Column order does not matter. Unknown columns are safely ignored.
              </div>
            </div>
          )}
        </div>

        {/* DROP ZONE */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${drag ? "#0f172a" : file ? "#22c55e" : "#cbd5e1"}`, borderRadius: 16, padding: "40px 24px", textAlign: "center", cursor: "pointer", background: drag ? "#f8fafc" : file ? "#f0fdf4" : "#fff", marginBottom: 20, transition: "all 0.2s" }}>
          <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
          <div style={{ fontSize: 40, marginBottom: 12 }}>{file ? "📄" : "📤"}</div>
          {file ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{file.name}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                {(file.size / 1024).toFixed(1)} KB · <span style={{ color: "#0f172a", textDecoration: "underline", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setFile(null); clearState(); }}>Remove</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Drop CSV file here</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>or click to browse · .csv files only</div>
            </>
          )}
        </div>

        {/* PROGRESS */}
        {isWorking && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{phaseLabel[phase]}</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "#0f172a", borderRadius: 99, transition: "width 0.1s linear" }} />
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#991b1b", fontSize: 14, marginBottom: 16 }}>
            ✕ {errorMsg}
          </div>
        )}

        {file && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#64748b", marginRight: 4 }}>Actions:</span>
            <button onClick={validate} disabled={isWorking} style={{ ...actionBtn, background: "#eff6ff", borderColor: "#93c5fd", color: "#1d4ed8" }}>
              {phase === "validating" ? "Validating…" : "✓ Validate"}
            </button>
            <button onClick={previewFile} disabled={isWorking} style={{ ...actionBtn, background: "#f5f3ff", borderColor: "#c4b5fd", color: "#7c3aed" }}>
              {phase === "previewing" ? "Loading…" : "👁 Preview"}
            </button>
            <button onClick={upload} disabled={isWorking} style={{ ...actionBtn, background: "#f0fdf4", borderColor: "#86efac", color: "#15803d", fontWeight: 700 }}>
              {phase === "uploading" ? "Uploading…" : "🚀 Upload & Import"}
            </button>
          </div>
        )}

        {validation && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Validation Result</h3>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}><strong style={{ color: "#0f172a" }}>{validation.total_rows}</strong> rows</span>
                <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 700, background: validation.valid ? "#dcfce7" : "#fee2e2", color: validation.valid ? "#15803d" : "#dc2626" }}>
                  {validation.valid ? "✓ Valid" : "✕ Has Errors"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Errors",   count: validation.errors.length,   bg: "#fee2e2", color: "#dc2626" },
                { label: "Warnings", count: validation.warnings.length, bg: "#fff7ed", color: "#c2410c" },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: s.bg }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</div>
                </div>
              ))}
            </div>
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <>
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {(["errors", "warnings"] as const).map((t) => {
                    const count = t === "errors" ? validation.errors.length : validation.warnings.length;
                    return (
                      <button key={t} onClick={() => setActiveTab(t)}
                        style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: activeTab === t ? "#0f172a" : "#f1f5f9", color: activeTab === t ? "#fff" : "#475569", cursor: "pointer", fontSize: 13, fontWeight: activeTab === t ? 600 : 400, textTransform: "capitalize" }}>
                        {t} ({count})
                      </button>
                    );
                  })}
                </div>
                <div style={{ overflowX: "auto", maxHeight: 300, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f8fafc" }}>
                      <tr>
                        {["Row", "Field", activeTab === "errors" ? "Error" : "Warning"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", fontWeight: 600, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.04em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(activeTab === "errors" ? validation.errors : validation.warnings).map((item, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px" }}><span style={{ padding: "2px 8px", background: "#f1f5f9", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>Row {item.row}</span></td>
                          <td style={{ padding: "8px 12px", fontWeight: 500, color: "#374151" }}>{item.field}</td>
                          <td style={{ padding: "8px 12px", color: activeTab === "errors" ? "#dc2626" : "#c2410c" }}>{activeTab === "errors" ? (item as any).error : (item as any).warning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {/* Always show import button — upload is never blocked by warnings/errors */}
            <div style={{ marginTop: 16, padding: "12px 16px", background: validation.valid ? "#f0fdf4" : "#fffbeb", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontSize: 14, color: validation.valid ? "#15803d" : "#92400e", fontWeight: 600 }}>
                {validation.valid ? "✓ CSV is valid and ready to import" : "⚠ CSV has warnings — you can still import. Issues on individual rows will be skipped."}
              </span>
              <button onClick={upload} disabled={isWorking} style={{ ...primaryBtn, background: validation.valid ? "#15803d" : "#d97706" }}>🚀 Import Anyway</button>
            </div>
          </div>
        )}

        {preview && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Preview</h3>
              <span style={{ fontSize: 13, color: "#64748b" }}>Showing {preview.preview.length} of <strong style={{ color: "#0f172a" }}>{preview.total_rows}</strong> rows</span>
            </div>
            <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8fafc" }}>
                  <tr>
                    {["#", "Title", "Price", "Category", "Stock", "Store"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", fontWeight: 600, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "8px 12px", color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0f172a", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title || "—"}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a" }}>{row.price ? `R ${Number(row.price).toLocaleString()}` : "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{row.category ? <span style={{ padding: "2px 8px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{row.category}</span> : "—"}</td>
                      <td style={{ padding: "8px 12px" }}><span style={{ color: !row.stock || row.stock === "0" ? "#dc2626" : "#15803d", fontWeight: 600 }}>{row.stock || "0"}</span></td>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>{row.store || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={upload} disabled={isWorking} style={primaryBtn}>🚀 Upload All {preview.total_rows} Products</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const outlineBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 14 };
const ghostBtn:   React.CSSProperties = { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0 };
const actionBtn:  React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 500 };
const sectionHead: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, marginTop: 0 };

function GuideTable({ rows }: { rows: string[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead>
        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          {["Column", "Required", "Type", "Example", "Notes"].map((h) => (
            <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([col, req, type, ex, note], i) => (
          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{col}</td>
            <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
              <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: req === "★ Required" ? "#fee2e2" : "#f1f5f9", color: req === "★ Required" ? "#dc2626" : "#64748b" }}>{req}</span>
            </td>
            <td style={{ padding: "6px 10px", color: "#7c3aed", fontFamily: "monospace", fontSize: 11, whiteSpace: "nowrap" }}>{type}</td>
            <td style={{ padding: "6px 10px", color: "#374151", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ex}>{ex || "—"}</td>
            <td style={{ padding: "6px 10px", color: "#64748b", fontSize: 12 }}>{note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}