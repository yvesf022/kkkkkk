"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default function AdminProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [original, setOriginal] = useState<ProductListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ============ LOAD PRODUCT ============ */
  useEffect(() => {
    async function load() {
      try {
        // ✅ FIX: Cast to correct type
        const data = (await productsApi.list()) as ProductListItem[];
        const found = data.find((p) => p.id === id);

        if (!found) {
          toast.error("Product not found");
          router.replace("/admin/products");
          return;
        }

        setProduct(found);
        setOriginal(found);
      } catch (err: any) {
        toast.error(err.message || "Failed to load product");
        router.replace("/admin/products");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  /* ============ CHECK IF DIRTY ============ */
  const dirty = JSON.stringify(product) !== JSON.stringify(original);

  /* ============ SAVE CHANGES ============ */
  async function save() {
    if (!product) return;

    if (product.price < 0 || product.stock < 0) {
      toast.error("Price and stock must be non-negative");
      return;
    }

    setSaving(true);

    try {
      await productsApi.update(product.id, {
        title: product.title,
        short_description: product.short_description,
        description: product.short_description, // Using short_description as description
        price: product.price,
        category: product.category,
        stock: product.stock,
        brand: product.brand,
      });

      toast.success("Product updated successfully");
      setOriginal(product);

      // Reload to get updated data
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  /* ============ UPLOAD IMAGES ============ */
  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      // Upload each image
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        await productsApi.uploadImage(product!.id, file);
      }

      toast.success(`${files.length} image(s) uploaded successfully`);

      // Reload product to show new images
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ============ DELETE IMAGE ============ */
  async function deleteImage(imageId: string) {
    if (!confirm("Delete this image?")) return;

    try {
      await productsApi.deleteImage(imageId);
      toast.success("Image deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete image");
    }
  }

  /* ============ SET MAIN IMAGE ============ */
  async function setMainImage(imageId: string) {
    try {
      await productsApi.setMainImage(imageId);
      toast.success("Main image updated");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to set main image");
    }
  }

  /* ============ LOADING STATE ============ */
  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            height: 400,
            borderRadius: 22,
            background: "#f8fafc",
            display: "grid",
            placeItems: "center",
          }}
        >
          <p style={{ opacity: 0.6 }}>Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images || [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <button
          className="btn btnGhost"
          onClick={() => router.push("/admin/products")}
          style={{ marginBottom: 16 }}
        >
          ← Back to Products
        </button>

        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
          Edit Product
        </h1>
        <p style={{ fontSize: 15, opacity: 0.65 }}>
          Manage product details, images, and inventory
        </p>
      </header>

      <div style={{ display: "grid", gap: 28 }}>
        {/* IMAGES SECTION */}
        <section
          style={{
            padding: 32,
            borderRadius: 22,
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 900 }}>Product Images</h2>

            <button
              className="btn btnPrimary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "+ Add Images"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleImageUpload(e.target.files)}
            />
          </div>

          {/* IMAGE GRID */}
          {Array.isArray(images) && images.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              {images.map((imgUrl: string, idx: number) => (
                <div
                  key={`${imgUrl}-${idx}`}
                  style={{
                    position: "relative",
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "2px solid rgba(15,23,42,0.1)",
                    background: "#f8fafc",
                  }}
                >
                  {/* IMAGE */}
                  <div
                    style={{
                      height: 200,
                      background: `url(${imgUrl}) center/cover`,
                    }}
                  />

                  {/* MAIN BADGE */}
                  {idx === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "#dcfce7",
                        color: "#166534",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      MAIN
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                borderRadius: 16,
                background: "#f8fafc",
                border: "2px dashed rgba(15,23,42,0.2)",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                No images yet
              </p>
              <p style={{ fontSize: 14, opacity: 0.6, marginBottom: 20 }}>
                Upload product images to showcase your product
              </p>
              <button
                className="btn btnPrimary"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Images
              </button>
            </div>
          )}
        </section>

        {/* BASIC INFO */}
        <section
          style={{
            padding: 32,
            borderRadius: 22,
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 24 }}>
            Basic Information
          </h2>

          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <label style={labelStyle}>Product Title</label>
              <input
                value={product.title || ""}
                onChange={(e) =>
                  setProduct({ ...product, title: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Short Description</label>
              <textarea
                value={product.short_description || ""}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    short_description: e.target.value,
                  })
                }
                placeholder="Brief product description..."
                rows={4}
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* PRICING & INVENTORY */}
        <div style={{ display: "grid", gap: 28, gridTemplateColumns: "1fr 1fr" }}>
          {/* PRICING */}
          <section
            style={{
              padding: 32,
              borderRadius: 22,
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 24 }}>
              Pricing
            </h2>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={labelStyle}>Price (R)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={product.price || ""}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  style={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* INVENTORY */}
          <section
            style={{
              padding: 32,
              borderRadius: 22,
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 24 }}>
              Inventory
            </h2>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={labelStyle}>Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={product.stock || ""}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  style={inputStyle}
                />
              </div>
            </div>
          </section>
        </div>

        {/* ORGANIZATION */}
        <section
          style={{
            padding: 32,
            borderRadius: 22,
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 24 }}>
            Organization
          </h2>

          <div
            style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}
          >
            <div>
              <label style={labelStyle}>Category</label>
              <input
                value={product.category || ""}
                onChange={(e) =>
                  setProduct({ ...product, category: e.target.value })
                }
                placeholder="e.g., Electronics, Fashion"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Brand</label>
              <input
                value={product.brand || ""}
                onChange={(e) =>
                  setProduct({ ...product, brand: e.target.value })
                }
                placeholder="Brand name"
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "24px 0",
          }}
        >
          <button
            className="btn btnGhost"
            onClick={() => router.push("/admin/products")}
          >
            Cancel
          </button>

          <button
            className="btn btnPrimary"
            disabled={!dirty || saving}
            onClick={save}
            style={{ minWidth: 160 }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ STYLES ============ */

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 6,
  opacity: 0.8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.15)",
  fontSize: 14,
  fontWeight: 600,
  background: "rgba(255,255,255,0.95)",
};
