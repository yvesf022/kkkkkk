"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { bulkUploadApi } from "@/lib/api";

type ValidationResult = {
  total_rows:   number;
  valid:        boolean;
  errors:       { row: number; field: string; error: string }[];
  warnings:     { row: number; field: string; warning: string }[];
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
  created?:    number;
  updated?:    number;
  errors?:     number;
  job_id?:     string;
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

  // ── DONE SCREEN ───────────────────────────────────────
  if (phase === "done" && uploadRes) {
    const hasErrors = (uploadRes.errors ?? 0) > 0;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{hasErrors ? "⚠️" : "🎉"}</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Upload Complete</h2>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
            {[
              { label: "Created",  value: uploadRes.created ?? 0,  color: "#15803d", bg: "#dcfce7" },
              { label: "Updated",  value: uploadRes.updated ?? 0,  color: "#1d4ed8", bg: "#dbeafe" },
              { label: "Errors",   value: uploadRes.errors  ?? 0,  color: "#dc2626", bg: "#fee2e2" },
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
        {/* ── HEADER ── */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => router.push("/admin/products")} style={ghostBtn}>← Products</button>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginTop: 10 }}>Bulk Upload Products</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Upload a CSV to create or update products. Validate and preview before importing.</p>
        </div>

        {/* ── DROP ZONE ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${drag ? "#0f172a" : file ? "#22c55e" : "#cbd5e1"}`,
            borderRadius: 16,
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: drag ? "#f8fafc" : file ? "#f0fdf4" : "#fff",
            marginBottom: 20,
            transition: "all 0.2s",
          }}
        >
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
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>or click to browse</div>
            </>
          )}
        </div>

        {/* ── PROGRESS BAR ── */}
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

        {/* ── ERROR BANNER ── */}
        {errorMsg && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#991b1b", fontSize: 14, marginBottom: 16 }}>
            ✕ {errorMsg}
          </div>
        )}

        {/* ── ACTION BUTTONS ── */}
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

        {/* ── VALIDATION RESULT ── */}
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

            {/* Summary stats */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Errors",   count: validation.errors.length,   bg: "#fee2e2",   color: "#dc2626" },
                { label: "Warnings", count: validation.warnings.length, bg: "#fff7ed",   color: "#c2410c" },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: s.bg }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
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
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ padding: "2px 8px", background: "#f1f5f9", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>Row {item.row}</span>
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 500, color: "#374151" }}>{item.field}</td>
                          <td style={{ padding: "8px 12px", color: activeTab === "errors" ? "#dc2626" : "#c2410c" }}>{activeTab === "errors" ? (item as any).error : (item as any).warning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {validation.valid && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>✓ CSV is valid and ready to import</span>
                <button onClick={upload} disabled={isWorking} style={{ ...primaryBtn, background: "#15803d" }}>
                  🚀 Import Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PREVIEW TABLE ── */}
        {preview && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Preview</h3>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Showing {preview.preview.length} of <strong style={{ color: "#0f172a" }}>{preview.total_rows}</strong> rows
              </span>
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
                      <td style={{ padding: "8px 12px" }}>
                        {row.category ? (
                          <span style={{ padding: "2px 8px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{row.category}</span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ color: !row.stock || row.stock === "0" ? "#dc2626" : "#15803d", fontWeight: 600 }}>{row.stock || "0"}</span>
                      </td>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>{row.store || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={upload} disabled={isWorking} style={primaryBtn}>
                🚀 Upload All {preview.total_rows} Products
              </button>
            </div>
          </div>
        )}

        {/* ── CSV GUIDE ── */}
        {!file && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>CSV Format Guide</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {["Column", "Required", "Type", "Example"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["title",         "Yes", "string",  "Sony WH-1000XM5"],
                    ["price",         "Yes", "number",  "1499.99"],
                    ["stock",         "No",  "integer", "50"],
                    ["category",      "No",  "string",  "Electronics"],
                    ["brand",         "No",  "string",  "Sony"],
                    ["sku",           "No",  "string",  "SONY-WH1000XM5"],
                    ["description",   "No",  "string",  "Noise-cancelling…"],
                    ["compare_price", "No",  "number",  "1999.99"],
                    ["store",         "No",  "string",  "Store ID or slug"],
                    ["status",        "No",  "string",  "active / draft"],
                  ].map(([col, req, type, ex], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>{col}</td>
                      <td style={{ padding: "7px 12px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: req === "Yes" ? "#fee2e2" : "#f1f5f9", color: req === "Yes" ? "#dc2626" : "#64748b" }}>{req}</span>
                      </td>
                      <td style={{ padding: "7px 12px", color: "#7c3aed", fontFamily: "monospace", fontSize: 12 }}>{type}</td>
                      <td style={{ padding: "7px 12px", color: "#64748b" }}>{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const outlineBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 14 };
const ghostBtn:   React.CSSProperties = { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0 };
const actionBtn:  React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 500 };