"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { bulkUploadApi } from "@/lib/api";

/* =====================================================
   TYPES
===================================================== */

type UploadStatus = {
  id: string;
  file_name: string;
  status: "processing" | "completed" | "failed";
  total_rows?: number;
  success_count?: number;
  error_count?: number;
  created_at: string;
};

/* =====================================================
   PAGE
===================================================== */

export default function AdminBulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<UploadStatus[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  /* ================= LOAD HISTORY ================= */

  async function loadHistory() {
    try {
      setLoadingHistory(true);

      const data = await bulkUploadApi.listUploads();

      // Explicit cast for strict TypeScript
      setHistory(data as UploadStatus[]);
    } catch {
      toast.error("Failed to load upload history");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  /* ================= HANDLE UPLOAD ================= */

  async function handleUpload() {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      await bulkUploadApi.upload(file);
      toast.success("Upload started");
      setFile(null);
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  /* ================= RENDER ================= */

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Bulk Upload Products
        </h1>
        <p style={{ opacity: 0.6 }}>
          Upload products via CSV file
        </p>
      </header>

      {/* UPLOAD CARD */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>Upload CSV</h2>

        <input
          type="file"
          accept=".csv"
          onChange={(e) =>
            setFile(e.target.files?.[0] || null)
          }
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          style={primaryBtn}
        >
          {uploading ? "Uploading…" : "Start Upload"}
        </button>
      </div>

      {/* HISTORY */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>Upload History</h2>

        {loadingHistory ? (
          <p>Loading history…</p>
        ) : history.length === 0 ? (
          <p>No uploads yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={historyItemStyle}
              >
                <div>
                  <strong>{item.file_name}</strong>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.6,
                    }}
                  >
                    {new Date(
                      item.created_at
                    ).toLocaleString()}
                  </div>
                </div>

                <div>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   STATUS BADGE
===================================================== */

function StatusBadge({
  status,
}: {
  status: "processing" | "completed" | "failed";
}) {
  let bg = "#e5e7eb";
  let text = "#374151";

  if (status === "processing") {
    bg = "#fef3c7";
    text = "#92400e";
  }

  if (status === "completed") {
    bg = "#dcfce7";
    text = "#166534";
  }

  if (status === "failed") {
    bg = "#fee2e2";
    text = "#991b1b";
  }

  return (
    <span
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: bg,
        color: text,
      }}
    >
      {status}
    </span>
  );
}

/* =====================================================
   STYLES
===================================================== */

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
  marginBottom: 24,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 16,
};

const primaryBtn: React.CSSProperties = {
  marginTop: 16,
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const historyItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 16,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
};
