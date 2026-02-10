"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { productsApi } from "@/lib/api";

type Props = {
  productId: string;
  value?: string; // Cloudinary URL
  onChange: (url: string) => void;
  onUploaded?: () => void; // optional callback to refresh product list
};

type UploadImageResponse = {
  url: string;
};

export default function ProductImageUploader({
  productId,
  value,
  onChange,
  onUploaded,
}: Props) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMessage(null);
  }

  async function uploadImage() {
    if (!file) {
      toast.error("Please select an image first");
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const result = (await productsApi.uploadImage(productId, file)) as UploadImageResponse;

      if (!result?.url) throw new Error("Invalid upload response");

      setPreview(result.url);
      onChange(result.url);

      toast.success("✅ Image uploaded successfully");
      setMessage(`Image uploaded successfully for product ID: ${productId}`);

      if (onUploaded) onUploaded();
    } catch (err: any) {
      const errorMsg = err?.message || "Image upload failed";
      toast.error(errorMsg);
      setMessage(errorMsg);
    } finally {
      setUploading(false);
    }
  }

  const previewSrc =
    preview?.startsWith("blob:") || preview?.startsWith("http") ? preview : null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {previewSrc && (
        <img
          src={previewSrc}
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

      <input type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading} />

      <button
        type="button"
        className="btn btnGhost"
        onClick={uploadImage}
        disabled={uploading}
      >
        {uploading ? "Uploading…" : "Upload Image"}
      </button>

      {message && (
        <div style={{ fontSize: 12, opacity: 0.8, color: message.includes("successfully") ? "green" : "red" }}>
          {message}
        </div>
      )}

      {value && (
        <div style={{ fontSize: 12, opacity: 0.6, wordBreak: "break-all" }}>
          Image URL: {value}
        </div>
      )}
    </div>
  );
}
