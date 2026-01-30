"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/admin/ProductImageUploader";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Product = {
  id: string;
  title: string;
  price: number;
  img: string; // ✅ MUST remain string
  category: string;
  stock: number;
  rating?: number;
  sku?: string;
  brand?: string;
  description?: string;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // FORM STATE
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [img, setImg] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [rating, setRating] = useState("");
  const [description, setDescription] = useState("");

  async function loadProducts() {
    try {
      const res = await fetch(`${API}/api/products`);
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

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!img) {
      toast.error("Product image is required");
      return;
    }

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

      if (!res.ok) throw new Error();

      toast.success("Product created");

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
    } catch {
      toast.error("Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;

    try {
      const res = await fetch(`${API}/api/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      toast.success("Product deleted");
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Products</h1>
        <p style={{ opacity: 0.6 }}>Full product catalog management</p>
      </header>

      {/* ADD PRODUCT */}
      <section className="card">
        <h3>Add New Product</h3>

        <form onSubmit={addProduct} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <input placeholder="Product title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input type="number" placeholder="Price (M)" value={price} onChange={(e) => setPrice(e.target.value)} required />
          <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
          <input type="number" placeholder="Stock quantity" value={stock} onChange={(e) => setStock(e.target.value)} required />
          <input placeholder="SKU (optional)" value={sku} onChange={(e) => setSku(e.target.value)} />
          <input placeholder="Brand (optional)" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <input type="number" placeholder="Rating 1–5 (optional)" value={rating} onChange={(e) => setRating(e.target.value)} />
          <textarea placeholder="Product description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <ProductImageUploader value={img} onChange={setImg} />

          <button className="btn btnTech" disabled={saving}>
            {saving ? "Saving…" : "Create Product"}
          </button>
        </form>
      </section>

      {/* LIST */}
      <section>
        <h3>Existing Products</h3>
        {loading && <p>Loading…</p>}

        <div style={{ display: "grid", gap: 14 }}>
          {products.map((p) => (
            <div key={p.id} className="card" style={{ display: "flex", gap: 14 }}>
              <img src={p.img} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 10 }} />

              <div style={{ flex: 1 }}>
                <b>{p.title}</b>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  {p.category} • Stock: {p.stock}
                </div>
              </div>

              <div style={{ fontWeight: 900 }}>M{p.price}</div>

              <Link href={`/admin/products/${p.id}`} className="btn btnGhost">
                Edit
              </Link>

              <button className="btn btnGhost" onClick={() => deleteProduct(p.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
