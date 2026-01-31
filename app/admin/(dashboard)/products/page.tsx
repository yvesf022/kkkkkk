"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/admin/ProductImageUploader";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */

type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  stock: number;
  rating?: number;
  sku?: string;
  brand?: string;
  description?: string;
};

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* FORM STATE */
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [img, setImg] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [rating, setRating] = useState("");
  const [description, setDescription] = useState("");

  /* ======================
     LOAD PRODUCTS
  ====================== */
  async function loadProducts() {
    try {
      const res = await fetch(`${API}/api/products`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.detail || "Failed to load products");
      }
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
     ADD PRODUCT
  ====================== */
  async function addProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!img) {
      toast.error("Product image is required");
      return;
    }

    toast.success("Image uploaded successfully");

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price: Number(price),
          category,
          stock: Number(stock),
          img,
          sku: sku || undefined,
          brand: brand || undefined,
          rating: rating ? Number(rating) : undefined,
          description: description || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to create product");
      }

      toast.success(`Product created: ${data?.title || title}`);

      setTitle("");
      setPrice("");
      setCategory("");
      setStock("");
      setImg("");
      setSku("");
      setBrand("");
      setRating("");
      setDescription("");

      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  /* ======================
     DELETE PRODUCT
  ====================== */
  async function deleteProduct(p: Product) {
    if (
      !confirm(
        `Delete "${p.title}"?\nThis action cannot be undone.`
      )
    )
      return;

    try {
      const res = await fetch(`${API}/api/products/${p.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Delete failed");
      }

      toast.success("Product deleted");
      setProducts((x) => x.filter((y) => y.id !== p.id));
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  return (
    <div style={{ display: "grid", gap: 36 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Products
        </h1>
        <p style={{ opacity: 0.6 }}>
          Manage catalog, pricing, and inventory
        </p>
      </header>

      {/* ADD PRODUCT */}
      <section className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ fontWeight: 900 }}>
          Add New Product
        </h3>

        <form
          onSubmit={addProduct}
          style={{ display: "grid", gap: 12, marginTop: 14 }}
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
            placeholder="Category (e.g. beauty, tech)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />

          <input
            type="number"
            placeholder="Stock quantity"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />

          <input
            placeholder="SKU (optional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />

          <input
            placeholder="Brand (optional)"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />

          <input
            type="number"
            placeholder="Rating 1–5 (optional)"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />

          <textarea
            placeholder="Product description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <ProductImageUploader value={img} onChange={setImg} />

          <button className="btn btnTech" disabled={saving}>
            {saving ? "Saving…" : "Create Product"}
          </button>
        </form>
      </section>

      {/* PRODUCT LIST */}
      <section>
        <h3 style={{ fontWeight: 900 }}>
          Existing Products
        </h3>

        {loading && <p>Loading…</p>}

        <div style={{ display: "grid", gap: 14 }}>
          {products.map((p) => {
            const stockState =
              p.stock === 0
                ? "out"
                : p.stock < 5
                ? "low"
                : "ok";

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  border:
                    stockState === "out"
                      ? "2px solid #fecaca"
                      : stockState === "low"
                      ? "2px solid #fde68a"
                      : undefined,
                }}
              >
                <img
                  src={p.img}
                  alt={p.title}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: "cover",
                    borderRadius: 12,
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>
                    {p.title}
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.6 }}>
                    {p.category} • Stock: {p.stock}
                  </div>
                </div>

                <div style={{ fontWeight: 900 }}>
                  {fmtM(p.price)}
                </div>

                <Link
                  href={`/admin/products/${p.id}`}
                  className="btn btnGhost"
                >
                  Edit
                </Link>

                <button
                  className="btn btnGhost"
                  onClick={() => deleteProduct(p)}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
