"use client";

import { useState } from "react";
import { bulkUploadApi } from "@/lib/api";

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  async function validate() {
    if (!file) return;
    const data = await bulkUploadApi.validate(file);
    setResult(data);
  }

  async function previewFile() {
    if (!file) return;
    const data = await bulkUploadApi.preview(file);
    setPreview(data);
  }

  async function upload() {
    if (!file) return;
    await bulkUploadApi.upload(file);
    alert("Upload successful");
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        Bulk Upload Products
      </h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginTop: 20 }}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={validate} style={btn}>Validate</button>
        <button onClick={previewFile} style={btn}>Preview</button>
        <button onClick={upload} style={btnGreen}>Upload</button>
      </div>

      {result && (
        <pre style={box}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      {preview && (
        <pre style={box}>
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  );
}

const btn = {
  padding: "8px 12px",
  marginRight: 8,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};

const btnGreen = { ...btn, background: "#dcfce7" };

const box = {
  marginTop: 20,
  background: "#f1f5f9",
  padding: 12,
  borderRadius: 8,
};
