"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { productsApi } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Props = {
  productId: string; // 🔒 REQUIRED by backend
  value?: string;    // backend image URL (/uploads/...)
  onChange: (url: string) => void;
};

/** ✅ BACKEND RESPONSE SHAPE */
type UploadImageResponse = {
  url: string;
};

/**
 * PRODUCT IMAGE UPLOADER — AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - POST /api/products/admin/{product_id}/images
 * - Field name: "file"
 * - Admin cookie required
 *
 * NOTES:
 * - Uploads ONE image
 * - Returns uploaded image URL
 * - Does NOT manage ordering or main-image state
 */

export default function ProductImageUploader({
  productId,
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
      const result =
        (await productsApi.uploadImage(
          productId,
          file
        )) as UploadImageResponse;

      if (!result.url) {
        throw new Error("Invalid upload response");
      }

      onChange(result.url);
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      toast.error(
        err?.message || "Image upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  const previewSrc =
    preview && preview.startsWith("blob:")
      ? preview
      : preview
      ? `${API}${preview}`
      : null;

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
