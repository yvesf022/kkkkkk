"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { productsApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default function AdminProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function loadProducts() {
    try {
      const data = await productsApi.list();
      setProducts(data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
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
          <h1 style={{ fontSize: 32, fontWeight: 900 }}>Products</h1>
          <p style={{ opacity: 0.6 }}>
            {products.length} products in catalog
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn btnGhost"
            onClick={() => router.push("/admin/products/bulk-upload")}
          >
            📊 Bulk Upload
          </button>

          <button
            className="btn btnPrimary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>
      </header>

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
        <p>Loading products…</p>
      ) : products.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            borderRadius: 20,
            background: "#ffffff",
            boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          }}
        >
          <h3 style={{ fontSize: 22, fontWeight: 900 }}>
            No products yet
          </h3>
          <p style={{ opacity: 0.6 }}>
            Add your first product to start selling.
          </p>
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
              onClick={() =>
                router.push(`/admin/products/${product.id}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= PRODUCT CARD ================= */

function ProductCard({
  product,
  onClick,
}: {
  product: ProductListItem;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 18,
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          height: 220,
          background: product.main_image
            ? `url(${product.main_image}) center/cover`
            : "#f1f5f9",
          display: "grid",
          placeItems: "center",
        }}
      >
        {!product.main_image && (
          <span style={{ fontSize: 40, opacity: 0.3 }}>📦</span>
        )}
      </div>

      <div style={{ padding: 18 }}>
        {product.category && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 8,
              opacity: 0.7,
            }}
          >
            {product.category}
          </div>
        )}

        <h3
          style={{
            fontSize: 16,
            fontWeight: 900,
            marginBottom: 10,
          }}
        >
          {product.title}
        </h3>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            M {Math.round(product.price).toLocaleString("en-ZA")}
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 999,
              background:
                product.stock > 0 ? "#dcfce7" : "#fee2e2",
              color:
                product.stock > 0 ? "#166534" : "#991b1b",
            }}
          >
            {product.stock > 0
              ? `${product.stock} in stock`
              : "Out of stock"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= CREATE FORM ================= */

function CreateProductForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !price || !stock) {
      toast.error("Title, price and stock required");
      return;
    }

    setSaving(true);

    try {
      const result: any = await productsApi.create({
        title,
        price: parseFloat(price),
        stock: parseInt(stock),
      });

      toast.success("Product created");
      onSuccess();

      window.location.href = `/admin/products/${result.id}`;
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 24,
        borderRadius: 20,
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.08)",
        marginBottom: 32,
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 900 }}>
        Create Product
      </h2>

      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button
          type="button"
          className="btn btnGhost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn btnPrimary"
          disabled={saving}
        >
          {saving ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.15)",
  fontSize: 14,
};
