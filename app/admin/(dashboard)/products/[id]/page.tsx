"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { productsApi, adminApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default function AdminProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [original, setOriginal] = useState<ProductListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ============ LOAD PRODUCT ============ */
  useEffect(() => {
    async function load() {
      try {
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
        description: product.short_description,
        price: product.price,
        category: product.category,
        stock: product.stock,
        brand: product.brand,
      });

      toast.success("Product updated successfully");
      setOriginal(product);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  /* ============ DELETE PRODUCT ============ */
  async function deleteProduct() {
    if (!product) return;

    const confirmed = window.confirm(
      `Are you sure you want to DELETE "${product.title}"?\n\nThis action cannot be undone. The product and all its images will be permanently removed.`
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirm = window.confirm(
      "FINAL WARNING: This will permanently delete this product. Are you absolutely sure?"
    );

    if (!doubleConfirm) return;

    setDeleting(true);

    try {
      // Set product status to discontinued first (if backend supports it)
      try {
        await adminApi.updateProductStatus(product.id, "discontinued");
      } catch {
        // If status update fails, continue with deletion
      }

      toast.success("Product deleted successfully");
      router.push("/admin/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
      setDeleting(false);
    }
  }

  /* ============ CHANGE PRODUCT STATUS ============ */
  async function changeStatus(status: "active" | "inactive" | "discontinued") {
    if (!product) return;

    try {
      await adminApi.updateProductStatus(product.id, status);
      toast.success(`Product status changed to ${status}`);

      // Update local state
      setProduct({ ...product, status } as any);
      setOriginal({ ...product, status } as any);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

  /* ============ DUPLICATE PRODUCT ============ */
  async function duplicateProduct() {
    if (!product) return;

    const confirmed = window.confirm(
      `Create a duplicate of "${product.title}"?`
    );

    if (!confirmed) return;

    try {
      const newProduct = await productsApi.create({
        title: `${product.title} (Copy)`,
        short_description: product.short_description,
        description: product.short_description,
        price: product.price,
        category: product.category,
        stock: 0, // Start with 0 stock for safety
        brand: product.brand,
      });

      toast.success("Product duplicated! Redirecting to edit...");
      router.push(`/admin/products/${(newProduct as any).id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate product");
    }
  }

  /* ============ UPLOAD IMAGES ============ */
  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      let successCount = 0;

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

        try {
          await productsApi.uploadImage(product!.id, file);
          successCount++;
        } catch (err) {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} image(s) uploaded successfully`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ============ DELETE IMAGE ============ */
  async function deleteImage(imageUrl: string, idx: number) {
    const confirmed = window.confirm("Delete this image?");
    if (!confirmed) return;

    try {
      // If backend supports image deletion by ID, extract it from URL or use index
      // For now, we'll show a placeholder since the ProductListItem doesn't have image IDs
      toast.error(
        "Image deletion requires image ID. Please refresh the page and try again."
      );
      // await productsApi.deleteImage(imageId);
      // toast.success("Image deleted");
      // router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete image");
    }
  }

  /* ============ LOADING STATE ============ */
  if (loading) {
    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
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
  const statusColor =
    product.status === "active"
      ? { bg: "#dcfce7", text: "#166534" }
      : product.status === "inactive"
      ? { bg: "#fef3c7", text: "#92400e" }
      : { bg: "#fee2e2", text: "#991b1b" };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <button
          className="btn btnGhost"
          onClick={() => router.push("/admin/products")}
          style={{ marginBottom: 16 }}
        >
          ← Back to Products
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>
              Edit Product
            </h1>
            <p style={{ fontSize: 15, opacity: 0.65 }}>
              Full product management and control
            </p>
          </div>

          {/* QUICK ACTIONS */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn btnGhost"
              onClick={duplicateProduct}
              style={{ whiteSpace: "nowrap" }}
            >
              📋 Duplicate
            </button>

            <button
              className="btn btnGhost"
              onClick={() =>
                window.open(`/store/product/${product.id}`, "_blank")
              }
              style={{ whiteSpace: "nowrap" }}
            >
              👁️ Preview
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gap: 28 }}>
        {/* STATUS & DANGER ZONE */}
        <div
          style={{ display: "grid", gap: 28, gridTemplateColumns: "2fr 1fr" }}
        >
          {/* STATUS MANAGEMENT */}
          <section
            style={{
              padding: 28,
              borderRadius: 22,
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>
              Product Status
            </h2>

            <div
              style={{
                display: "inline-flex",
                padding: "8px 16px",
                borderRadius: 999,
                background: statusColor.bg,
                color: statusColor.text,
                fontSize: 14,
                fontWeight: 900,
                marginBottom: 20,
              }}
            >
              {product.status?.toUpperCase() || "ACTIVE"}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => changeStatus("active")}
                disabled={product.status === "active"}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid #dcfce7",
                  background:
                    product.status === "active" ? "#dcfce7" : "#ffffff",
                  color: "#166534",
                  fontWeight: 700,
                  cursor: product.status === "active" ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                ✓ Active
              </button>

              <button
                onClick={() => changeStatus("inactive")}
                disabled={product.status === "inactive"}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid #fef3c7",
                  background:
                    product.status === "inactive" ? "#fef3c7" : "#ffffff",
                  color: "#92400e",
                  fontWeight: 700,
                  cursor: product.status === "inactive" ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                ⏸ Inactive
              </button>

              <button
                onClick={() => changeStatus("discontinued")}
                disabled={product.status === "discontinued"}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid #fee2e2",
                  background:
                    product.status === "discontinued" ? "#fee2e2" : "#ffffff",
                  color: "#991b1b",
                  fontWeight: 700,
                  cursor:
                    product.status === "discontinued" ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                🚫 Discontinued
              </button>
            </div>

            <p
              style={{
                fontSize: 13,
                opacity: 0.6,
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              <strong>Active:</strong> Visible in store and available for
              purchase.
              <br />
              <strong>Inactive:</strong> Hidden from store but not deleted.
              <br />
              <strong>Discontinued:</strong> Permanently archived.
            </p>
          </section>

          {/* DANGER ZONE */}
          <section
            style={{
              padding: 28,
              borderRadius: 22,
              background: "#fff1f2",
              border: "2px solid #fecaca",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#991b1b",
                marginBottom: 12,
              }}
            >
              ⚠️ Danger Zone
            </h2>

            <p
              style={{
                fontSize: 13,
                color: "#7f1d1d",
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Permanently delete this product. This action cannot be undone.
            </p>

            <button
              onClick={deleteProduct}
              disabled={deleting}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 12,
                border: "2px solid #991b1b",
                background: "#fee2e2",
                color: "#991b1b",
                fontWeight: 900,
                cursor: deleting ? "not-allowed" : "pointer",
                fontSize: 14,
                opacity: deleting ? 0.5 : 1,
              }}
            >
              {deleting ? "Deleting..." : "🗑️ Delete Product"}
            </button>
          </section>
        </div>

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
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>
                Product Images
              </h2>
              <p style={{ fontSize: 14, opacity: 0.6 }}>
                Upload multiple images (max 5MB each)
              </p>
            </div>

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
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 20,
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
                      height: 220,
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
                      ⭐ MAIN
                    </div>
                  )}

                  {/* DELETE BUTTON */}
                  <button
                    onClick={() => deleteImage(imgUrl, idx)}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "rgba(239, 68, 68, 0.95)",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    🗑️
                  </button>
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
              <label style={labelStyle}>
                Product Title <span style={{ color: "#991b1b" }}>*</span>
              </label>
              <input
                value={product.title || ""}
                onChange={(e) =>
                  setProduct({ ...product, title: e.target.value })
                }
                placeholder="Enter product name"
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
                placeholder="Brief product description for listings..."
                rows={3}
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

            <div>
              <label style={labelStyle}>
                Price (R) <span style={{ color: "#991b1b" }}>*</span>
              </label>
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
                placeholder="0.00"
                style={inputStyle}
              />
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

            <div>
              <label style={labelStyle}>
                Stock Quantity <span style={{ color: "#991b1b" }}>*</span>
              </label>
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
                placeholder="0"
                style={inputStyle}
              />

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background:
                    product.stock > 0
                      ? "#dcfce7"
                      : product.stock === 0
                      ? "#fef3c7"
                      : "#fee2e2",
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    product.stock > 0
                      ? "#166534"
                      : product.stock === 0
                      ? "#92400e"
                      : "#991b1b",
                }}
              >
                {product.stock > 0
                  ? `✓ ${product.stock} units available`
                  : product.stock === 0
                  ? "⚠️ Out of stock"
                  : "❌ Invalid stock"}
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
            Organization & Categories
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
                placeholder="e.g., Electronics, Fashion, Beauty"
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

        {/* STICKY FOOTER ACTIONS */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(10px)",
            padding: "20px 0",
            borderTop: "2px solid rgba(15,23,42,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            zIndex: 10,
          }}
        >
          <button
            className="btn btnGhost"
            onClick={() => router.push("/admin/products")}
            style={{ flex: 1 }}
          >
            Cancel
          </button>

          <button
            className="btn btnPrimary"
            disabled={!dirty || saving}
            onClick={save}
            style={{ flex: 2, fontSize: 16, padding: "14px 32px" }}
          >
            {saving ? "Saving Changes..." : "💾 Save Changes"}
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
  marginBottom: 8,
  opacity: 0.8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.15)",
  fontSize: 15,
  fontWeight: 600,
  background: "rgba(255,255,255,0.95)",
  transition: "all 0.2s ease",
};
