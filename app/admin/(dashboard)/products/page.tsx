"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES (DB-ALIGNED)
====================== */

type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
  stock: number;
  rating?: number;
  brand?: string;
  main_image: string;
};

/* ======================
   PAGE
====================== */

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [img, setImg] = useState("");
  const [brand, setBrand] = useState("");
  const [rating, setRating] = useState("");
  const [description, setDescription] = useState("");

  /* ======================
     LOAD PRODUCTS
  ====================== */
  async function loadProducts() {
    try {
      const res = await fetch(`${API}/api/products`);
      if (!res.ok) throw new Error("Failed to load products");
      setProducts(await res.json());
    } catch (err: any) {
      toast.error(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  /* ======================
     CREATE PRODUCT
  ====================== */
  async function createProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!img) {
      toast.error("Please upload a product image first");
      return;
    }

    setSaving(true);
    toast.loading("Creating product…", { id: "create" });

    try {
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          short_description: description.slice(0, 120),
          description,
          price: Number(price),
          category,
          stock: Number(stock),
          img,
          brand: brand || null,
          rating: rating ? Number(rating) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Product creation failed");
      }

      toast.success("✅ Product created successfully", {
        id: "create",
      });

      // reset form
      setTitle("");
      setPrice("");
      setCategory("");
      setStock("");
      setImg("");
      setBrand("");
      setRating("");
      setDescription("");

      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "❌ Product creation failed", {
        id: "create",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>
        Products
      </h1>

      {/* ======================
          ADD PRODUCT
      ====================== */}
      <form
        onSubmit={createProduct}
        className="card"
        style={{ maxWidth: 560, display: "grid", gap: 12 }}
      >
        <h3>Add Product</h3>

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Price"
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

        <input
          type="number"
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          required
        />

        <input
          placeholder="Brand (optional)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />

        <input
          type="number"
          min={1}
          max={5}
          placeholder="Rating (1–5, optional)"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        />

        {/* IMAGE UPLOAD */}
        <ProductImageUploader
          value={img}
          onChange={(url) => {
            setImg(url);
            toast.success("✅ Image uploaded successfully");
          }}
        />

        <button
          className="btn btnTech"
          disabled={saving}
        >
          {saving ? "Creating…" : "Create Product"}
        </button>
      </form>

      {/* ======================
          PRODUCT LIST
      ====================== */}
      <section>
        <h3>Existing Products</h3>

        {loading && <p>Loading…</p>}

        <div style={{ display: "grid", gap: 12 }}>
          {products.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{ display: "flex", gap: 14 }}
            >
              <img
                src={`${API}${p.main_image}`}
                alt={p.title}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: 10,
                }}
              />

              <div style={{ flex: 1 }}>
                <strong>{p.title}</strong>
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.6,
                  }}
                >
                  {p.category} • Stock: {p.stock}
                </div>
              </div>

              <Link
                href={`/admin/products/${p.id}`}
                className="btn btnGhost"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
