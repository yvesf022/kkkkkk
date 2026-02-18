"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { productsApi, adminApi } from "@/lib/api";

export default function AdminProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStock, setNewStock] = useState("");

  async function load() {
    try {
      const p = await productsApi.get(id);
      const a = await productsApi.getAnalytics(id);
      const v = await productsApi.listVariants(id);

      setProduct(p);
      setAnalytics(a);
      setVariants(v || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function updateStatus(status: string) {
    await adminApi.updateProductStatus(id, status as any);
    load();
  }

  async function handleSoftDelete() {
    if (!confirm("Soft delete product?")) return;
    await productsApi.softDelete(id);
    load();
  }

  async function handleDuplicate() {
    const result = await productsApi.duplicate(id);
    alert("Duplicated: " + result.id);
  }

  async function updateInventory() {
    if (!newStock) return;
    await productsApi.updateInventory(id, {
      stock: Number(newStock),
      note: "Manual update from admin panel",
    });
    setNewStock("");
    load();
  }

  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 30 }}>

      <h1>{product.title}</h1>

      {/* PRODUCT INFO */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <p><strong>Status:</strong> {product.status}</p>
        <p><strong>Price:</strong> {product.price}</p>
        <p><strong>Stock:</strong> {product.stock}</p>
        <p><strong>Category:</strong> {product.category}</p>
        <p><strong>Store:</strong> {product.store}</p>
      </div>

      {/* STATUS ACTIONS */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Status Controls</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => updateStatus("active")}>Publish</button>
          <button onClick={() => updateStatus("draft")}>Draft</button>
          <button onClick={() => updateStatus("archived")}>Archive</button>
          <button onClick={handleSoftDelete} style={{ color: "red" }}>
            Soft Delete
          </button>
          <button onClick={handleDuplicate}>
            Duplicate
          </button>
        </div>
      </div>

      {/* INVENTORY */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Inventory</h3>
        <input
          type="number"
          placeholder="New stock value"
          value={newStock}
          onChange={(e) => setNewStock(e.target.value)}
        />
        <button onClick={updateInventory}>Update Stock</button>
      </div>

      {/* VARIANTS */}
      <div style={{ border: "1px solid #ddd", padding: 20 }}>
        <h3>Variants</h3>
        {variants.length === 0 && <div>No variants</div>}
        {variants.map((v) => (
          <div key={v.id} style={{ marginBottom: 10 }}>
            {v.title} — {v.stock} in stock
          </div>
        ))}
      </div>

      {/* ANALYTICS */}
      {analytics && (
        <div style={{ border: "1px solid #ddd", padding: 20 }}>
          <h3>Analytics</h3>
          <p><strong>Sales:</strong> {analytics.sales}</p>
          <p><strong>Revenue:</strong> {analytics.revenue_estimate}</p>
          <p><strong>Rating:</strong> {analytics.rating}</p>
          <p><strong>Reviews:</strong> {analytics.rating_number}</p>
        </div>
      )}

    </div>
  );
}
