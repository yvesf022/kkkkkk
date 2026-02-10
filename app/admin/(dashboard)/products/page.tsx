"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { listProducts, createProduct } from "@/lib/products";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
  stock: number;
  in_stock: boolean;
  main_image?: string | null;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");

  async function loadProducts() {
    try {
      const data = await listProducts();
      setProducts(data as Product[]);
    } catch (err: any) {
      toast.error(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    await toast.promise(
      (async () => {
        const product = await createProduct({
          title,
          description,
          price: Number(price),
          category,
          stock: Number(stock),
        });

        // Reset form
        setTitle("");
        setPrice("");
        setCategory("");
        setStock("");
        setDescription("");

        await loadProducts();
        return product;
      })(),
      {
        loading: "Creating product…",
        success: (product) => `✅ Product "${product.title}" created successfully (ID: ${product.id})`,
        error: (err) => err.message || "Product creation failed",
      }
    );

    setSaving(false);
  }

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Products</h1>

      {/* Add Product */}
      <form onSubmit={handleCreateProduct} className="card" style={{ maxWidth: 520, display: "grid", gap: 12 }}>
        <h3>Add Product</h3>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
        <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required />
        <button className="btn btnTech" disabled={saving}>
          {saving ? "Creating…" : "Create Product"}
        </button>
        <p style={{ fontSize: 12, opacity: 0.6 }}>Images can be uploaded after product creation.</p>
      </form>

      {/* Product List */}
      <section>
        <h3>Existing Products</h3>
        {loading && <p>Loading…</p>}
        <div style={{ display: "grid", gap: 12 }}>
          {products.map((p) => (
            <div key={p.id} className="card" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 14 }}>
                {p.main_image && (
                  <img
                    src={p.main_image}
                    alt={p.title}
                    style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <strong>{p.title}</strong>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>
                    {p.category} • Stock: {p.stock}
                  </div>
                </div>
                <Link href={`/admin/products/${p.id}`} className="btn btnGhost">
                  Manage
                </Link>
              </div>

              {/* Inline image uploader */}
              <ProductImageUploader productId={p.id} onChange={() => {}} onUploaded={loadProducts} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
