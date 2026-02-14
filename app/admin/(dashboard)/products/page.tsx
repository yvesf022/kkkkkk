"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  /* ============ LOAD PRODUCTS ============ */
  async function loadProducts() {
    try {
      const res = await fetch(`${API_URL}/api/products`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("Products loaded:", data); // Debug
      setProducts(data);
    } catch (err: any) {
      console.error("Load error:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  /* ============ RENDER ============ */
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6 }}>
            Products
          </h1>
          <p style={{ fontSize: 15, opacity: 0.65 }}>
            {products.length} products in catalog
          </p>
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="btn btnGhost"
            onClick={() => router.push("/admin/products/bulk-upload")}
            style={{ whiteSpace: "nowrap" }}
          >
            📊 Bulk Upload
          </button>

          <button
            className="btn btnPrimary"
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ whiteSpace: "nowrap" }}
          >
            {showCreateForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>
      </header>

      {/* CREATE FORM */}
      {showCreateForm && (
        <CreateProductForm
          onSuccess={() => {
            setShowCreateForm(false);
            loadProducts();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* PRODUCTS GRID */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: 400,
                borderRadius: 20,
                background: "#f8fafc",
              }}
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div
          style={{
            padding: 80,
            textAlign: "center",
            borderRadius: 22,
            background: "linear-gradient(135deg, #ffffff, #f8fbff)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 24 }}>📦</div>
          <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
            No products yet
          </h3>
          <p style={{ fontSize: 16, opacity: 0.65, marginBottom: 32 }}>
            Get started by adding your first product or uploading in bulk
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn btnPrimary"
              onClick={() => setShowCreateForm(true)}
            >
              + Add Product
            </button>
            <button
              className="btn btnGhost"
              onClick={() => router.push("/admin/products/bulk-upload")}
            >
              📊 Bulk Upload CSV
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => router.push(`/admin/products/${product.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ PRODUCT CARD ============ */

function ProductCard({ product, onClick }: any) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 20,
        background: "linear-gradient(135deg, #ffffff, #f8fbff)",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 24px 60px rgba(15,23,42,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 18px 50px rgba(15,23,42,0.12)";
      }}
    >
      {/* IMAGE */}
      <div
        style={{
          height: 240,
          background: product.main_image
            ? `url(${product.main_image}) center/cover`
            : "linear-gradient(135deg, #e0e7ff, #dbeafe)",
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        {!product.main_image && (
          <div style={{ fontSize: 48, opacity: 0.3 }}>📦</div>
        )}
        
        {/* Stock Badge */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "6px 12px",
            borderRadius: 999,
            background: product.stock > 0 ? "#dcfce7" : "#fee2e2",
            color: product.stock > 0 ? "#166534" : "#991b1b",
            fontSize: 11,
            fontWeight: 900,
          }}
        >
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: 20 }}>
        {/* Category & Store */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {product.category && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: 999,
                background: "#e0e7ff",
                color: "#3730a3",
              }}
            >
              {product.category}
            </div>
          )}
          
          {product.store && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: 999,
                background: "#fef3c7",
                color: "#92400e",
              }}
            >
              {product.store}
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 17,
            fontWeight: 900,
            marginBottom: 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            lineHeight: 1.3,
          }}
        >
          {product.title}
        </h3>

        {/* Price & Rating */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            R {Math.round(product.price).toLocaleString()}
          </div>

          {product.rating && product.rating > 0 && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              ⭐ {product.rating.toFixed(1)} ({product.rating_number || 0})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ CREATE FORM ============ */

function CreateProductForm({ onSuccess, onCancel }: any) {
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [store, setStore] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [category, setCategory] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !price || !stock) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        title,
        price: parseFloat(price),
        stock: parseInt(stock),
      };

      if (shortDescription) payload.short_description = shortDescription;
      if (description) payload.description = description;
      if (sku) payload.sku = sku;
      if (brand) payload.brand = brand;
      if (store) payload.store = store;
      if (comparePrice) payload.compare_price = parseFloat(comparePrice);
      if (category) payload.category = category;
      if (mainCategory) payload.main_category = mainCategory;

      const res = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.detail || "Failed to create");
      }

      toast.success("Product created! Add images next.");
      onSuccess();

      window.location.href = `/admin/products/${result.id}`;
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 32,
        borderRadius: 22,
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
        marginBottom: 32,
      }}
    >
      <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24 }}>
        Create New Product
      </h2>

      <div style={{ display: "grid", gap: 20 }}>
        {/* BASIC INFO */}
        <div style={{ display: "grid", gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, opacity: 0.8 }}>
            Basic Information
          </h3>

          <div>
            <label style={labelStyle}>
              Product Title <span style={{ color: "#991b1b" }}>*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter product name"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Short Description</label>
            <input
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief description"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Full Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description..."
              rows={4}
              style={inputStyle}
            />
          </div>
        </div>

        {/* PRICING */}
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={labelStyle}>
              Price <span style={{ color: "#991b1b" }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Stock <span style={{ color: "#991b1b" }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* ORGANIZATION */}
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={labelStyle}>Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Beauty, Fashion"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Brand</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Brand name"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={labelStyle}>Store</label>
            <input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="Store name"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Product SKU"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 28,
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          className="btn btnGhost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>

        <button type="submit" className="btn btnPrimary" disabled={saving}>
          {saving ? "Creating..." : "Create Product"}
        </button>
      </div>
    </form>
  );
}

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
  transition: "all 0.2s ease",
};