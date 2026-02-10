"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { listProducts, getAdminProduct, createProduct } from "@/lib/products";
import type { Product, ProductListItem } from "@/lib/types";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");

  /* ======================
     LOAD PRODUCTS (ADMIN)
  ====================== */
  async function loadProducts() {
    try {
      const list: ProductListItem[] = await listProducts();
      const fullProducts: Product[] = await Promise.all(
        list.map((p) => getAdminProduct(p.id))
      );
      setProducts(fullProducts);
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
        success: (product) =>
          `✅ Product "${product.title}" created successfully (ID: ${product.id})`,
        error: (err) => err.message || "Product creation failed",
      }
    );

    setSaving(false);
  }

  return (
    <div className="grid gap-8">
      <h1 className="text-2xl font-bold">Products</h1>

      {/* Add Product */}
      <form
        onSubmit={handleCreateProduct}
        className="card max-w-md grid gap-3"
      >
        <h3 className="font-semibold">Add Product</h3>

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

        <button className="btn btnTech" disabled={saving}>
          {saving ? "Creating…" : "Create Product"}
        </button>

        <p className="text-xs opacity-60">
          Images can be uploaded after product creation.
        </p>
      </form>

      {/* Product List */}
      <section>
        <h3 className="font-semibold">Existing Products</h3>
        {loading && <p>Loading…</p>}
        <div className="grid gap-3">
          {products.map((p) => (
            <div key={p.id} className="card grid gap-3">
              <div className="flex gap-4 items-center">
                {p.main_image && (
                  <img
                    src={p.main_image}
                    alt={p.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <strong>{p.title}</strong>
                  <div className="text-sm opacity-60">
                    {p.category} • Stock: {p.stock} •{" "}
                    {p.in_stock ? "In Stock" : "Out of Stock"}
                  </div>
                </div>
                <Link href={`/admin/products/${p.id}`} className="btn btnGhost">
                  Manage
                </Link>
              </div>

              {/* Inline image uploader */}
              <ProductImageUploader
                productId={p.id}
                value={p.main_image || ""}
                onChange={() => {}}
                onUploaded={loadProducts}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
