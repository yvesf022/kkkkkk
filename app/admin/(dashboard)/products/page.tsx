"use client";

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { bulkUploadApi, productsApi } from "@/lib/api";

/* =====================================================
   TYPES
===================================================== */

type UploadRecord = {
  id: string;
  filename: string;
  status: "processing" | "completed" | "failed" | "partial";
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  started_at: string;
  completed_at?: string;
};

type ValidationResult = {
  total_rows: number;
  valid: boolean;
  errors: { row: number; field: string; error: string }[];
  warnings: { row: number; field: string; warning: string }[];
};

type PreviewRow = {
  title: string;
  price: string;
  category: string;
  stock: string;
  parent_asin: string;
  store: string;
};

type Step = "select" | "validate" | "preview" | "uploading" | "done";

/* =====================================================
   HELPERS
===================================================== */

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_META = {
  processing: { bg: "#fef3c7", color: "#92400e", label: "Processing" },
  completed:  { bg: "#dcfce7", color: "#166534", label: "Completed" },
  partial:    { bg: "#fff7ed", color: "#9a3412", label: "Partial" },
  failed:     { bg: "#fee2e2", color: "#991b1b", label: "Failed" },
};

/* =====================================================
   PAGE
===================================================== */

export default function AdminBulkUploadPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "history" | "export">("upload");

  /* ─── LOAD HISTORY ─── */

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await bulkUploadApi.listUploads();
      setHistory((data || []) as UploadRecord[]);
    } catch {
      toast.error("Failed to load upload history");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  /* ─── FILE SELECT ─── */

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) {
      toast.error("Only .csv files are accepted");
      return;
    }
    setFile(f);
    setStep("select");
    setValidation(null);
    setPreview([]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) { toast.error("Only .csv files accepted"); return; }
    setFile(f);
    setStep("select");
    setValidation(null);
    setPreview([]);
  }

  /* ─── VALIDATE ─── */

  async function handleValidate() {
    if (!file) return;
    setStep("validate");
    try {
      const result = await bulkUploadApi.validate(file);
      setValidation(result);
    } catch (err: any) {
      toast.error(err.message || "Validation failed");
      setStep("select");
    }
  }

  /* ─── PREVIEW ─── */

  async function handlePreview() {
    if (!file) return;
    try {
      const result = await bulkUploadApi.preview(file);
      setPreview(result.preview || []);
      setPreviewTotal(result.total_rows || 0);
      setStep("preview");
    } catch (err: any) {
      toast.error(err.message || "Preview failed");
    }
  }

  /* ─── UPLOAD ─── */

  async function handleUpload() {
    if (!file) return;
    setStep("uploading");
    try {
      await bulkUploadApi.upload(file);
      toast.success("Upload complete!");
      setStep("done");
      setFile(null);
      setValidation(null);
      setPreview([]);
      if (fileRef.current) fileRef.current.value = "";
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setStep("preview");
    }
  }

  function handleReset() {
    setFile(null);
    setStep("select");
    setValidation(null);
    setPreview([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  /* ─── EXPORT ─── */

  async function handleExport(params: { status?: string; store?: string } = {}) {
    setExporting(true);
    try {
      await productsApi.exportCsv(params);
      toast.success("Export downloaded");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  /* ─── RENDER ─── */

  return (
    <div style={pageWrap}>

      {/* HEADER */}
      <header style={headerBlock}>
        <div>
          <h1 style={pageTitle}>Product Import / Export</h1>
          <p style={pageSub}>Bulk upload via CSV, validate before import, export your catalog</p>
        </div>
        <div style={headerStats}>
          <StatPill label="Total Uploads" value={String(history.length)} />
          <StatPill
            label="Last Upload"
            value={history[0] ? fmtDate(history[0].started_at).split(",")[0] : "Never"}
          />
        </div>
      </header>

      {/* TAB BAR */}
      <div style={tabBar}>
        {(["upload", "history", "export"] as const).map((t) => (
          <button
            key={t}
            style={{ ...tabBtn, ...(activeTab === t ? tabBtnActive : {}) }}
            onClick={() => setActiveTab(t)}
          >
            {t === "upload" && "⬆ "}
            {t === "history" && "📋 "}
            {t === "export" && "⬇ "}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ══ UPLOAD TAB ══ */}
      {activeTab === "upload" && (
        <div style={{ display: "grid", gap: 20 }}>

          {/* STEP PROGRESS */}
          <div style={stepBar}>
            {[
              { key: "select",    label: "1. Select" },
              { key: "validate",  label: "2. Validate" },
              { key: "preview",   label: "3. Preview" },
              { key: "uploading", label: "4. Import" },
            ].map((s, i) => {
              const steps = ["select", "validate", "preview", "uploading", "done"];
              const currentIdx = steps.indexOf(step);
              const thisIdx = steps.indexOf(s.key);
              const done = currentIdx > thisIdx;
              const active = currentIdx === thisIdx;
              return (
                <div key={s.key} style={stepItem}>
                  <div style={{
                    ...stepCircle,
                    background: done ? "#22c55e" : active ? "#0f172a" : "#e2e8f0",
                    color: done || active ? "#fff" : "#94a3b8",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#0f172a" : "#94a3b8" }}>
                    {s.label}
                  </span>
                  {i < 3 && <div style={stepLine} />}
                </div>
              );
            })}
          </div>

          {/* DONE STATE */}
          {step === "done" && (
            <div style={{ ...card, textAlign: "center" as const, padding: 48 }}>
              <div style={{ fontSize: 52 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#166534", margin: "16px 0 8px" }}>
                Upload Successful!
              </h2>
              <p style={{ color: "#64748b", marginBottom: 24 }}>
                Your products have been imported. Check history below for details.
              </p>
              <button style={primaryBtn} onClick={handleReset}>Upload Another File</button>
            </div>
          )}

          {/* SELECT FILE */}
          {step === "select" && (
            <div style={card}>
              <h2 style={sectionTitle}>Select CSV File</h2>

              <div
                style={dropZone}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />
                <div style={{ fontSize: 40 }}>📂</div>
                <div style={{ fontWeight: 800, color: "#1e293b", fontSize: 16 }}>
                  {file ? file.name : "Drop your CSV here or click to browse"}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Accepts .csv files only"}
                </div>
                {file && <div style={fileSelectedBadge}>✓ File selected</div>}
              </div>

              {file && (
                <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
                  <button style={ghostBtn} onClick={handleReset}>Clear</button>
                  <button style={secondaryBtn} onClick={handlePreview}>Preview (10 rows)</button>
                  <button style={primaryBtn} onClick={handleValidate}>Validate File →</button>
                </div>
              )}

              {/* CSV FORMAT GUIDE */}
              <div style={formatGuide}>
                <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 10, fontSize: 13 }}>
                  📋 Required CSV Columns
                </h4>
                <div style={colGrid}>
                  {[
                    { col: "title", req: true },
                    { col: "price", req: true },
                    { col: "main_category", req: false },
                    { col: "categories", req: false, note: "JSON array" },
                    { col: "description", req: false },
                    { col: "short_description", req: false },
                    { col: "brand", req: false },
                    { col: "store", req: false },
                    { col: "stock", req: false },
                    { col: "rating", req: false },
                    { col: "rating_number", req: false },
                    { col: "parent_asin", req: false },
                    { col: "image_urls", req: false, note: "comma separated" },
                    { col: "features", req: false, note: "JSON array" },
                    { col: "details", req: false, note: "JSON object" },
                  ].map((c) => (
                    <div key={c.col} style={colItem}>
                      <code style={colCode}>{c.col}</code>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.req ? "#ef4444" : "#94a3b8" }}>
                        {c.req ? "REQUIRED" : "optional"}
                      </span>
                      {c.note && <span style={{ fontSize: 10, color: "#94a3b8" }}>({c.note})</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VALIDATE RESULT */}
          {step === "validate" && !validation && (
            <div style={{ ...card, textAlign: "center" as const, padding: 48 }}>
              <div style={spinnerLg} />
              <p style={{ color: "#64748b", marginTop: 16 }}>Validating your file…</p>
            </div>
          )}

          {step === "validate" && validation && (
            <div style={card}>
              <div style={validationHeader}>
                <div>
                  <h2 style={sectionTitle}>Validation Results</h2>
                  <p style={{ color: "#64748b", fontSize: 13 }}>
                    {validation.total_rows} rows checked
                  </p>
                </div>
                <div style={{
                  ...validBadge,
                  background: validation.valid ? "#dcfce7" : "#fee2e2",
                  color: validation.valid ? "#166534" : "#991b1b",
                }}>
                  {validation.valid ? "✓ Ready to Import" : "✗ Errors Found"}
                </div>
              </div>

              {/* ERRORS */}
              {validation.errors.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "#991b1b", marginBottom: 10 }}>
                    ✗ Errors ({validation.errors.length})
                  </h3>
                  <div style={issueList}>
                    {validation.errors.map((e, i) => (
                      <div key={i} style={errorRow}>
                        <span style={rowBadge}>Row {e.row}</span>
                        <span style={fieldBadge}>{e.field}</span>
                        <span style={{ fontSize: 13, color: "#991b1b" }}>{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WARNINGS */}
              {validation.warnings.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 10 }}>
                    ⚠ Warnings ({validation.warnings.length})
                  </h3>
                  <div style={issueList}>
                    {validation.warnings.map((w, i) => (
                      <div key={i} style={warnRow}>
                        <span style={rowBadge}>Row {w.row}</span>
                        <span style={fieldBadge}>{w.field}</span>
                        <span style={{ fontSize: 13, color: "#92400e" }}>{w.warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validation.errors.length === 0 && validation.warnings.length === 0 && (
                <div style={allClearBox}>
                  <span style={{ fontSize: 24 }}>🎉</span>
                  <span style={{ fontWeight: 800, color: "#166534" }}>
                    All {validation.total_rows} rows passed validation!
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                <button style={ghostBtn} onClick={handleReset}>Start Over</button>
                <button style={secondaryBtn} onClick={handlePreview}>Preview Rows</button>
                <button
                  style={{ ...primaryBtn, opacity: validation.errors.length > 0 ? 0.5 : 1 }}
                  disabled={validation.errors.length > 0}
                  onClick={handleUpload}
                >
                  Import Now →
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {step === "preview" && (
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={sectionTitle}>Preview (First 10 Rows)</h2>
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    Total file: {previewTotal} rows
                  </p>
                </div>
              </div>

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      {["Title", "Price", "Category", "Stock", "ASIN", "Store"].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={i % 2 === 0 ? trEven : {}}>
                        <td style={td}>{row.title || "—"}</td>
                        <td style={td}>{row.price ? `R ${row.price}` : "—"}</td>
                        <td style={td}>{row.category || "—"}</td>
                        <td style={td}>{row.stock || "—"}</td>
                        <td style={tdMono}>{row.parent_asin || "—"}</td>
                        <td style={td}>{row.store || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                <button style={ghostBtn} onClick={() => setStep("select")}>← Back</button>
                <button style={secondaryBtn} onClick={handleValidate}>Validate →</button>
                <button style={primaryBtn} onClick={handleUpload}>Import Now →</button>
              </div>
            </div>
          )}

          {/* UPLOADING */}
          {step === "uploading" && (
            <div style={{ ...card, textAlign: "center" as const, padding: 48 }}>
              <div style={spinnerLg} />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: "20px 0 8px" }}>
                Importing Products…
              </h2>
              <p style={{ color: "#64748b" }}>
                This may take a moment for large files. Don't close this page.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {activeTab === "history" && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={sectionTitle}>Upload History</h2>
            <button style={ghostBtn} onClick={loadHistory}>↻ Refresh</button>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: "center" as const, padding: 48 }}>
              <div style={spinnerLg} />
            </div>
          ) : history.length === 0 ? (
            <div style={emptyState}>
              <span style={{ fontSize: 36 }}>📭</span>
              <p>No uploads yet. Go to the Upload tab to import products.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {history.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.failed;
                const successRate = item.total_rows > 0
                  ? Math.round((item.successful_rows / item.total_rows) * 100)
                  : 0;
                const isExpanded = expandedId === item.id;

                return (
                  <div key={item.id} style={histCard}>
                    <div
                      style={histCardHeader}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 22 }}>
                          {item.status === "completed" ? "✅" : item.status === "failed" ? "❌" : item.status === "partial" ? "⚠️" : "⏳"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: "#1e293b", fontSize: 14 }}>
                            {item.filename}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {fmtDate(item.started_at)}
                            {item.completed_at && ` → ${fmtDate(item.completed_at)}`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {item.status !== "processing" && (
                          <div style={{ textAlign: "right" as const }}>
                            <div style={progressBarWrap}>
                              <div style={{ ...progressBarFill, width: `${successRate}%`, background: successRate === 100 ? "#22c55e" : successRate > 50 ? "#f59e0b" : "#ef4444" }} />
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                              {item.successful_rows}/{item.total_rows} rows ({successRate}%)
                            </div>
                          </div>
                        )}
                        <span style={{ ...statusBadge, background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={histCardBody}>
                        <div style={histStatRow}>
                          <HistStat label="Total Rows" value={String(item.total_rows)} />
                          <HistStat label="Successful" value={String(item.successful_rows)} color="#22c55e" />
                          <HistStat label="Failed" value={String(item.failed_rows)} color={item.failed_rows > 0 ? "#ef4444" : "#94a3b8"} />
                          <HistStat label="Success Rate" value={`${successRate}%`} color={successRate === 100 ? "#22c55e" : "#f59e0b"} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ EXPORT TAB ══ */}
      {activeTab === "export" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={card}>
            <h2 style={sectionTitle}>Export Products to CSV</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
              Download your product catalog as a CSV file. Apply filters to export a subset.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              <ExportAction
                label="Export All Active Products"
                desc="All products with status = active"
                icon="✅"
                onClick={() => handleExport({ status: "active" })}
                loading={exporting}
              />
              <ExportAction
                label="Export All Products (Full Catalog)"
                desc="Every product including drafts and archived"
                icon="📦"
                onClick={() => handleExport({})}
                loading={exporting}
              />
              <ExportAction
                label="Export Archived Products"
                desc="Products currently archived"
                icon="🗄"
                onClick={() => handleExport({ status: "archived" })}
                loading={exporting}
              />
              <ExportAction
                label="Export Draft Products"
                desc="Products in draft status"
                icon="📝"
                onClick={() => handleExport({ status: "draft" })}
                loading={exporting}
              />
            </div>
          </div>

          <div style={{ ...card, background: "#f8fafc" }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#475569", marginBottom: 12 }}>
              📋 Export Columns Included
            </h3>
            <div style={colGrid}>
              {["id","title","sku","brand","store","category","main_category","price","compare_price","stock","rating","rating_number","sales","status","is_deleted","created_at"].map((c) => (
                <code key={c} style={colCode}>{c}</code>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* =====================================================
   SUB-COMPONENTS
===================================================== */

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" as const }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" as const }}>{label}</div>
    </div>
  );
}

function HistStat({ label, value, color = "#0f172a" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" as const }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" as const }}>{label}</div>
    </div>
  );
}

function ExportAction({ label, desc, icon, onClick, loading }: {
  label: string; desc: string; icon: string; onClick: () => void; loading: boolean;
}) {
  return (
    <div style={exportRow}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 800, color: "#1e293b" }}>{label}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{desc}</div>
        </div>
      </div>
      <button style={primaryBtn} onClick={onClick} disabled={loading}>
        {loading ? "Exporting…" : "⬇ Download"}
      </button>
    </div>
  );
}

/* =====================================================
   STYLES
===================================================== */

const pageWrap: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "24px 24px 80px",
  fontFamily: "'DM Sans', system-ui, sans-serif",
};

const headerBlock: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 28,
  gap: 20,
  flexWrap: "wrap" as const,
};

const pageTitle: React.CSSProperties = {
  fontSize: 26, fontWeight: 900, color: "#0f172a",
  letterSpacing: "-0.02em", marginBottom: 4,
};

const pageSub: React.CSSProperties = { color: "#64748b", fontSize: 14 };

const headerStats: React.CSSProperties = {
  display: "flex", gap: 32,
};

const tabBar: React.CSSProperties = {
  display: "flex", gap: 4, marginBottom: 20,
  background: "#f1f5f9", borderRadius: 12, padding: 4,
};

const tabBtn: React.CSSProperties = {
  padding: "9px 22px", borderRadius: 8, border: "none",
  background: "transparent", fontWeight: 700, fontSize: 13,
  color: "#64748b", cursor: "pointer",
};

const tabBtnActive: React.CSSProperties = {
  background: "#fff", color: "#0f172a",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 16, padding: 24,
  border: "1px solid #e2e8f0",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 900, color: "#0f172a",
  marginBottom: 20, letterSpacing: "-0.01em",
};

const stepBar: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 0,
  background: "#fff", borderRadius: 16, padding: "20px 28px",
  border: "1px solid #e2e8f0",
};

const stepItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, flex: 1,
};

const stepCircle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontWeight: 900, fontSize: 12, flexShrink: 0,
};

const stepLine: React.CSSProperties = {
  flex: 1, height: 2, background: "#e2e8f0", marginLeft: 8,
};

const dropZone: React.CSSProperties = {
  border: "2px dashed #cbd5e1",
  borderRadius: 14, padding: "36px 24px",
  display: "flex", flexDirection: "column" as const,
  alignItems: "center", gap: 10, cursor: "pointer",
  background: "#f8fafc", transition: "border-color 0.2s",
};

const fileSelectedBadge: React.CSSProperties = {
  background: "#dcfce7", color: "#166534",
  fontWeight: 800, fontSize: 12,
  padding: "4px 12px", borderRadius: 20,
};

const formatGuide: React.CSSProperties = {
  marginTop: 28, padding: 20,
  background: "#f8fafc", borderRadius: 12,
  border: "1px solid #e2e8f0",
};

const colGrid: React.CSSProperties = {
  display: "flex", flexWrap: "wrap" as const, gap: 8,
};

const colItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "4px 10px", background: "#fff",
  borderRadius: 8, border: "1px solid #e2e8f0",
};

const colCode: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 12, color: "#0f172a", fontWeight: 700,
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 22px", borderRadius: 10, border: "none",
  background: "#0f172a", color: "#fff",
  fontWeight: 800, fontSize: 13, cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 22px", borderRadius: 10,
  border: "1.5px solid #0f172a",
  background: "transparent", color: "#0f172a",
  fontWeight: 800, fontSize: 13, cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "10px 22px", borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  background: "transparent", color: "#64748b",
  fontWeight: 700, fontSize: 13, cursor: "pointer",
};

const validationHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  alignItems: "flex-start", marginBottom: 20,
};

const validBadge: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 20,
  fontWeight: 900, fontSize: 13,
};

const issueList: React.CSSProperties = {
  display: "grid", gap: 8, maxHeight: 300, overflowY: "auto" as const,
};

const errorRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
  background: "#fff5f5", borderRadius: 8, border: "1px solid #fee2e2",
};

const warnRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
  background: "#fffbeb", borderRadius: 8, border: "1px solid #fef3c7",
};

const rowBadge: React.CSSProperties = {
  background: "#0f172a", color: "#fff",
  fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
  whiteSpace: "nowrap" as const,
};

const fieldBadge: React.CSSProperties = {
  background: "#f1f5f9", color: "#475569",
  fontSize: 10, fontWeight: 700, padding: "2px 8px",
  borderRadius: 6, fontFamily: "'DM Mono', monospace",
};

const allClearBox: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "16px 20px", background: "#f0fdf4",
  borderRadius: 12, border: "1px solid #bbf7d0",
};

const tableWrap: React.CSSProperties = {
  overflowX: "auto" as const, borderRadius: 10,
  border: "1px solid #e2e8f0",
};

const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse" as const, fontSize: 13,
};

const th: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left" as const,
  fontWeight: 800, fontSize: 11, color: "#64748b",
  textTransform: "uppercase" as const, letterSpacing: "0.05em",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};

const td: React.CSSProperties = {
  padding: "10px 14px", color: "#1e293b",
  borderBottom: "1px solid #f1f5f9",
};

const tdMono: React.CSSProperties = {
  ...td, fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b",
};

const trEven: React.CSSProperties = { background: "#fafafa" };

const histCard: React.CSSProperties = {
  borderRadius: 12, border: "1.5px solid #e2e8f0",
  overflow: "hidden",
};

const histCardHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "16px 20px",
  cursor: "pointer", background: "#fff",
};

const histCardBody: React.CSSProperties = {
  padding: "16px 20px",
  background: "#f8fafc",
  borderTop: "1px solid #e2e8f0",
};

const histStatRow: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16,
};

const statusBadge: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 20,
  fontSize: 11, fontWeight: 800,
};

const progressBarWrap: React.CSSProperties = {
  width: 100, height: 4, background: "#e2e8f0", borderRadius: 4, overflow: "hidden",
};

const progressBarFill: React.CSSProperties = {
  height: "100%", borderRadius: 4, transition: "width 0.3s",
};

const emptyState: React.CSSProperties = {
  display: "flex", flexDirection: "column" as const,
  alignItems: "center", gap: 12, padding: 48,
  color: "#94a3b8", textAlign: "center" as const,
};

const exportRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "16px 20px",
  borderRadius: 12, border: "1.5px solid #e2e8f0",
  background: "#fafafa",
};

const spinnerLg: React.CSSProperties = {
  width: 44, height: 44,
  border: "3px solid #e2e8f0",
  borderTop: "3px solid #0f172a",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  margin: "0 auto",
};