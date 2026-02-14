"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { productsApi } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ================= LOAD PRODUCT ================= */

  async function loadProduct() {
    try {
      const data = await productsApi.get(id);
      setProduct(data);
    } catch {
      toast.error("Failed to load product");
      router.replace("/admin/products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadProduct();
  }, [id]);

  /* ================= UPDATE PRODUCT ================= */

  async function handleSave() {
    if (!product) return;

    setSaving(true);

    try {
      await productsApi.update(product.id, {
        title: product.title,
        short_description: product.short_description,
        description: product.description,
        price: product.price,
        compare_price: product.compare_price,
        stock: product.stock,
        category: product.category,
        brand: product.brand,
        sku: product.sku,
      });

      toast.success("Product updated");
      await loadProduct();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  /* ================= IMAGE UPLOAD ================= */

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file || !product) return;

    setUploading(true);

    try {
      await productsApi.uploadImage(product.id, file);
      toast.success("Image uploaded");
      await loadProduct();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    try {
      await productsApi.deleteImage(imageId);
      toast.success("Image deleted");
      await loadProduct();
    } catch {
      toast.error("Failed to delete image");
    }
  }

  if (loading) return <p>Loading product…</p>;
  if (!product) return null;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Edit Product
        </h1>
        <p style={{ opacity: 0.6 }}>
          ID: {product.id.slice(0, 8)}
        </p>
      </header>

      {/* BASIC INFO */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>Basic Info</h2>

        <Input
          label="Title"
          value={product.title}
          onChange={(v) =>
            setProduct({ ...product, title: v })
          }
        />

        <Input
          label="Short Description"
          value={product.short_description || ""}
          onChange={(v) =>
            setProduct({ ...product, short_description: v })
          }
        />

        <Textarea
          label="Description"
          value={product.description || ""}
          onChange={(v) =>
            setProduct({ ...product, description: v })
          }
        />

        <Input
          label="Category"
          value={product.category || ""}
          onChange={(v) =>
            setProduct({ ...product, category: v })
          }
        />

        <Input
          label="Brand"
          value={product.brand || ""}
          onChange={(v) =>
            setProduct({ ...product, brand: v })
          }
        />

        <Input
          label="SKU"
          value={product.sku || ""}
          onChange={(v) =>
            setProduct({ ...product, sku: v })
          }
        />
      </div>

      {/* PRICING */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>Pricing</h2>

        <Input
          label="Price"
          type="number"
          value={String(product.price)}
          onChange={(v) =>
            setProduct({ ...product, price: Number(v) })
          }
        />

        <Input
          label="Compare Price"
          type="number"
          value={String(product.compare_price || "")}
          onChange={(v) =>
            setProduct({
              ...product,
              compare_price: v ? Number(v) : null,
            })
          }
        />

        <Input
          label="Stock"
          type="number"
          value={String(product.stock)}
          onChange={(v) =>
            setProduct({ ...product, stock: Number(v) })
          }
        />
      </div>

      {/* IMAGES */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>Images</h2>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={uploading}
        />

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns:
              "repeat(auto-fill, minmax(150px, 1fr))",
            marginTop: 20,
          }}
        >
          {product.images?.map((img) => (
            <div key={img.id} style={imageCard}>
              <img
                src={img.image_url}
                alt=""
                style={{
                  width: "100%",
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />

              <button
                onClick={() =>
                  handleDeleteImage(img.id)
                }
                style={deleteBtn}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 24,
        }}
      >
        <button
          className="btn btnGhost"
          onClick={() => router.push("/admin/products")}
        >
          Back
        </button>

        <button
          className="btn btnPrimary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

/* ================= STYLES ================= */

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
};

const imageCard: React.CSSProperties = {
  border: "1px solid #eee",
  padding: 8,
  borderRadius: 10,
  background: "#fafafa",
};

const deleteBtn: React.CSSProperties = {
  marginTop: 6,
  width: "100%",
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "6px 8px",
  borderRadius: 6,
  fontWeight: 700,
  cursor: "pointer",
};
