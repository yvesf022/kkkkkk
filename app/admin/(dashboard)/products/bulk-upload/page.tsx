"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { bulkUploadApi } from "@/lib/api";

type UploadStatus = {
  id: string;
  filename: string;
  status: "processing" | "completed" | "failed";
  total_rows: number;
  success_count: number;
  error_count: number;
  errors?: string[];
  created_at: string;
};

export default function BulkUploadPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<UploadStatus | null>(null);
  const [history, setHistory] = useState<UploadStatus[]>([]);
  const [polling, setPolling] = useState(false);

  /* ============================
     LOAD HISTORY
  ============================ */
  async function loadHistory() {
    try {
      const data = await bulkUploadApi.listUploads();
      setHistory(data);
    } catch {
      toast.error("Failed to load upload history");
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  /* ============================
     POLL STATUS
  ============================ */
  useEffect(() => {
    if (!currentUpload || currentUpload.status !== "processing") return;

    setPolling(true);

    const interval = setInterval(async () => {
      try {
        const updated = await bulkUploadApi.getStatus(currentUpload.id);
        setCurrentUpload(updated);

        if (updated.status !== "processing") {
          clearInterval(interval);
          setPolling(false);
          loadHistory();

          if (updated.status === "completed") {
            toast.success("Bulk upload completed successfully");
          } else {
            toast.error("Bulk upload failed");
          }
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUpload]);

  /* ============================
     HANDLE FILE UPLOAD
  ============================ */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Only CSV files are allowed");
      return;
    }

    setUploading(true);

    try {
      const result = await bulkUploadApi.upload(file);
      setCurrentUpload(result);
      toast.success("Upload started. Processing...");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 1200 }}>
      {/* HEADER */}
      <header>
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          <Link href="/admin/products">Products</Link> › Bulk Upload
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          Bulk Product Upload
        </h1>

        <p style={{ opacity: 0.6, marginTop: 4 }}>
          Upload thousands of products via CSV file
        </p>
      </header>

      {/* UPLOAD CARD */}
      <div
        style={{
          padding: 32,
          borderRadius: 22,
          background: "#ffffff",
          border: "2px dashed rgba(15,23,42,0.15)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>

        <h2 style={{ fontSize: 20, fontWeight: 900 }}>
          Upload CSV File
        </h2>

        <p style={{ fontSize: 14, opacity: 0.6, marginTop: 8 }}>
          Required format:
          <br />
          title, main_category, price, description, features, images,
          store, categories, details, parent_asin, average_rating,
          rating_number
        </p>

        <button
          className="btn btnPrimary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ marginTop: 20 }}
        >
          {uploading ? "Uploading..." : "Select CSV File"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          hidden
          onChange={handleUpload}
        />
      </div>

      {/* CURRENT UPLOAD STATUS */}
      {currentUpload && (
        <div
          style={{
            padding: 24,
            borderRadius: 18,
            background:
              currentUpload.status === "processing"
                ? "#fff7ed"
                : currentUpload.status === "completed"
                ? "#dcfce7"
                : "#fee2e2",
          }}
        >
          <h3 style={{ fontWeight: 900, marginBottom: 12 }}>
            Current Upload Status
          </h3>

          <div style={{ display: "grid", gap: 6 }}>
            <div><strong>File:</strong> {currentUpload.filename}</div>
            <div><strong>Status:</strong> {currentUpload.status}</div>
            <div><strong>Total Rows:</strong> {currentUpload.total_rows}</div>
            <div><strong>Success:</strong> {currentUpload.success_count}</div>
            <div><strong>Errors:</strong> {currentUpload.error_count}</div>
          </div>

          {polling && (
            <p style={{ marginTop: 10, fontSize: 13, opacity: 0.6 }}>
              Processing... updating every 3 seconds
            </p>
          )}

          {currentUpload.errors && currentUpload.errors.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <strong>Error Details:</strong>
              <ul style={{ marginTop: 8 }}>
                {currentUpload.errors.map((err, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>
          Upload History
        </h2>

        {history.length === 0 && (
          <div className="card">No uploads yet.</div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {history.map((u) => (
            <div
              key={u.id}
              className="card"
              style={{
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{u.filename}</div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  {new Date(u.created_at).toLocaleString("en-ZA")}
                </div>
              </div>

              <div style={{ fontWeight: 800 }}>
                {u.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
