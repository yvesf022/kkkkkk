"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [img, setImg] = useState("");

  /* ======================
     LOAD PRODUCTS
  ====================== */
  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/products`);
      if (!res.ok) throw new Error();
      setProducts(await res.json());
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  /* ======================
     ADD PRODUCT (ADMIN)
  ====================== */
  async function addProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!img) {
      toast.error("Please upload an image");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        credentials: "include", // 🔐 ADMIN COOKIE AUTH
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          price: Number(price),
          category,
          img,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Product added");
      setTitle("");
      setPrice("");
      setCategory("");
      setImg("");
      loadProducts();
    } catch {
      toast.error("Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  /* ======================
     DELETE PRODUCT
  ====================== */
  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;

    try {
      const res = await fetch(`${API}/api/products/${id}`, {
        method: "DELETE",
        credentials: "include", // 🔐 ADMIN COOKIE AUTH
      });

      if (!res.ok) throw new Error();

      toast.success("Product deleted");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Failed to delete product");
    }
  }

  return (
    <div style={{ display: "grid", gap: 32 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Products
        </h1>
        <p style={{ opacity: 0.6 }}>
          Manage store products
        </p>
      </header>

      {/* ADD PRODUCT */}
      <section className="card">
        <h3>Add Product</h3>

        <form
          onSubmit={addProduct}
          style={{
            display: "grid",
            gap: 12,
            maxWidth: 420,
          }}
        >
          <input
            placeholder="Product title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <input
            type="number"
            placeholder="Price (M)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <input
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />

          <ProductImageUploader
            value={img}
            onChange={setImg}
          />

          <button
            className="btn btnTech"
            disabled={saving}
          >
            {saving ? "Saving…" : "Add Product"}
          </button>
        </form>
      </section>

      {/* PRODUCT LIST */}
      <section>
        <h3>All Products</h3>

        {loading && <p>Loading products…</p>}

        <div
          style={{
            display: "grid",
            gap: 14,
            marginTop: 14,
          }}
        >
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: 14,
                borderRadius: 14,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
              }}
            >
              <img
                src={p.img}
                alt={p.title}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: 10,
                }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  {p.category}
                </div>
              </div>

              <div style={{ fontWeight: 900 }}>
                M {p.price.toLocaleString()}
              </div>

              <button
                className="btn btnGhost"
                onClick={() => deleteProduct(p.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
