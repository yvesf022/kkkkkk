"use client";

import { useState } from "react";
import { bulkUploadApi } from "@/lib/api";

type ValidationResult = {
  total_rows: number;
  valid: boolean;
  errors: { row: number; field: string; error: string }[];
  warnings: { row: number; field: string; warning: string }[];
};

type PreviewResult = {
  total_rows: number;
  preview: {
    title: string;
    price: string;
    category: string;
    stock: string;
    parent_asin: string;
    store: string;
  }[];
};

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setValidation(null);
    setPreview(null);
    setUploadResult(null);
    setError(null);
  }

  async function validate() {
    if (!file) return;
    setValidating(true);
    setError(null);
    try {
      const data = await bulkUploadApi.validate(file);
      setValidation(data);
    } catch (err: any) {
      setError(err?.message ?? "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  async function previewFile() {
    if (!file) return;
    setPreviewing(true);
    setError(null);
    try {
      const data = await bulkUploadApi.preview(file);
      setPreview(data);
    } catch (err: any) {
      setError(err?.message ?? "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function upload() {
    if (!file) return;
    if (!confirm("Upload and import all products from this CSV?")) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result = await bulkUploadApi.upload(file) as any;
      setUploadResult(
        `Upload complete — ${result?.created ?? "?"} created, ${result?.updated ?? "?"} updated, ${result?.errors ?? 0} errors`
      );
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Bulk Upload Products</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          Upload a CSV file to create or update products in bulk. Validate and preview before importing.
        </p>
      </div>

      {/* FILE PICKER */}
      <div style={card}>
        <h3 style={sectionTitle}>1. Select CSV File</h3>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          style={{ fontSize: 14 }}
        />
        {file && (
          <p style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
            Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* ACTIONS */}
      {file && (
        <div style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ ...sectionTitle, width: "100%", marginBottom: 4 }}>2. Validate / Preview / Upload</h3>

          <button onClick={validate} disabled={validating} style={btn}>
            {validating ? "Validating..." : "Validate CSV"}
          </button>

          <button onClick={previewFile} disabled={previewing} style={btn}>
            {previewing ? "Loading..." : "Preview Rows"}
          </button>

          <button
            onClick={upload}
            disabled={uploading}
            style={{ ...btn, background: uploading ? "#d1fae5" : "#dcfce7", borderColor: "#86efac", fontWeight: 600 }}
          >
            {uploading ? "Uploading..." : "Upload & Import"}
          </button>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{ ...banner, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>
          {error}
        </div>
      )}

      {/* UPLOAD SUCCESS */}
      {uploadResult && (
        <div style={{ ...banner, background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
          {uploadResult}
        </div>
      )}

      {/* VALIDATION RESULT */}
      {validation && (
        <div style={card}>
          <h3 style={sectionTitle}>Validation Result</h3>
          <p style={{ fontSize: 14, marginBottom: 12 }}>
            <strong>{validation.total_rows}</strong> rows —{" "}
            <span style={{ color: validation.valid ? "#166534" : "#dc2626", fontWeight: 600 }}>
              {validation.valid ? "Valid — ready to upload" : "Has errors"}
            </span>
          </p>

          {validation.errors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", marginBottom: 6 }}>
                {validation.errors.length} Error(s)
              </p>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={tableHead}>Row</th>
                    <th style={tableHead}>Field</th>
                    <th style={tableHead}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.errors.map((e, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={tableCell}>{e.row}</td>
                      <td style={tableCell}>{e.field}</td>
                      <td style={{ ...tableCell, color: "#dc2626" }}>{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 6 }}>
                {validation.warnings.length} Warning(s)
              </p>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={tableHead}>Row</th>
                    <th style={tableHead}>Field</th>
                    <th style={tableHead}>Warning</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.warnings.map((w, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={tableCell}>{w.row}</td>
                      <td style={tableCell}>{w.field}</td>
                      <td style={{ ...tableCell, color: "#92400e" }}>{w.warning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW */}
      {preview && (
        <div style={card}>
          <h3 style={sectionTitle}>Preview ({preview.total_rows} rows)</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  {["Title", "Price", "Category", "Stock", "Store"].map((h) => (
                    <th key={h} style={tableHead}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={tableCell}>{row.title}</td>
                    <td style={tableCell}>{row.price}</td>
                    <td style={tableCell}>{row.category}</td>
                    <td style={tableCell}>{row.stock}</td>
                    <td style={tableCell}>{row.store}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
  marginBottom: 12,
  color: "#0f172a",
};

const btn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 14,
};

const banner: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 8,
  border: "1px solid",
  fontSize: 14,
  marginBottom: 16,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
};

const tableHead: React.CSSProperties = {
  padding: "8px 12px",
  background: "#f8fafc",
  fontWeight: 600,
  color: "#475569",
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0",
};

const tableCell: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #f1f5f9",
};