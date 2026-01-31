"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Props = {
  value?: string;
  onChange: (url: string) => void;
};

export default function ProductImageUploader({
  value,
  onChange,
}: Props) {
  const [preview, setPreview] = useState<string | null>(
    value || null
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function uploadImage() {
    if (!file) {
      toast.error("Please select an image first");
      return;
    }

    setUploading(true);

    try {
      const fd = new FormData();

      // 🔥 MUST be "file" — backend expects UploadFile = File(...)
      fd.append("file", file);

      const res = await fetch(
        `${API}/api/products/admin/upload-image`, // 🔥 correct route
        {
          method: "POST",
          credentials: "include", // admin cookie
          body: fd,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Upload failed");
      }

      if (!data.url) {
        throw new Error("Invalid upload response");
      }

      onChange(data.url); // e.g. /uploads/products/xyz.jpg
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {preview && (
        <img
          src={
            preview.startsWith("blob:")
              ? preview
              : `${API}${preview}`
          }
          alt="Preview"
          style={{
            width: 140,
            height: 140,
            objectFit: "cover",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
          }}
        />
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      <button
        type="button"
        className="btn btnGhost"
        onClick={uploadImage}
        disabled={uploading}
      >
        {uploading ? "Uploading…" : "Upload Image"}
      </button>

      {value && (
        <div
          style={{
            fontSize: 12,
            opacity: 0.6,
            wordBreak: "break-all",
          }}
        >
          Current image URL: {value}
        </div>
      )}
    </div>
  );
}
