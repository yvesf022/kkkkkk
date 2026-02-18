"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { bulkUploadApi } from "@/lib/api";

/* =====================================================
   TYPES
===================================================== */

type UploadStatus = {
  id: string;
  file_name: string;
  status: "processing" | "completed" | "failed";
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  started_at: string;
  completed_at?: string | null;
  error_message?: string | null;
};

/* =====================================================
   HELPERS
===================================================== */

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmt(n?: number | null) {
  return n != null ? n.toLocaleString() : "—";
}

const STATUS_META: Record<
  "processing" | "completed" | "failed",
  { label: string; dot: string; bg: string }
> = {
  processing: { label: "Processing", dot: "#f59e0b", bg: "#fef3c7" },
  completed: { label: "Completed", dot: "#22c55e", bg: "#dcfce7" },
  failed: { label: "Failed", dot: "#ef4444", bg: "#fee2e2" },
};

/* =====================================================
   PAGE
===================================================== */

export default function AdminBulkUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<UploadStatus[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  /* ─── LOAD HISTORY ─── */

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const data = await bulkUploadApi.listUploads();
      console.log("Bulk upload history:", data);
      setHistory((data || []) as UploadStatus[]);
    } catch (err: any) {
      console.error("Failed to load history:", err);
      toast.error("Failed to load upload history");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  /* ─── HANDLE UPLOAD ─── */

  async function handleUpload() {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      const response = await bulkUploadApi.upload(file);
      console.log("Upload response:", response);
      toast.success("Upload started successfully");
      setFile(null);

      // Reset file input
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      await loadHistory();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  /* ─── FILE SELECT ─── */

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  }

  /* ─── RENDER ─── */

  if (loadingHistory) {
    return (
      <div style={pageWrap}>
        <div style={loadingWrap}>
          <div style={spinner} />
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      {/* TOPBAR */}
      <div style={topbar}>
        <button style={backBtn} onClick={() => router.push("/admin/products")}>
          ← Back to Products
        </button>

        <div style={topbarActions}>
          <button
            style={refreshBtn}
            onClick={loadHistory}
            disabled={loadingHistory}
          >
            {loadingHistory ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* TITLE */}
      <div style={titleBlock}>
        <div style={iconBox}>📦</div>
        <div>
          <h1 style={titleText}>Bulk Upload Products</h1>
          <p style={titleSub}>Upload multiple products via CSV file</p>
        </div>
      </div>

      {/* STATS STRIP */}
      <div style={statStrip}>
        <div style={statCard}>
          <div style={statLabel}>Total Uploads</div>
          <div style={statValue}>{fmt(history.length)}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Completed</div>
          <div style={statValue}>
            {fmt(history.filter((h) => h.status === "completed").length)}
          </div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Processing</div>
          <div style={statValue}>
            {fmt(history.filter((h) => h.status === "processing").length)}
          </div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Failed</div>
          <div style={statValue}>
            {fmt(history.filter((h) => h.status === "failed").length)}
          </div>
        </div>
      </div>

      {/* UPLOAD SECTION */}
      <div style={card}>
        <h2 style={sectionTitle}>Upload New File</h2>

        <div style={uploadZone}>
          <div style={{ fontSize: 32 }}>📄</div>
          <div style={{ textAlign: "center" }}>
            <label htmlFor="csv-upload" style={uploadLabel}>
              Click to select CSV file
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <p style={uploadHint}>Maximum file size: 10MB</p>
          </div>
        </div>

        {file && (
          <div style={filePreview}>
            <div style={fileIcon}>📄</div>
            <div style={{ flex: 1 }}>
              <div style={fileName}>{file.name}</div>
              <div style={fileSize}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              style={removeFileBtn}
              onClick={() => {
                setFile(null);
                const fileInput = document.querySelector(
                  'input[type="file"]'
                ) as HTMLInputElement;
                if (fileInput) fileInput.value = "";
              }}
            >
              ✕
            </button>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          style={{
            ...primaryBtn,
            opacity: uploading || !file ? 0.5 : 1,
            cursor: uploading || !file ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Uploading…" : "Start Upload"}
        </button>
      </div>

      {/* HISTORY SECTION */}
      <div style={card}>
        <div style={sectionRow}>
          <h2 style={sectionTitle}>Upload History</h2>
        </div>

        {history.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>
              No uploads yet
            </p>
            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              Upload your first CSV file to get started
            </p>
          </div>
        ) : (
          <div style={historyList}>
            {history.map((item) => {
              const meta = STATUS_META[item.status];
              const successRate =
                item.total_rows > 0
                  ? ((item.successful_rows / item.total_rows) * 100).toFixed(1)
                  : "0";

              return (
                <div key={item.id} style={historyItem}>
                  {/* LEFT: File Info */}
                  <div style={historyLeft}>
                    <div style={historyIcon}>📄</div>
                    <div style={{ flex: 1 }}>
                      <div style={historyFileName}>
                        {item.file_name || "Unknown file"}
                      </div>
                      <div style={historyMeta}>
                        Started: {fmtDate(item.started_at)}
                      </div>
                      {item.completed_at && (
                        <div style={historyMeta}>
                          Completed: {fmtDate(item.completed_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CENTER: Stats */}
                  {item.status !== "processing" && (
                    <div style={historyStats}>
                      <div style={historyStatItem}>
                        <div style={historyStatLabel}>Total</div>
                        <div style={historyStatValue}>
                          {fmt(item.total_rows)}
                        </div>
                      </div>
                      <div style={historyStatItem}>
                        <div style={historyStatLabel}>Success</div>
                        <div style={{ ...historyStatValue, color: "#22c55e" }}>
                          {fmt(item.successful_rows)}
                        </div>
                      </div>
                      <div style={historyStatItem}>
                        <div style={historyStatLabel}>Failed</div>
                        <div style={{ ...historyStatValue, color: "#ef4444" }}>
                          {fmt(item.failed_rows)}
                        </div>
                      </div>
                      <div style={historyStatItem}>
                        <div style={historyStatLabel}>Success Rate</div>
                        <div style={historyStatValue}>{successRate}%</div>
                      </div>
                    </div>
                  )}

                  {/* RIGHT: Status */}
                  <div style={historyRight}>
                    <div
                      style={{
                        ...statusBadge,
                        background: meta.bg,
                      }}
                    >
                      <span
                        style={{
                          ...statusDot,
                          background: meta.dot,
                        }}
                      />
                      <span>{meta.label}</span>
                    </div>

                    {item.error_message && (
                      <div style={errorMsg}>{item.error_message}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: 400,
  gap: 16,
};

const spinner: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "3px solid #e2e8f0",
  borderTop: "3px solid #0f172a",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const topbar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 24,
  flexWrap: "wrap",
  gap: 12,
};

const backBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 13,
  fontWeight: 700,
  color: "#64748b",
  cursor: "pointer",
  padding: "6px 0",
};

const topbarActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const refreshBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1.5px solid #e2e8f0",
  background: "#fff",
  fontWeight: 700,
  fontSize: 13,
  color: "#475569",
  cursor: "pointer",
};

const titleBlock: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
};

const iconBox: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 16,
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 32,
  flexShrink: 0,
  boxShadow: "0 4px 12px rgba(15,23,42,0.25)",
};

const titleText: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.02em",
  marginBottom: 4,
};

const titleSub: React.CSSProperties = {
  fontSize: 14,
  color: "#64748b",
  fontWeight: 500,
};

const statStrip: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
  marginBottom: 24,
};

const statCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "16px 18px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

const statLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
};

const statValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 24,
  border: "1px solid #e2e8f0",
  marginBottom: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 16,
};

const sectionRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const uploadZone: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  padding: "32px 24px",
  borderRadius: 12,
  border: "2px dashed #cbd5e1",
  background: "#f8fafc",
  marginBottom: 20,
  cursor: "pointer",
  transition: "all 0.2s",
};

const uploadLabel: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#0f172a",
  cursor: "pointer",
  display: "block",
  marginBottom: 4,
};

const uploadHint: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  margin: 0,
};

const filePreview: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 16,
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  background: "#fafafa",
  marginBottom: 16,
};

const fileIcon: React.CSSProperties = {
  fontSize: 24,
};

const fileName: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#1e293b",
  marginBottom: 2,
};

const fileSize: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
};

const removeFileBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid #fee2e2",
  background: "#fff",
  color: "#ef4444",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "12px 24px",
  borderRadius: 10,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s",
};

const emptyState: React.CSSProperties = {
  textAlign: "center",
  padding: "48px 24px",
};

const historyList: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const historyItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  padding: 16,
  borderRadius: 12,
  border: "1.5px solid #e2e8f0",
  background: "#fafafa",
};

const historyLeft: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flex: 1,
  minWidth: 0,
};

const historyIcon: React.CSSProperties = {
  fontSize: 24,
  flexShrink: 0,
};

const historyFileName: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#1e293b",
  marginBottom: 4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const historyMeta: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginBottom: 2,
};

const historyStats: React.CSSProperties = {
  display: "flex",
  gap: 20,
  flexShrink: 0,
};

const historyStatItem: React.CSSProperties = {
  textAlign: "center",
};

const historyStatLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 4,
};

const historyStatValue: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#0f172a",
};

const historyRight: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 6,
  flexShrink: 0,
};

const statusBadge: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 800,
};

const statusDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
};

const errorMsg: React.CSSProperties = {
  fontSize: 11,
  color: "#ef4444",
  fontWeight: 600,
  maxWidth: 200,
  textAlign: "right",
};